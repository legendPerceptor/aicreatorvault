import React, { useState, useEffect } from 'react';
import { getAssetTypeConfig, getRelationshipTypeConfig } from '../utils/graphConfig';
import './AssetInspector.css';

const API_BASE = 'http://localhost:3001/api';

function AssetInspector({ assetId, onClose, onUpdate }) {
  const [asset, setAsset] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails();
    }
  }, [assetId]);

  const fetchAssetDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/assets/${assetId}?relationships=true`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAsset(data.node);
      setRelationships(data.relationships || []);
      setEditData({
        score: data.node.data?.score,
        description: data.node.data?.description,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`${API_BASE}/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updated = await response.json();
      setAsset(updated);
      setEditing(false);

      if (onUpdate) {
        onUpdate(updated);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRelationship = async (relationshipId) => {
    if (!confirm('Are you sure you want to delete this relationship?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/relationships/${relationshipId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setRelationships((prev) => prev.filter((r) => r.id !== relationshipId));
    } catch (err) {
      setError(err.message);
    }
  };

  const typeConfig = asset ? getAssetTypeConfig(asset.type) : null;

  if (loading) {
    return (
      <div className="asset-inspector">
        <div className="inspector-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="asset-inspector">
        <div className="inspector-error">Error: {error}</div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="asset-inspector">
        <div className="inspector-empty">No asset selected</div>
      </div>
    );
  }

  return (
    <div className="asset-inspector">
      <div className="inspector-header">
        <div className="inspector-title">
          <span className="asset-icon">{typeConfig.icon}</span>
          <span className="asset-type">{typeConfig.label}</span>
          <span className="asset-id">#{asset.id}</span>
        </div>
        <button onClick={onClose} className="inspector-close">
          ×
        </button>
      </div>

      <div className="inspector-content">
        <div className="inspector-section">
          <h3>Basic Information</h3>
          {editing ? (
            <div className="edit-form">
              <div className="form-group">
                <label>Score</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={editData.score ?? ''}
                  onChange={(e) =>
                    setEditData({ ...editData, score: parseInt(e.target.value) || null })
                  }
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editData.description ?? ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button onClick={handleSave} className="save-button">
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Label</span>
                <span className="info-value">{asset.label}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Score</span>
                <span className="info-value">
                  {asset.data?.score !== null ? `★ ${asset.data?.score}` : 'N/A'}
                </span>
              </div>
              {asset.data?.description && (
                <div className="info-item full-width">
                  <span className="info-label">Description</span>
                  <span className="info-value">{asset.data.description}</span>
                </div>
              )}
              {asset.data?.path && (
                <div className="info-item full-width">
                  <span className="info-label">Path</span>
                  <span className="info-value">{asset.data.path}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Created</span>
                <span className="info-value">
                  {new Date(asset.data?.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {relationships.length > 0 && (
          <div className="inspector-section">
            <h3>Relationships ({relationships.length})</h3>
            <div className="relationships-list">
              {relationships.map((rel) => {
                const relConfig = getRelationshipTypeConfig(rel.type);
                return (
                  <div key={rel.id} className="relationship-item">
                    <span className={`relationship-icon ${rel.type}`}>{relConfig.label}</span>
                    <span className="relationship-details">
                      {rel.source} → {rel.target}
                    </span>
                    <button
                      onClick={() => handleDeleteRelationship(rel.id)}
                      className="delete-relationship-button"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="inspector-section">
          <h3>Actions</h3>
          <div className="action-buttons">
            <button onClick={() => setEditing(!editing)} className="action-button">
              {editing ? 'Cancel Edit' : 'Edit Asset'}
            </button>
            {asset.type === 'image' && (
              <button className="action-button">Create Derived Version</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetInspector;
