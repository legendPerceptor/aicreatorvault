import React, { useState, useCallback } from 'react';
import GraphVisualization from '../components/graph/GraphVisualization';
import GraphControls from '../components/graph/GraphControls';
import GraphLegend from '../components/graph/GraphLegend';
import { useGraph, useGraphTraversal } from '../hooks/useGraph';
import { filterOptions } from '../utils/graphConfig';
import './KnowledgeGraphPage.css';

function KnowledgeGraphPage() {
  const [assetTypes, setAssetTypes] = useState(filterOptions.assetTypes.map((opt) => opt.value));
  const [relationshipTypes, setRelationshipTypes] = useState(
    filterOptions.relationshipTypes.map((opt) => opt.value)
  );
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [layout, setLayout] = useState('dagre');
  const [showControls, setShowControls] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  const { nodes, edges, loading, error, refetch } = useGraph({
    assetTypes,
    relationshipTypes,
    limit: 1000,
  });

  const { traverse, findPath, getNeighbors } = useGraphTraversal();

  const handleNodeClick = useCallback((nodeData) => {
    setSelectedNode(nodeData);
    setHighlightedPath([]);
  }, []);

  const handleNodeDoubleClick = useCallback(
    async (nodeData) => {
      // Expand neighbors on double-click
      const result = await traverse(nodeData.id, 1, relationshipTypes);
      if (result) {
        // The graph will auto-update through the useGraph hook
        console.log('Expanded neighbors:', result);
      }
    },
    [traverse, relationshipTypes]
  );

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

  const handleFindPath = useCallback(async () => {
    if (!selectedNode) return;

    // For demo, find path from selected node to the first node
    if (nodes.length > 0) {
      const targetId = nodes[0].data.id;
      const result = await findPath(selectedNode.id, targetId);
      if (result && result.path) {
        // Convert path to edges for highlighting
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

  return (
    <div className="knowledge-graph-page">
      <div className="graph-header">
        <h2>知识图谱</h2>
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
          <button onClick={handleReset} className="action-button">
            Reset View
          </button>
        </div>
      </div>

      <div className="graph-content">
        {showControls && (
          <div className="graph-sidebar">
            <GraphControls
              assetTypes={assetTypes}
              relationshipTypes={relationshipTypes}
              onAssetTypeChange={setAssetTypes}
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
              ×
            </button>
          </div>
          <div className="panel-content">
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{selectedNode.type}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Label:</span>
              <span className="detail-value">{selectedNode.label}</span>
            </div>
            {selectedNode.data?.score !== undefined && (
              <div className="detail-row">
                <span className="detail-label">Score:</span>
                <span className="detail-value">★ {selectedNode.data.score}</span>
              </div>
            )}
            {selectedNode.data?.description && (
              <div className="detail-row">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{selectedNode.data.description}</span>
              </div>
            )}
            {selectedNode.data?.path && (
              <div className="detail-row">
                <span className="detail-label">Path:</span>
                <span className="detail-value">{selectedNode.data.path}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeGraphPage;
