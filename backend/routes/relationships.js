const express = require('express');
const router = express.Router();
const graphService = require('../services/graphService');

// Create a new relationship
router.post('/', async (req, res) => {
  try {
    const { sourceId, targetId, relationshipType, properties } = req.body;

    // Validate required fields
    if (!sourceId || !targetId || !relationshipType) {
      return res.status(400).json({
        error: 'Missing required fields: sourceId, targetId, relationshipType',
      });
    }

    // Validate relationship type
    const validTypes = ['generated', 'derived_from', 'version_of', 'inspired_by'];
    if (!validTypes.includes(relationshipType)) {
      return res.status(400).json({
        error: `Invalid relationshipType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const relationship = await graphService.createRelationship(
      parseInt(sourceId, 10),
      parseInt(targetId, 10),
      relationshipType,
      properties || {}
    );

    res.status(201).json(relationship);
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete a relationship
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await graphService.deleteRelationship(parseInt(id, 10));
    res.json({ message: 'Relationship deleted successfully' });
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update relationship properties
router.put('/:id', async (req, res) => {
  try {
    const { AssetRelationship } = require('../models');
    const { id } = req.params;
    const { properties } = req.body;

    const relationship = await AssetRelationship.findByPk(id);
    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    await relationship.update({ properties });
    res.json(graphService.relationshipToGraphEdge(relationship));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
