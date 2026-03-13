import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getAssetTypeConfig } from '../../utils/graphConfig';
import './GraphNode.css';

const GraphNode = memo(({ data, selected }) => {
  const config = getAssetTypeConfig(data.type);

  const handleClick = () => {
    if (data.onNodeClick) {
      data.onNodeClick(data);
    }
  };

  const handleDoubleClick = () => {
    if (data.onNodeDoubleClick) {
      data.onNodeDoubleClick(data);
    }
  };

  return (
    <div
      className={`custom-node ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: config.bgColor,
        border: `2px solid ${selected ? config.color : config.borderColor}`,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} className="handle handle-target" />

      <div className="node-content">
        <div className="node-icon">{config.icon}</div>
        <div className="node-info">
          <div className="node-type">{config.label}</div>
          <div className="node-label" title={data.label}>
            {data.label}
          </div>
          {data.data?.score !== undefined && data.data?.score !== null && (
            <div className="node-score">★ {data.data.score}</div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="handle handle-source" />
    </div>
  );
});

export default GraphNode;
