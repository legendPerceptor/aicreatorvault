import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getEntityTypeConfig, entityTypeConfig } from '../../utils/graphConfig';
import './GraphNode.css';

const GraphNode = memo(({ data = {}, selected }) => {
  const entityType = data.entityType || data.type || 'unknown';
  const entity = data.entity || {};

  let config = getEntityTypeConfig(entityType);
  if (entityType === 'resource' && entity.resource_type) {
    const subConfig = entityTypeConfig.resource?.subTypes?.[entity.resource_type];
    if (subConfig) config = subConfig;
  }

  const hasThumbnail =
    entityType === 'resource' &&
    (entity.resource_type === 'youtube' || entity.resource_type === 'web_link') &&
    entity.thumbnail;

  return (
    <div
      className={`custom-node node-${entityType} ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: config.bgColor,
        border: `2px solid ${selected ? config.color : config.borderColor}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="handle handle-target" />

      <div className="node-content">
        {entityType === 'image' && data.imageUrl ? (
          <img src={data.imageUrl} className="node-thumbnail" alt="" />
        ) : hasThumbnail ? (
          <img src={entity.thumbnail} className="node-thumbnail" alt="" />
        ) : (
          <div className="node-icon">{config.icon}</div>
        )}
        <div className="node-info">
          <div className="node-type">{config.label}</div>
          <div className="node-label" title={data.label}>
            {data.label}
          </div>
          {entity.score != null && (
            <div className="node-score">
              {'★'} {entity.score}
            </div>
          )}
          {entityType === 'resource' && entity.metadata?.duration && (
            <div className="node-meta">{entity.metadata.duration}</div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="handle handle-source" />
    </div>
  );
});

GraphNode.displayName = 'GraphNode';

export default GraphNode;
