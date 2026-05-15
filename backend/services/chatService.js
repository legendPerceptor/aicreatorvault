const { ChatMessage } = require('../models');
const { Op } = require('sequelize');
const { getProvider } = require('./llmProviders');

const MAX_CONTEXT_CHARS = 12000;
const HISTORY_LIMIT = 50;

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

class ChatService {
  buildContext(nodesData) {
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

    const full = parts.join('\n');
    return full.length > MAX_CONTEXT_CHARS
      ? full.slice(0, MAX_CONTEXT_CHARS) + '\n...(truncated)'
      : full;
  }

  buildSystemPrompt(context) {
    return SYSTEM_PROMPT_TEMPLATE.replace('{context}', context || '(empty canvas)');
  }

  async getHistory(userId, resourceId = 'default', limit = HISTORY_LIMIT) {
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

    // Persist user message
    await ChatMessage.create({
      user_id: userId,
      resource_id: resourceId,
      role: 'user',
      content: userMessage,
    });

    // Build context and system prompt
    const context = this.buildContext(nodesData);
    const systemPrompt = this.buildSystemPrompt(context);

    // Load history
    const history = await this.getHistory(userId, resourceId);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

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
