import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import GraphVisualization from '../components/graph/GraphVisualization';
import GraphControls from '../components/graph/GraphControls';
import GraphLegend from '../components/graph/GraphLegend';
import ImagePreviewModal from '../components/ImagePreviewModal';
import AgentChat from '../components/AgentChat/AgentChat';
import { useGraph, useGraphTraversal, useGraphRebuild } from '../hooks/useGraph';
import { filterOptions, getEntityTypeConfig, entityTypeConfig } from '../utils/graphConfig';
import { useTranslation } from '../i18n/useTranslation';
import { authFetch } from '../utils/authFetch';
import './KnowledgeGraphPage.css';

const API_BASE = '/api';

function parseISODuration(iso) {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const parts = [];
  if (m[1]) parts.push(m[1] + 'h');
  if (m[2]) parts.push(m[2] + 'm');
  if (m[3]) parts.push(m[3] + 's');
  return parts.join(' ') || iso;
}

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
  const [showAgentChat, setShowAgentChat] = useState(false);
  const [activeAiResourceId, setActiveAiResourceId] = useState(null);
  const [providers, setProviders] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef(null);

  const {
    nodes,
    edges,
    setEdges: setGraphEdges,
    loading,
    error,
    refetch,
  } = useGraph({
    entityTypes,
    relationshipTypes,
    limit: 1000,
  });

  // Fetch available LLM providers
  useEffect(() => {
    authFetch(`${API_BASE}/chat/providers`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProviders(data);
      })
      .catch(() => setProviders([]));
  }, []);

  // Update model selection for an AI assistant (persisted in resource metadata)
  const handleModelChange = useCallback(async (resourceId, providerId, modelId) => {
    try {
      await authFetch(`${API_BASE}/resources/${resourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: { provider: providerId, model: modelId },
        }),
      });
      // Update local node data without refetch
    } catch (err) {
      console.error('Failed to update model:', err);
    }
  }, []);

  // Inject providers + onModelChange into AI assistant nodes
  const enhancedNodes = nodes.map((n) => {
    if (n.type !== 'aiAssistant') return n;
    return {
      ...n,
      data: {
        ...n.data,
        providers,
        onModelChange: handleModelChange,
      },
    };
  });

  // Collect nodes connected to a specific AI assistant via graph edges
  const getConnectedNodes = useCallback(
    (aiGraphId) => {
      const connectedIds = new Set();
      for (const e of edges) {
        if (e.source === String(aiGraphId)) connectedIds.add(String(e.target));
        if (e.target === String(aiGraphId)) connectedIds.add(String(e.source));
      }
      return nodes.filter((n) => connectedIds.has(n.id));
    },
    [nodes, edges]
  );

  const { traverse, findPath } = useGraphTraversal();
  const { rebuild: rebuildGraph, loading: rebuildLoading } = useGraphRebuild();

  const handleNodeClick = useCallback((nodeData) => {
    setSelectedNode(nodeData);
    setHighlightedPath([]);
  }, []);

  // When user drags a connection between nodes, persist as graph edge
  const handleConnect = useCallback(
    async (connection) => {
      const { source, target } = connection;
      try {
        const res = await authFetch(`${API_BASE}/graph/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: parseInt(source),
            targetId: parseInt(target),
            type: 'context',
          }),
        });
        if (res.ok) {
          const edgeData = await res.json();
          // Update hook's edges so getConnectedNodes can see the new edge
          setGraphEdges((prev) => [
            ...prev,
            {
              id: String(edgeData.id),
              source: String(source),
              target: String(target),
              data: edgeData,
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to create edge:', err);
      }
    },
    [setGraphEdges]
  );

  // Double-click AI assistant → open chat; other nodes → expand neighbors
  const handleEdgeDelete = useCallback(
    async (edgeIds) => {
      for (const id of edgeIds) {
        try {
          await authFetch(`${API_BASE}/graph/edges/${id}`, { method: 'DELETE' });
        } catch (err) {
          console.error('Failed to delete edge:', err);
        }
      }
      // Update hook's edges so getConnectedNodes stays in sync
      setGraphEdges((prev) => prev.filter((e) => !edgeIds.includes(e.id)));
    },
    [setGraphEdges]
  );

  const handleNodeDoubleClick = useCallback(
    async (nodeData) => {
      const isAiAssistant =
        nodeData.entityType === 'resource' && nodeData.entity?.resource_type === 'ai_assistant';
      if (isAiAssistant) {
        setActiveAiResourceId(String(nodeData.entityId));
        setShowAgentChat(true);
        return;
      }
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

  // Delete selected node (any entity type)
  const handleDeleteNode = useCallback(async () => {
    if (!selectedNode) return;
    const typeLabels = {
      resource: 'resource',
      image: 'image',
      prompt: 'prompt',
      theme: 'theme',
    };
    if (!window.confirm(`Delete this ${typeLabels[selectedNode.entityType] || 'node'}?`)) return;

    const endpointMap = {
      resource: `${API_BASE}/resources/${selectedNode.entityId}`,
      image: `${API_BASE}/images/${selectedNode.entityId}`,
      prompt: `${API_BASE}/prompts/${selectedNode.entityId}`,
      theme: `${API_BASE}/themes/${selectedNode.entityId}`,
    };
    try {
      await authFetch(endpointMap[selectedNode.entityType], { method: 'DELETE' });
      setSelectedNode(null);
      refetch();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [selectedNode, refetch]);

  // Resource import handlers
  const handleAddNote = useCallback(async () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;
    try {
      const res = await authFetch(`${API_BASE}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_type: 'note',
          title: noteTitle || 'Untitled Note',
          content: noteContent,
        }),
      });
      if (res.ok) {
        setNoteTitle('');
        setNoteContent('');
        setShowNoteEditor(false);
        refetch();
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  }, [noteTitle, noteContent, refetch]);

  const handleAddAiAssistant = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_type: 'ai_assistant',
          title: 'AI Assistant',
          metadata: {
            provider: providers.length > 0 ? providers[0].id : 'minimax',
            model: providers.length > 0 ? providers[0].defaultModel : 'MiniMax-M2.7',
          },
        }),
      });
      if (res.ok) {
        setShowAddMenu(false);
        refetch();
      }
    } catch (err) {
      console.error('Failed to create AI Assistant:', err);
    }
  }, [providers, refetch]);

  const handleAddUrl = useCallback(async () => {
    if (!urlValue.trim()) return;
    try {
      const res = await authFetch(`${API_BASE}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_type: showUrlInput,
          title: urlValue,
          url: urlValue,
        }),
      });
      if (res.ok) {
        setUrlValue('');
        setShowUrlInput(null);
        refetch();
      }
    } catch (err) {
      console.error('Failed to add URL:', err);
    }
  }, [urlValue, showUrlInput, refetch]);

  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      const resourceType = file.type === 'application/pdf' ? 'pdf' : 'file';
      formData.append('resource_type', resourceType);
      try {
        const res = await authFetch(`${API_BASE}/resources/upload`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          refetch();
        }
      } catch (err) {
        console.error('Failed to upload file:', err);
      }
      e.target.value = '';
    },
    [refetch]
  );

  const selectedNodeConfig = selectedNode
    ? getEntityTypeConfig(selectedNode.entityType || selectedNode.type)
    : null;

  const resolvedNodeConfig = (() => {
    if (!selectedNode || selectedNode.entityType !== 'resource') return selectedNodeConfig;
    const subType = selectedNode.entity?.resource_type;
    const subConfig = entityTypeConfig.resource?.subTypes?.[subType];
    return subConfig || selectedNodeConfig;
  })();

  // Get the active AI assistant's graph node ID for chat context
  const activeAiGraphNode = useMemo(() => {
    if (!activeAiResourceId) return null;
    return nodes.find(
      (n) =>
        n.data?.entityType === 'resource' && String(n.data?.entityId) === String(activeAiResourceId)
    );
  }, [nodes, activeAiResourceId]);

  const activeAiMetadata = activeAiGraphNode?.data?.entity?.metadata || {};

  return (
    <div className="knowledge-graph-page">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
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
          <div className="add-resource-wrapper">
            <button onClick={() => setShowAddMenu(!showAddMenu)} className="action-button primary">
              + Add Asset
            </button>
            {showAddMenu && (
              <div className="add-resource-menu">
                <button onClick={handleAddAiAssistant}>{'\u{1F916}'} AI Assistant</button>
                <button
                  onClick={() => {
                    setShowNoteEditor(true);
                    setShowAddMenu(false);
                  }}
                >
                  {'\u{1F4DD}'} Note
                </button>
                <button
                  onClick={() => {
                    setShowUrlInput('web_link');
                    setShowAddMenu(false);
                  }}
                >
                  {'\u{1F310}'} Web Link
                </button>
                <button
                  onClick={() => {
                    setShowUrlInput('youtube');
                    setShowAddMenu(false);
                  }}
                >
                  {'\u{25B6}'} YouTube
                </button>
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    setTimeout(() => fileInputRef.current?.click(), 50);
                  }}
                >
                  {'\u{1F4C1}'} Upload File
                </button>
              </div>
            )}
          </div>
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

      {/* Note Editor Modal */}
      {showNoteEditor && (
        <div className="resource-modal" onClick={() => setShowNoteEditor(false)}>
          <div className="resource-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>New Note</h3>
            <input
              type="text"
              placeholder="Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="resource-input"
            />
            <textarea
              placeholder="Write your note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="resource-textarea"
              rows={6}
            />
            <div className="resource-modal-actions">
              <button onClick={() => setShowNoteEditor(false)} className="action-button">
                Cancel
              </button>
              <button onClick={handleAddNote} className="action-button primary">
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL Input Modal */}
      {showUrlInput && (
        <div className="resource-modal" onClick={() => setShowUrlInput(null)}>
          <div className="resource-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{showUrlInput === 'youtube' ? 'Add YouTube Video' : 'Add Web Link'}</h3>
            <input
              type="url"
              placeholder={
                showUrlInput === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://...'
              }
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              className="resource-input"
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            />
            <div className="resource-modal-actions">
              <button onClick={() => setShowUrlInput(null)} className="action-button">
                Cancel
              </button>
              <button onClick={handleAddUrl} className="action-button primary">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

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
              nodes={enhancedNodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onConnect={handleConnect}
              onEdgeDelete={handleEdgeDelete}
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
                {resolvedNodeConfig?.label || selectedNode.entityType}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Label:</span>
              <span className="detail-value">{selectedNode.label}</span>
            </div>

            {/* AI Assistant detail panel — open chat button */}
            {selectedNode.entity?.resource_type === 'ai_assistant' && (
              <div className="detail-row" style={{ marginTop: 8 }}>
                <button
                  className="action-button primary"
                  onClick={() => {
                    setActiveAiResourceId(String(selectedNode.entityId));
                    setShowAgentChat(true);
                  }}
                >
                  Open Chat
                </button>
              </div>
            )}

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

            {/* Resource detail display */}
            {selectedNode.entityType === 'resource' && selectedNode.entity?.thumbnail && (
              <div className="detail-row">
                <a href={selectedNode.entity.url || '#'} target="_blank" rel="noopener noreferrer">
                  <img
                    src={selectedNode.entity.thumbnail}
                    alt="thumbnail"
                    className="detail-thumbnail"
                    style={{ maxWidth: '100%', borderRadius: 6, cursor: 'pointer' }}
                  />
                </a>
              </div>
            )}

            {selectedNode.entityType === 'resource' && selectedNode.entity?.url && (
              <div className="detail-row">
                <span className="detail-label">URL:</span>
                <a
                  href={selectedNode.entity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-value detail-link"
                >
                  {selectedNode.entity.url}
                </a>
              </div>
            )}

            {selectedNode.entityType === 'resource' && selectedNode.entity?.metadata?.siteName && (
              <div className="detail-row">
                <span className="detail-label">Site:</span>
                <span className="detail-value">{selectedNode.entity.metadata.siteName}</span>
              </div>
            )}

            {selectedNode.entityType === 'resource' &&
              selectedNode.entity?.metadata?.authorName && (
                <div className="detail-row">
                  <span className="detail-label">Author:</span>
                  <span className="detail-value">{selectedNode.entity.metadata.authorName}</span>
                </div>
              )}

            {selectedNode.entityType === 'resource' &&
              selectedNode.entity?.metadata?.channelTitle && (
                <div className="detail-row">
                  <span className="detail-label">Channel:</span>
                  <span className="detail-value">{selectedNode.entity.metadata.channelTitle}</span>
                </div>
              )}

            {selectedNode.entityType === 'resource' && selectedNode.entity?.metadata?.duration && (
              <div className="detail-row">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">
                  {parseISODuration(selectedNode.entity.metadata.duration)}
                </span>
              </div>
            )}

            {selectedNode.entityType === 'resource' &&
              selectedNode.entity?.content &&
              selectedNode.entity.content.length > 0 &&
              selectedNode.entity?.resource_type !== 'ai_assistant' && (
                <div className="detail-row detail-description">
                  <span className="detail-label">Content:</span>
                  <span className="detail-value">
                    {selectedNode.entity.content.length > 500
                      ? selectedNode.entity.content.slice(0, 500) + '...'
                      : selectedNode.entity.content}
                  </span>
                </div>
              )}

            {selectedNode.entityType === 'resource' &&
              !selectedNode.entity?.content &&
              selectedNode.entity?.resource_type !== 'file' &&
              selectedNode.entity?.resource_type !== 'ai_assistant' && (
                <div className="detail-row">
                  <span className="detail-label">Content:</span>
                  <span className="detail-value" style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                    Not yet extracted
                  </span>
                </div>
              )}

            {selectedNode.entityType === 'resource' && selectedNode.entity?.file_path && (
              <div className="detail-row">
                <span className="detail-label">File:</span>
                <a
                  href={`${API_BASE}/resources/${selectedNode.entityId}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-value detail-link"
                >
                  Download
                </a>
              </div>
            )}

            {/* Re-extract + Delete for resource (non-ai_assistant) */}
            {selectedNode.entityType === 'resource' &&
              selectedNode.entity?.resource_type !== 'ai_assistant' && (
                <div className="detail-row" style={{ gap: 8, marginTop: 4 }}>
                  <button
                    className="action-button"
                    onClick={async () => {
                      try {
                        await authFetch(`${API_BASE}/resources/${selectedNode.entityId}/extract`, {
                          method: 'POST',
                        });
                        refetch();
                      } catch (err) {
                        console.error('Re-extract failed:', err);
                      }
                    }}
                  >
                    Re-extract
                  </button>
                  <button
                    className="action-button"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={handleDeleteNode}
                  >
                    Delete
                  </button>
                </div>
              )}

            {/* Delete for ai_assistant and non-resource types */}
            {(selectedNode.entityType !== 'resource' ||
              selectedNode.entity?.resource_type === 'ai_assistant') && (
              <div className="detail-row" style={{ marginTop: 8 }}>
                <button
                  className="action-button"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={handleDeleteNode}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {previewImage && (
        <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />
      )}

      <AgentChat
        nodes={activeAiGraphNode ? getConnectedNodes(activeAiGraphNode.id) : []}
        resourceId={activeAiResourceId || 'default'}
        isOpen={showAgentChat}
        onClose={() => setShowAgentChat(false)}
        provider={activeAiMetadata.provider || 'minimax'}
        model={activeAiMetadata.model || 'MiniMax-M2.7'}
        providers={providers}
        onModelChange={handleModelChange}
      />
    </div>
  );
}

export default KnowledgeGraphPage;
