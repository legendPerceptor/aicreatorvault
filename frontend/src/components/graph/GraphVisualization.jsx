import React, { useCallback, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import GraphNode from './GraphNode';
import AiAssistantNode from './AiAssistantNode';
import { entityTypeConfig, relationshipTypeConfig } from '../../utils/graphConfig';
import './GraphVisualization.css';

const nodeTypes = {
  custom: GraphNode,
  aiAssistant: AiAssistantNode,
};

function GraphFlowInner({
  nodes: initialNodes = [],
  edges: initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeDoubleClick,
  onConnect,
  onEdgeDelete,
  selectedNode,
  highlightedPath = [],
}) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const [selectedEdge, setSelectedEdge] = useState(null);

  // Merge: keep existing positions, add new nodes, update data for changed nodes
  React.useEffect(() => {
    setNodes((prev) => {
      if (prev.length === 0) return initialNodes;
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return initialNodes.map((n) => {
        const existing = prevMap.get(n.id);
        if (existing) {
          return { ...n, position: existing.position };
        }
        return n;
      });
    });
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChangeInternal(changes);
      if (onNodesChange) {
        onNodesChange(changes);
      }
    },
    [onNodesChangeInternal, onNodesChange]
  );

  // Handle edge changes including removal via React Flow's built-in edge delete (Backspace key)
  const handleEdgesChange = useCallback(
    (changes) => {
      // Detect edge removal (user pressed Backspace/Delete on selected edge)
      const removedIds = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      if (removedIds.length > 0 && onEdgeDelete) {
        onEdgeDelete(removedIds);
      }
      onEdgesChangeInternal(changes);
      if (onEdgesChange) {
        onEdgesChange(changes);
      }
    },
    [onEdgesChangeInternal, onEdgesChange, onEdgeDelete]
  );

  const handleConnect = useCallback(
    (connection) => {
      const newEdge = {
        ...connection,
        type: 'custom',
        data: { type: 'context', label: 'context' },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      if (onConnect) {
        onConnect(connection);
      }
    },
    [setEdges, onConnect]
  );

  const handleNodeClickHandler = useCallback(
    (event, node) => {
      setSelectedEdge(null);
      if (onNodeClick) {
        onNodeClick(node.data || {});
      }
    },
    [onNodeClick]
  );

  const handleNodeDoubleClickHandler = useCallback(
    (event, node) => {
      if (onNodeDoubleClick) {
        onNodeDoubleClick(node.data);
      }
    },
    [onNodeDoubleClick]
  );

  const handleEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  const handleDeleteSelectedEdge = useCallback(() => {
    if (!selectedEdge) return;
    if (onEdgeDelete) {
      onEdgeDelete([selectedEdge.id]);
    }
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdge(null);
  }, [selectedEdge, onEdgeDelete, setEdges]);

  const enhancedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...(node.data || {}),
        onNodeClick: handleNodeClickHandler,
        onNodeDoubleClick: handleNodeDoubleClickHandler,
      },
    }));
  }, [nodes, handleNodeClickHandler, handleNodeDoubleClickHandler]);

  const enhancedEdges = useMemo(() => {
    return edges.map((edge) => {
      const config = relationshipTypeConfig[edge.data?.type];
      const isHighlighted = highlightedPath.some(
        (p) => p.source === edge.source && p.target === edge.target
      );
      const isSelected = selectedEdge?.id === edge.id;

      return {
        ...edge,
        animated: config?.animated || false,
        style: {
          stroke: isSelected ? '#ef4444' : isHighlighted ? '#ef4444' : config?.color || '#6b7280',
          strokeWidth: isSelected || isHighlighted ? 3 : 2,
          strokeDasharray:
            config?.style === 'dashed' ? '5,5' : config?.style === 'dotted' ? '2,2' : 'none',
        },
        zIndex: isSelected || isHighlighted ? 1000 : 1,
      };
    });
  }, [edges, highlightedPath, selectedEdge]);

  return (
    <div className="graph-visualization">
      <ReactFlow
        nodes={enhancedNodes}
        edges={enhancedEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClickHandler}
        onNodeDoubleClick={handleNodeDoubleClickHandler}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        connectionMode="loose"
        deleteKeyCode={['Backspace', 'Delete']}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const et = node.data?.entityType || node.data?.type;
            const config = entityTypeConfig[et];
            return config?.bgColor || '#e5e7eb';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        {selectedNode && (
          <Panel position="top-right" className="selected-node-panel">
            <div className="selected-node-info">
              <strong>Selected:</strong> {selectedNode.label}
            </div>
          </Panel>
        )}

        {selectedEdge && (
          <Panel position="top-right" className="edge-action-panel" style={{ marginTop: 48 }}>
            <div className="edge-action-content">
              <span className="edge-action-label">Edge selected</span>
              <button
                className="edge-delete-btn"
                onClick={handleDeleteSelectedEdge}
                title="Delete this connection"
              >
                Delete Connection
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

function GraphVisualization(props) {
  return (
    <ReactFlowProvider>
      <GraphFlowInner {...props} />
    </ReactFlowProvider>
  );
}

export default GraphVisualization;
