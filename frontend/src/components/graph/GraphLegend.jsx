import React from 'react';
import { assetTypeConfig, relationshipTypeConfig } from '../../utils/graphConfig';
import './GraphLegend.css';

function GraphLegend() {
  return (
    <div className="graph-legend">
      <div className="legend-section">
        <h4>Asset Types</h4>
        <div className="legend-items">
          {Object.entries(assetTypeConfig).map(([type, config]) => (
            <div key={type} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}
              >
                {config.icon}
              </span>
              <span className="legend-label">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="legend-section">
        <h4>Relationship Types</h4>
        <div className="legend-items">
          {Object.entries(relationshipTypeConfig).map(([type, config]) => (
            <div key={type} className="legend-item">
              <span
                className="legend-line"
                style={{
                  backgroundColor: config.color,
                  borderStyle: config.style,
                }}
              />
              <span className="legend-label">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="legend-section">
        <h4>Actions</h4>
        <div className="legend-actions">
          <div className="legend-action">Click to select</div>
          <div className="legend-action">Double-click to expand</div>
          <div className="legend-action">Drag to move</div>
          <div className="legend-action">Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
}

export default GraphLegend;
