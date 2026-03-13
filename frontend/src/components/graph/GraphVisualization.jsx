import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import GraphNode from './GraphNode';
import { assetTypeConfig, relationshipTypeConfig } from '../../utils/graphConfig';
import './GraphVisualization.css';

const nodeTypes = {
  custom: GraphNode,
};

function GraphVisualization({
  nodes: initialNodes = [],
  edges: initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeDoubleClick,
  onConnect,
  onSelectionChange,
  selectedNode,
  highlightedPath = [],
}) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  // Update nodes when initialNodes change
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when initialEdges change
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

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChangeInternal(changes);
      if (onEdgesChange) {
        onEdgesChange(changes);
      }
    },
    [onEdgesChangeInternal, onEdgesChange]
  );

  const handleConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge(connection, eds));
      if (onConnect) {
        onConnect(connection);
      }
    },
    [setEdges, onConnect]
  );

  const handleNodeClickHandler = useCallback(
    (event, node) => {
      if (onNodeClick) {
        onNodeClick(node.data);
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

  // Enhance nodes with handlers
  const enhancedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onNodeClick: handleNodeClickHandler,
        onNodeDoubleClick: handleNodeDoubleClickHandler,
      },
    }));
  }, [nodes, handleNodeClickHandler, handleNodeDoubleClickHandler]);

  // Enhance edges with styles
  const enhancedEdges = useMemo(() => {
    return edges.map((edge) => {
      const config = relationshipTypeConfig[edge.data?.type];
      const isHighlighted = highlightedPath.some(
        (p) => p.source === edge.source && p.target === edge.target
      );

      return {
        ...edge,
        animated: config?.animated || false,
        style: {
          stroke: isHighlighted ? '#ef4444' : config?.color || '#6b7280',
          strokeWidth: isHighlighted ? 3 : 2,
          strokeDasharray:
            config?.style === 'dashed' ? '5,5' : config?.style === 'dotted' ? '2,2' : 'none',
        },
        zIndex: isHighlighted ? 1000 : 1,
      };
    });
  }, [edges, highlightedPath]);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (onSelectionChange) {
        onSelectionChange({ nodes: selectedNodes, edges: selectedEdges });
      }
    },
    [onSelectionChange]
  );

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
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const config = assetTypeConfig[node.data?.type];
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
      </ReactFlow>
    </div>
  );
}

export default GraphVisualization;
