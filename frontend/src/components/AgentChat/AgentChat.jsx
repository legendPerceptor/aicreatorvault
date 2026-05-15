import React, { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch } from '../../utils/authFetch';
import './AgentChat.css';

const API_BASE = '/api/chat';

function AgentChat({
  nodes,
  resourceId = 'default',
  isOpen,
  onClose,
  provider = 'minimax',
  model,
  providers = [],
  onModelChange,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      authFetch(`${API_BASE}/history?resourceId=${resourceId}`)
        .then((r) => r.json())
        .then((data) => setMessages(Array.isArray(data) ? data : []))
        .catch(() => setMessages([]));
    }
  }, [isOpen, resourceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setInputText('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, created_at: new Date().toISOString() },
    ]);
    setIsStreaming(true);
    setStreamingContent('');

    const contextNodes = nodes.map((n) => ({
      entityType: n.data?.entityType,
      entity: n.data?.entity,
    }));

    try {
      const res = await authFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId,
          message: text,
          nodes: contextNodes,
          provider,
          model,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              full += `\n\n[Error: ${parsed.error}]`;
              setStreamingContent(full);
            } else if (parsed.content) {
              full += parsed.content;
              setStreamingContent(full);
            }
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: full, created_at: new Date().toISOString() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `[Error: ${err.message}]`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [inputText, isStreaming, nodes, resourceId, provider, model]);

  const handleClear = useCallback(async () => {
    if (!window.confirm('Clear all chat history?')) return;
    await authFetch(`${API_BASE}/history?resourceId=${resourceId}`, { method: 'DELETE' });
    setMessages([]);
  }, [resourceId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="agent-chat-panel">
      <div className="chat-header">
        <span className="chat-title">AI Assistant</span>
        <div className="chat-header-actions">
          {providers.length > 0 && (
            <select
              className="chat-provider-select"
              value={`${provider}:${model}`}
              onChange={(e) => {
                const [p, m] = e.target.value.split(':');
                onModelChange?.(resourceId, p, m);
              }}
            >
              {providers.map((p) =>
                p.models.map((m) => (
                  <option key={`${p.id}:${m.id}`} value={`${p.id}:${m.id}`}>
                    {p.name} - {m.name}
                  </option>
                ))
              )}
            </select>
          )}
          <button className="chat-header-btn" onClick={handleClear} title="Clear history">
            Clear
          </button>
          <button className="chat-header-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !streamingContent && (
          <div className="chat-empty">Ask me anything about your canvas assets.</div>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-content">{msg.content}</div>
          </div>
        ))}
        {streamingContent && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-content">
              {streamingContent}
              <span className="chat-cursor">|</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your canvas..."
          rows={1}
          disabled={isStreaming}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!inputText.trim() || isStreaming}
        >
          {isStreaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default AgentChat;
