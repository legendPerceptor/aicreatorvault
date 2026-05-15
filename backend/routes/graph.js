const express = require('express');
const router = express.Router();
const graphService = require('../services/graphService');
const graphSyncService = require('../services/graphSyncService');
const { GraphEdge, GraphNode } = require('../models');
const { Op } = require('sequelize');
const { optionalAuth, authenticate } = require('../middleware/auth');

// Get graph data (nodes and edges)
router.get('/data', optionalAuth, async (req, res) => {
  try {
    const { entityTypes, assetTypes, relationshipTypes, limit } = req.query;

    // Accept both entityTypes and assetTypes (backward compat)
    const types = entityTypes || assetTypes;
    const filters = {};
    if (types) {
      filters.entity_types = Array.isArray(types) ? types : types.split(',');
    }
    if (relationshipTypes) {
      filters.relationship_types = Array.isArray(relationshipTypes)
        ? relationshipTypes
        : relationshipTypes.split(',');
    }
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    const data = await graphService.getGraphData(filters);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all nodes
router.get('/nodes', optionalAuth, async (req, res) => {
  try {
    const { types, limit } = req.query;

    const filters = {};
    if (types) {
      filters.entity_types = Array.isArray(types) ? types : types.split(',');
    }
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    const { nodes } = await graphService.getGraphData(filters);
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all edges
router.get('/edges', optionalAuth, async (req, res) => {
  try {
    const { types } = req.query;

    const filters = {};
    if (types) {
      filters.relationship_types = Array.isArray(types) ? types : types.split(',');
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

    const result = await graphService.traverse(parseInt(id, 10), traverseDepth, types);
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
      // Hydrate path nodes
      const graphNodes = await require('../models').GraphNode.findAll({
        where: { id: { [require('sequelize').Op.in]: path } },
      });
      const hydrated = await graphService.hydrateNodes(graphNodes);

      res.json({ path, nodes: hydrated });
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

    const result = await graphService.getNeighbors(parseInt(id, 10), types);
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
    const components = await graphService.getConnectedComponents();
    res.json(components);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node details
router.get('/nodes/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const details = await graphService.getNodeDetails(parseInt(id, 10));
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
    const stats = await graphService.getGraphStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rebuild graph from entities
router.post('/rebuild', authenticate, async (req, res) => {
  try {
    const result = await graphSyncService.fullRebuild(req.user.id);
    res.json({ message: 'Graph rebuilt successfully', ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create an edge between two graph nodes
router.post('/edges', authenticate, async (req, res) => {
  try {
    const { sourceId, targetId, type = 'context' } = req.body;
    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' });
    }
    // Validate both nodes exist
    const nodes = await GraphNode.findAll({ where: { id: { [Op.in]: [sourceId, targetId] } } });
    if (nodes.length !== 2) {
      return res.status(404).json({ error: 'One or both graph nodes not found' });
    }
    const [edge, created] = await GraphEdge.findOrCreate({
      where: { source_id: sourceId, target_id: targetId, relationship_type: type },
      defaults: {
        user_id: req.user.id,
        source_id: sourceId,
        target_id: targetId,
        relationship_type: type,
      },
    });
    res.status(created ? 201 : 200).json(edge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an edge
router.delete('/edges/:id', authenticate, async (req, res) => {
  try {
    const deleted = await GraphEdge.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ error: 'Edge not found' });
    }
    res.json({ message: 'Edge deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
