import React, { useState, useCallback } from 'react';
import GraphVisualization from '../components/graph/GraphVisualization';
import GraphControls from '../components/graph/GraphControls';
import GraphLegend from '../components/graph/GraphLegend';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { useGraph, useGraphTraversal, useGraphRebuild } from '../hooks/useGraph';
import { filterOptions, getEntityTypeConfig } from '../utils/graphConfig';
import { useTranslation } from '../i18n/useTranslation';
import './KnowledgeGraphPage.css';

function KnowledgeGraphPage() {
  const { t } = useTranslation();
  const [entityTypes, setEntityTypes] = useState(filterOptions.entityTypes.map((opt) => opt.value));
  const [relationshipTypes, setRelationshipTypes] = useState(
    filterOptions.relationshipTypes.map((opt) => opt.value)
  );
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [layout, setLayout] = useState('dagre');
  const [showControls, setShowControls] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  const { nodes, edges, loading, error, refetch } = useGraph({
    entityTypes,
    relationshipTypes,
    limit: 1000,
  });

  const { traverse, findPath } = useGraphTraversal();
  const { rebuild: rebuildGraph, loading: rebuildLoading } = useGraphRebuild();

  const handleNodeClick = useCallback((nodeData) => {
    setSelectedNode(nodeData);
    setHighlightedPath([]);
  }, []);

  const handleNodeDoubleClick = useCallback(
    async (nodeData) => {
      const result = await traverse(nodeData.id, 1, relationshipTypes);
      if (result) {
        console.log('Expanded neighbors:', result);
      }
    },
    [traverse, relationshipTypes]
  );

  const handleImagePreview = useCallback(() => {
    if (!selectedNode || selectedNode.entityType !== 'image') return;
    setPreviewImage(selectedNode.entity);
  }, [selectedNode]);

  const handleFilterChange = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleReset = useCallback(() => {
    setSelectedNode(null);
    setHighlightedPath([]);
    refetch();
  }, [refetch]);

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
  }, []);

  const handleRebuild = useCallback(async () => {
    const result = await rebuildGraph();
    if (result) {
      refetch();
    }
  }, [rebuildGraph, refetch]);

  const handleFindPath = useCallback(async () => {
    if (!selectedNode) return;
    if (nodes.length > 0) {
      const targetId = nodes[0].data.id;
      const result = await findPath(selectedNode.id, targetId);
      if (result && result.path) {
        const pathEdges = [];
        for (let i = 0; i < result.path.length - 1; i++) {
          pathEdges.push({
            source: String(result.path[i]),
            target: String(result.path[i + 1]),
          });
        }
        setHighlightedPath(pathEdges);
      }
    }
  }, [selectedNode, nodes, findPath]);

  const selectedNodeConfig = selectedNode
    ? getEntityTypeConfig(selectedNode.entityType || selectedNode.type)
    : null;

  return (
    <div className="knowledge-graph-page">
      <div className="graph-header">
        <h2>{t('nav.knowledgeGraph')}</h2>
        <p>Visualize relationships between your creative assets</p>
        <div className="graph-stats">
          <span className="stat">
            <strong>{nodes.length}</strong> Nodes
          </span>
          <span className="stat">
            <strong>{edges.length}</strong> Edges
          </span>
        </div>
        <div className="graph-actions">
          <button onClick={() => setShowControls(!showControls)} className="action-button">
            {showControls ? 'Hide' : 'Show'} Controls
          </button>
          <button onClick={() => setShowLegend(!showLegend)} className="action-button">
            {showLegend ? 'Hide' : 'Show'} Legend
          </button>
          {selectedNode && (
            <button onClick={handleFindPath} className="action-button primary">
              Find Path
            </button>
          )}
          <button onClick={handleRebuild} className="action-button" disabled={rebuildLoading}>
            {rebuildLoading ? 'Rebuilding...' : 'Rebuild Graph'}
          </button>
          <button onClick={handleReset} className="action-button">
            Reset View
          </button>
        </div>
      </div>

      <div className="graph-content">
        {showControls && (
          <div className="graph-sidebar">
            <GraphControls
              entityTypes={entityTypes}
              relationshipTypes={relationshipTypes}
              onEntityTypeChange={setEntityTypes}
              onRelationshipTypeChange={setRelationshipTypes}
              onReset={handleReset}
              onLayoutChange={handleLayoutChange}
              layout={layout}
            />
          </div>
        )}

        <div className="graph-main">
          {loading ? (
            <div className="graph-loading">
              <div className="spinner"></div>
              <p>Loading graph data...</p>
            </div>
          ) : error ? (
            <div className="graph-error">
              <p>Error loading graph: {error}</p>
              <button onClick={refetch} className="retry-button">
                Retry
              </button>
            </div>
          ) : nodes.length === 0 ? (
            <div className="graph-empty">
              <p>No data to display. Try adjusting your filters or create some assets.</p>
            </div>
          ) : (
            <GraphVisualization
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              selectedNode={selectedNode}
              highlightedPath={highlightedPath}
            />
          )}
        </div>

        {showLegend && (
          <div className="graph-legend-container">
            <GraphLegend />
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="node-details-panel">
          <div className="panel-header">
            <h3>Node Details</h3>
            <button onClick={() => setSelectedNode(null)} className="close-button">
              {'×'}
            </button>
          </div>
          <div className="panel-content">
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">
                {selectedNodeConfig?.label || selectedNode.entityType}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Label:</span>
              <span className="detail-value">{selectedNode.label}</span>
            </div>

            {selectedNode.entityType === 'image' && selectedNode.imageUrl && (
              <div className="detail-row">
                <div className="detail-image-preview">
                  <img
                    src={selectedNode.imageUrl}
                    alt={selectedNode.label}
                    className="detail-thumbnail"
                    onClick={handleImagePreview}
                    style={{ cursor: 'pointer' }}
                  />
                  <button onClick={handleImagePreview} className="preview-button">
                    View Full Image
                  </button>
                </div>
              </div>
            )}

            {selectedNode.entity?.score != null && (
              <div className="detail-row">
                <span className="detail-label">Score:</span>
                <span className="detail-value">
                  {'★'} {selectedNode.entity.score}
                </span>
              </div>
            )}

            {selectedNode.entity?.description && (
              <div className="detail-row detail-description">
                <span className="detail-label">AI Description:</span>
                <span className="detail-value">{selectedNode.entity.description}</span>
              </div>
            )}

            {selectedNode.entityType === 'theme' && selectedNode.entity?.name && (
              <div className="detail-row">
                <span className="detail-label">Theme:</span>
                <span className="detail-value">{selectedNode.entity.name}</span>
              </div>
            )}

            {selectedNode.entityType === 'prompt' && selectedNode.entity?.content && (
              <div className="detail-row detail-description">
                <span className="detail-label">Prompt:</span>
                <span className="detail-value">{selectedNode.entity.content}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {previewImage && (
        <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  );
}

export default KnowledgeGraphPage;
