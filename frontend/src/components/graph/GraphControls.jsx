import React from 'react';
import { filterOptions } from '../../utils/graphConfig';
import './GraphControls.css';

function GraphControls({
  assetTypes,
  relationshipTypes,
  onAssetTypeChange,
  onRelationshipTypeChange,
  onReset,
  onLayoutChange,
  layout,
}) {
  const handleAssetTypeToggle = (type) => {
    const newTypes = assetTypes.includes(type)
      ? assetTypes.filter((t) => t !== type)
      : [...assetTypes, type];
    onAssetTypeChange(newTypes);
  };

  const handleRelationshipTypeToggle = (type) => {
    const newTypes = relationshipTypes.includes(type)
      ? relationshipTypes.filter((t) => t !== type)
      : [...relationshipTypes, type];
    onRelationshipTypeChange(newTypes);
  };

  const handleResetFilters = () => {
    onAssetTypeChange(filterOptions.assetTypes.map((opt) => opt.value));
    onRelationshipTypeChange(filterOptions.relationshipTypes.map((opt) => opt.value));
    if (onReset) onReset();
  };

  return (
    <div className="graph-controls">
      <div className="control-section">
        <h3>Asset Types</h3>
        <div className="filter-options">
          {filterOptions.assetTypes.map((option) => (
            <label key={option.value} className="filter-option">
              <input
                type="checkbox"
                checked={assetTypes.includes(option.value)}
                onChange={() => handleAssetTypeToggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="control-section">
        <h3>Relationship Types</h3>
        <div className="filter-options">
          {filterOptions.relationshipTypes.map((option) => (
            <label key={option.value} className="filter-option">
              <input
                type="checkbox"
                checked={relationshipTypes.includes(option.value)}
                onChange={() => handleRelationshipTypeToggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="control-section">
        <h3>Layout</h3>
        <select
          value={layout}
          onChange={(e) => onLayoutChange(e.target.value)}
          className="layout-select"
        >
          <option value="dagre">Hierarchical</option>
          <option value="force">Force Directed</option>
          <option value="circular">Circular</option>
          <option value="grid">Grid</option>
        </select>
      </div>

      <div className="control-section">
        <button onClick={handleResetFilters} className="reset-button">
          Reset Filters
        </button>
      </div>
    </div>
  );
}

export default GraphControls;
