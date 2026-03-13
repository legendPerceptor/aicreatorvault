import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3001/api';

export function useGraph(filters = {}) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.assetTypes) {
        params.append('assetTypes', filters.assetTypes.join(','));
      }
      if (filters.relationshipTypes) {
        params.append('relationshipTypes', filters.relationshipTypes.join(','));
      }
      if (filters.limit) {
        params.append('limit', filters.limit);
      }

      const response = await fetch(`${API_BASE}/graph/data?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform to React Flow format with simple layout
      const flowNodes = data.nodes.map((node, index) => {
        // Simple grid layout
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = col * 300 + 50;
        const y = row * 150 + 50;

        return {
          id: String(node.id),
          type: 'custom',
          position: { x, y },
          data: node,
        };
      });

      const flowEdges = data.edges.map((edge) => ({
        id: String(edge.id),
        source: String(edge.source),
        target: String(edge.target),
        type: 'custom',
        label: edge.label,
        data: edge,
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching graph data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchGraphData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.assetTypes?.join(','), filters.relationshipTypes?.join(','), filters.limit]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    loading,
    error,
    refetch: fetchGraphData,
  };
}

export function useGraphTraversal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const traverse = async (nodeId, depth = 2, relationshipTypes = null) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('depth', depth);
      if (relationshipTypes) {
        params.append('relationshipTypes', relationshipTypes.join(','));
      }

      const response = await fetch(`${API_BASE}/graph/traverse/${nodeId}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform to React Flow format with simple layout
      const flowNodes = data.nodes.map((node, index) => {
        // Simple grid layout
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = col * 300 + 50;
        const y = row * 150 + 50;

        return {
          id: String(node.id),
          type: 'custom',
          position: { x, y },
          data: node,
        };
      });

      const flowEdges = data.edges.map((edge) => ({
        id: String(edge.id),
        source: String(edge.source),
        target: String(edge.target),
        type: 'custom',
        label: edge.label,
        data: edge,
      }));

      return { nodes: flowNodes, edges: flowEdges, visited: data.visited };
    } catch (err) {
      setError(err.message);
      console.error('Error traversing graph:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const findPath = async (sourceId, targetId, relationshipTypes = null) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (relationshipTypes) {
        params.append('relationshipTypes', relationshipTypes.join(','));
      }

      const response = await fetch(`${API_BASE}/graph/paths/${sourceId}/${targetId}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error finding path:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getNeighbors = async (nodeId, relationshipTypes = null) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (relationshipTypes) {
        params.append('relationshipTypes', relationshipTypes.join(','));
      }

      const response = await fetch(`${API_BASE}/graph/neighbors/${nodeId}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error getting neighbors:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    traverse,
    findPath,
    getNeighbors,
    loading,
    error,
  };
}

export function useGraphStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/graph/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching graph stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
