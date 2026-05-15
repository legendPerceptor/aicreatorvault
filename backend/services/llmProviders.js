const PROVIDERS = {
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    url: process.env.MINIMAX_CHAT_URL || 'https://api.minimaxi.com/v1/chat/completions',
    apiKey: process.env.MINIMAX_API_KEY || process.env.IMAGE_GEN_API_KEY || '',
    defaultModel: process.env.MINIMAX_CHAT_MODEL || 'MiniMax-M2.7',
    useProxy: true,
    models: [
      { id: 'MiniMax-M2.7', name: 'MiniMax-M2.7' },
      { id: 'MiniMax-Text-01', name: 'MiniMax-Text-01' },
    ],
    buildHeaders(apiKey) {
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    },
    buildBody(model, messages, stream) {
      return { model, messages, stream };
    },
    parseSSE(parsed, _eventType) {
      return parsed.choices?.[0]?.delta?.content || null;
    },
  },

  openai: {
    id: 'openai',
    name: 'OpenAI',
    url: process.env.OPENAI_CHAT_URL || 'https://api.openai.com/v1/chat/completions',
    apiKey: process.env.OPENAI_API_KEY || '',
    defaultModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
    useProxy: true,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    ],
    buildHeaders(apiKey) {
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    },
    buildBody(model, messages, stream) {
      return { model, messages, stream };
    },
    parseSSE(parsed, _eventType) {
      return parsed.choices?.[0]?.delta?.content || null;
    },
  },

  anthropic: {
    id: 'anthropic',
    name: 'Claude',
    url: process.env.ANTHROPIC_CHAT_URL || 'https://api.anthropic.com/v1/messages',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: process.env.ANTHROPIC_CHAT_MODEL || 'claude-sonnet-4-20250514',
    useProxy: true,
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ],
    buildHeaders(apiKey) {
      return {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      };
    },
    buildBody(model, messages, stream) {
      const systemMsg = messages.find((m) => m.role === 'system');
      const chatMsgs = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));
      return {
        model,
        max_tokens: 4096,
        stream,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: chatMsgs,
      };
    },
    parseSSE(parsed, eventType) {
      if (eventType === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
        return parsed.delta.text;
      }
      return null;
    },
  },

  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    url: process.env.OLLAMA_CHAT_URL || 'http://host.docker.internal:11434/v1/chat/completions',
    apiKey: '',
    defaultModel: process.env.OLLAMA_CHAT_MODEL || 'llama3',
    useProxy: false,
    models: [
      { id: 'llama3', name: 'Llama 3' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
      { id: 'gemma3', name: 'Gemma 3' },
      { id: 'deepseek-r1', name: 'DeepSeek R1' },
    ],
    buildHeaders() {
      return { 'Content-Type': 'application/json' };
    },
    buildBody(model, messages, stream) {
      return { model, messages, stream };
    },
    parseSSE(parsed, _eventType) {
      return parsed.choices?.[0]?.delta?.content || null;
    },
  },
};

function getProvider(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unknown LLM provider: ${providerId}`);
  return provider;
}

function getAvailableProviders() {
  return Object.values(PROVIDERS)
    .filter((p) => {
      if (p.id === 'ollama') {
        return (process.env.OLLAMA_ENABLED || '').toLowerCase() === 'true';
      }
      return !!p.apiKey;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      defaultModel: p.defaultModel,
      models: p.models,
    }));
}

module.exports = { PROVIDERS, getProvider, getAvailableProviders };
