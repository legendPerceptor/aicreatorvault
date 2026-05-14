import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './GraphNode.css';

const AiAssistantNode = memo(({ data = {}, selected }) => {
  const entity = data.entity || {};
  const metadata = entity.metadata || {};
  const { providers = [], onModelChange } = data;
  const selectedProvider = metadata.provider || 'minimax';
  const selectedModel = metadata.model || 'MiniMax-M2.7';

  const handleSelectChange = (e) => {
    e.stopPropagation();
    const [provId, modelId] = e.target.value.split(':');
    onModelChange?.(entity.id, provId, modelId);
  };

  const currentValue = `${selectedProvider}:${selectedModel}`;

  return (
    <div
      className={`custom-node node-ai-assistant ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: '#fdf4ff',
        border: `3px solid ${selected ? '#7c3aed' : '#c084fc'}`,
        minWidth: 220,
        padding: '16px 20px',
      }}
    >
      <Handle type="target" position={Position.Top} className="handle handle-target" />

      <div className="node-content">
        <div className="node-icon" style={{ fontSize: 32 }}>
          {'\u{1F916}'}
        </div>
        <div className="node-info">
          <div className="node-type" style={{ color: '#7c3aed', fontSize: 13 }}>
            AI Assistant
          </div>
          <div className="node-label" style={{ fontSize: 14, fontWeight: 600 }}>
            {data.label || entity.title || 'AI Assistant'}
          </div>
          {providers.length > 0 && (
            <select
              className="model-selector"
              value={currentValue}
              onChange={handleSelectChange}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
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
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="handle handle-source" />
    </div>
  );
});

AiAssistantNode.displayName = 'AiAssistantNode';

export default AiAssistantNode;
