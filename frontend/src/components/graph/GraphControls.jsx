import React from 'react';
import { filterOptions } from '../../utils/graphConfig';
import './GraphControls.css';

function GraphControls({
  entityTypes,
  relationshipTypes,
  onEntityTypeChange,
  onRelationshipTypeChange,
  onReset,
  onLayoutChange,
  layout,
  // Backward compat aliases
  assetTypes,
  onAssetTypeChange,
}) {
  const types = entityTypes || assetTypes || [];
  const handleTypeChange = onEntityTypeChange || onAssetTypeChange;

  const handleEntityTypeToggle = (type) => {
    const newTypes = types.includes(type) ? types.filter((t) => t !== type) : [...types, type];
    handleTypeChange(newTypes);
  };

  const handleRelationshipTypeToggle = (type) => {
    const newTypes = relationshipTypes.includes(type)
      ? relationshipTypes.filter((t) => t !== type)
      : [...relationshipTypes, type];
    onRelationshipTypeChange(newTypes);
  };

  const handleResetFilters = () => {
    handleTypeChange(filterOptions.entityTypes.map((opt) => opt.value));
    onRelationshipTypeChange(filterOptions.relationshipTypes.map((opt) => opt.value));
    if (onReset) onReset();
  };

  return (
    <div className="graph-controls">
      <div className="control-section">
        <h3>Entity Types</h3>
        <div className="filter-options">
          {filterOptions.entityTypes.map((option) => (
            <label key={option.value} className="filter-option">
              <input
                type="checkbox"
                checked={types.includes(option.value)}
                onChange={() => handleEntityTypeToggle(option.value)}
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
