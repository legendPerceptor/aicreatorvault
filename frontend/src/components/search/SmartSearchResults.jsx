import React from 'react';
import './SmartSearchResults.css';

function SmartSearchResults({ result }) {
  if (!result) return null;

  const { data, response, mode } = result;
  const entities = data?.data?.entities || [];
  const relationships = data?.data?.relationships || [];
  const chunks = data?.data?.chunks || [];
  const llmResponse = response || data?.llm_response;

  return (
    <div className="smart-search-results">
      {llmResponse && (
        <div className="smart-answer-card">
          <h3>Answer</h3>
          <div className="smart-answer-text">{llmResponse}</div>
        </div>
      )}

      {entities.length > 0 && (
        <div className="smart-entities-card">
          <h3>Entities ({entities.length})</h3>
          <div className="smart-entity-tags">
            {entities.map((entity, i) => (
              <span key={i} className="smart-entity-tag" title={entity.description}>
                <span className="entity-type">{entity.entity_type}</span>
                <span className="entity-name">{entity.entity_name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {relationships.length > 0 && (
        <div className="smart-relationships-card">
          <h3>Relationships ({relationships.length})</h3>
          <div className="smart-relationship-list">
            {relationships.map((rel, i) => (
              <div key={i} className="smart-relationship-item">
                <span className="rel-node">{rel.src_id}</span>
                <span className="rel-arrow">--&gt;</span>
                <span className="rel-desc">{rel.description}</span>
                <span className="rel-arrow">--&gt;</span>
                <span className="rel-node">{rel.tgt_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {chunks.length > 0 && (
        <div className="smart-chunks-card">
          <h3>Source References ({chunks.length})</h3>
          <div className="smart-chunk-list">
            {chunks.map((chunk, i) => {
              const assetId = chunk.file_path?.replace('asset://', '');
              return (
                <div key={i} className="smart-chunk-item">
                  <div className="chunk-content">{chunk.content}</div>
                  {assetId && (
                    <a href={`/assets/${assetId}`} className="chunk-link">
                      View Asset #{assetId}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartSearchResults;
