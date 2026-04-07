const express = require('express');
const router = express.Router();
const graphService = require('../services/graphService');
const { optionalAuth } = require('../middleware/auth');

// Get graph data (nodes and edges)
router.get('/data', optionalAuth, async (req, res) => {
  try {
    const { assetTypes, relationshipTypes, limit } = req.query;

    const filters = {};
    if (assetTypes) {
      filters.assetTypes = Array.isArray(assetTypes) ? assetTypes : assetTypes.split(',');
    }
    if (relationshipTypes) {
      filters.relationshipTypes = Array.isArray(relationshipTypes)
        ? relationshipTypes
        : relationshipTypes.split(',');
    }
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    // Filter by user if authenticated
    if (req.user) {
      filters.userId = req.user.id;
    }

    const data = await graphService.getGraphData(filters);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all nodes (assets)
router.get('/nodes', optionalAuth, async (req, res) => {
  try {
    const { types, limit } = req.query;

    const filters = {};
    if (types) {
      filters.assetTypes = Array.isArray(types) ? types : types.split(',');
    }
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    // Filter by user if authenticated
    if (req.user) {
      filters.userId = req.user.id;
    }

    const { nodes } = await graphService.getGraphData(filters);
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all edges (relationships)
router.get('/edges', optionalAuth, async (req, res) => {
  try {
    const { types } = req.query;

    const filters = {};
    if (types) {
      filters.relationshipTypes = Array.isArray(types) ? types : types.split(',');
    }

    // Filter by user if authenticated
    if (req.user) {
      filters.userId = req.user.id;
    }

    const { edges } = await graphService.getGraphData(filters);
    res.json(edges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Traverse from a node
router.get('/traverse/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { depth, relationshipTypes } = req.query;

    const traverseDepth = depth ? parseInt(depth, 10) : 2;
    const types = relationshipTypes
      ? Array.isArray(relationshipTypes)
        ? relationshipTypes
        : relationshipTypes.split(',')
      : null;

    const result = await graphService.traverse(id, traverseDepth, types);
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Find shortest path between nodes
router.get('/paths/:sourceId/:targetId', optionalAuth, async (req, res) => {
  try {
    const { sourceId, targetId } = req.params;
    const { relationshipTypes } = req.query;

    const types = relationshipTypes
      ? Array.isArray(relationshipTypes)
        ? relationshipTypes
        : relationshipTypes.split(',')
      : null;

    const path = await graphService.findShortestPath(
      parseInt(sourceId, 10),
      parseInt(targetId, 10),
      types
    );

    if (!path) {
      res.json({ path: null, message: 'No path found between nodes' });
    } else {
      // Fetch full node data for the path
      const { Asset } = require('../models');
      const nodes = await Asset.findAll({
        where: { id: path },
      });

      res.json({
        path,
        nodes: nodes.map((node) => graphService.assetToGraphNode(node)),
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get neighbors of a node
router.get('/neighbors/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { relationshipTypes } = req.query;

    const types = relationshipTypes
      ? Array.isArray(relationshipTypes)
        ? relationshipTypes
        : relationshipTypes.split(',')
      : null;

    const result = await graphService.getNeighbors(id, types);
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get connected components
router.get('/components', optionalAuth, async (req, res) => {
  try {
    const filters = {};
    if (req.user) {
      filters.userId = req.user.id;
    }

    const components = await graphService.getConnectedComponents(filters);
    res.json(components);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node details
router.get('/nodes/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const details = await graphService.getNodeDetails(id);
    res.json(details);
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get graph statistics
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const filters = {};
    if (req.user) {
      filters.userId = req.user.id;
    }

    const stats = await graphService.getGraphStats(filters);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
