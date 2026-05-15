const { ChatMessage } = require('../models');
const { Op } = require('sequelize');
const { getProvider, getModelInfo } = require('./llmProviders');

const OUTPUT_TOKENS = 4096;
const SAFETY_BUFFER = 512;

const SYSTEM_PROMPT_TEMPLATE = `You are a creative assistant for the AI Creator Vault. The user has a knowledge graph canvas with the following assets. Answer questions about these assets, suggest connections, help organize ideas, and provide creative insights. Respond in the same language the user writes in.

--- CANVAS ASSETS ---
{context}
--- END CANVAS ASSETS ---`;

const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.https_proxy ||
  process.env.http_proxy;

let undiciProxy = null;
if (proxyUrl) {
  try {
    const { ProxyAgent } = require('undici');
    undiciProxy = new ProxyAgent(proxyUrl);
  } catch (_e) {
    console.log('[WARNING] undiciProxy not available.');
  }
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3);
}

class ChatService {
  buildContext(nodesData, maxTokens = 4000) {
    const parts = [];
    for (const node of nodesData) {
      const { entityType, entity } = node;
      if (!entity) continue;

      switch (entityType) {
        case 'image':
          if (entity.filename || entity.description) {
            parts.push(`[Image: ${entity.filename || 'Untitled'}]`);
            if (entity.description) parts.push(`  Description: ${entity.description}`);
          }
          break;
        case 'prompt':
          if (entity.content) {
            parts.push(`[Prompt] ${entity.content}`);
          }
          break;
        case 'theme':
          if (entity.name) {
            parts.push(`[Theme: ${entity.name}]`);
            if (entity.description) parts.push(`  ${entity.description}`);
          }
          break;
        case 'resource': {
          const typeLabel = entity.resource_type || 'file';
          const title = entity.title || 'Untitled';
          parts.push(`[${typeLabel}: ${title}]`);
          if (entity.url) parts.push(`  URL: ${entity.url}`);
          if (entity.content) parts.push(`  Content: ${entity.content.slice(0, 2000)}`);
          break;
        }
      }
    }

    let full = parts.join('\n');
    const charLimit = maxTokens * 3;
    if (full.length > charLimit) {
      full = full.slice(0, charLimit) + '\n...(truncated)';
    }
    return full;
  }

  buildSystemPrompt(context) {
    return SYSTEM_PROMPT_TEMPLATE.replace('{context}', context || '(empty canvas)');
  }

  // Build messages array within token budget
  buildMessageStack(systemPrompt, history, contextWindow) {
    const budget = contextWindow - OUTPUT_TOKENS - SAFETY_BUFFER;
    let usedTokens = estimateTokens(systemPrompt);
    const messages = [{ role: 'system', content: systemPrompt }];

    // Walk history from newest to oldest
    const included = [];
    let historyTokens = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(history[i].content);
      if (usedTokens + historyTokens + msgTokens > budget) break;
      historyTokens += msgTokens;
      included.unshift(history[i]);
    }

    const omitted = history.length - included.length;
    if (omitted > 0) {
      messages.push({
        role: 'user',
        content: `[System: ${omitted} earlier message${omitted > 1 ? 's' : ''} omitted to fit context window]`,
      });
    }

    for (const msg of included) {
      messages.push({ role: msg.role, content: msg.content });
    }

    return messages;
  }

  async getHistory(userId, resourceId = 'default', limit = 200) {
    return ChatMessage.findAll({
      where: { user_id: userId, resource_id: resourceId, role: { [Op.ne]: 'system' } },
      order: [['created_at', 'ASC']],
      limit,
    });
  }

  async clearHistory(userId, resourceId = 'default') {
    return ChatMessage.destroy({ where: { user_id: userId, resource_id: resourceId } });
  }

  async *streamChat(
    userId,
    resourceId,
    userMessage,
    nodesData,
    providerId = 'minimax',
    modelId = null
  ) {
    const provider = getProvider(providerId);
    const model = modelId || provider.defaultModel;
    const { contextWindow } = getModelInfo(providerId, model);

    // Persist user message
    await ChatMessage.create({
      user_id: userId,
      resource_id: resourceId,
      role: 'user',
      content: userMessage,
    });

    // Build context and system prompt (reserve 1/3 of window for context)
    const contextBudget = Math.floor(contextWindow * 0.25);
    const context = this.buildContext(nodesData, contextBudget);
    const systemPrompt = this.buildSystemPrompt(context);

    // Load history and build budget-aware message stack
    const history = await this.getHistory(userId, resourceId);
    const messages = this.buildMessageStack(systemPrompt, history, contextWindow);

    console.log(
      `[Chat] ${provider.name}/${model} context=${contextWindow}t messages=${messages.length}/${history.length} estimated=${estimateTokens(messages.map((m) => m.content).join(''))}t`
    );

    // Build provider-specific request
    const { fetch: undiciFetch } = require('undici');
    const fetchFn =
      provider.useProxy && undiciProxy
        ? (url, opts) => undiciFetch(url, { ...opts, dispatcher: undiciProxy })
        : undiciFetch;

    let fullResponse = '';
    try {
      const resp = await fetchFn(provider.url, {
        method: 'POST',
        headers: provider.buildHeaders(provider.apiKey),
        body: JSON.stringify(provider.buildBody(model, messages, true)),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`${provider.name} API ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim();
            continue;
          }
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = provider.parseSSE(parsed, currentEvent);
            if (delta) {
              fullResponse += delta;
              yield delta;
            }
            currentEvent = '';
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (error) {
      console.error('[ChatService] Stream error:', error.message);
      yield `\n\n[Error: ${error.message}]`;
      fullResponse += `\n\n[Error: ${error.message}]`;
    }

    // Persist assistant response
    if (fullResponse) {
      await ChatMessage.create({
        user_id: userId,
        resource_id: resourceId,
        role: 'assistant',
        content: fullResponse,
      });
    }
  }
}

module.exports = new ChatService();
