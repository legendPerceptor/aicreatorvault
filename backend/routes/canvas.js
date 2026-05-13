const express = require('express');
const router = express.Router();
const { CanvasState, GraphNode, sequelize } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Get canvas state for a user
router.get('/', optionalAuth, async (req, res) => {
  try {
    const canvasId = req.query.canvasId || 'default';
    const where = { canvas_id: canvasId };
    if (req.user) {
      where.user_id = req.user.id;
    }

    const states = await CanvasState.findAll({ where });
    res.json(states);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save/update a single node position
router.put('/position', authenticate, async (req, res) => {
  try {
    const { graphNodeId, positionX, positionY, sizeW, sizeH, canvasId } = req.body;

    if (!graphNodeId || positionX === undefined || positionY === undefined) {
      return res.status(400).json({ error: 'graphNodeId, positionX, positionY are required' });
    }

    const cid = canvasId || 'default';

    const [state, created] = await CanvasState.findOrCreate({
      where: { graph_node_id: graphNodeId, canvas_id: cid },
      defaults: {
        user_id: req.user.id,
        graph_node_id: graphNodeId,
        position_x: positionX,
        position_y: positionY,
        size_w: sizeW || null,
        size_h: sizeH || null,
        canvas_id: cid,
      },
    });

    if (!created) {
      await state.update({
        position_x: positionX,
        position_y: positionY,
        ...(sizeW !== undefined && { size_w: sizeW }),
        ...(sizeH !== undefined && { size_h: sizeH }),
      });
    }

    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch save positions
router.put('/positions', authenticate, async (req, res) => {
  try {
    const { positions, canvasId } = req.body;
    if (!Array.isArray(positions)) {
      return res.status(400).json({ error: 'positions must be an array' });
    }

    const cid = canvasId || 'default';
    const results = [];

    for (const pos of positions) {
      const [state] = await CanvasState.findOrCreate({
        where: { graph_node_id: pos.graphNodeId, canvas_id: cid },
        defaults: {
          user_id: req.user.id,
          graph_node_id: pos.graphNodeId,
          position_x: pos.positionX || 0,
          position_y: pos.positionY || 0,
          size_w: pos.sizeW || null,
          size_h: pos.sizeH || null,
          canvas_id: cid,
        },
      });

      if (!state._options.isNewRecord) {
        await state.update({
          position_x: pos.positionX ?? state.position_x,
          position_y: pos.positionY ?? state.position_y,
          ...(pos.sizeW !== undefined && { size_w: pos.sizeW }),
          ...(pos.sizeH !== undefined && { size_h: pos.sizeH }),
        });
      }

      results.push(state);
    }

    res.json({ updated: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete canvas state for a node
router.delete('/:graphNodeId', authenticate, async (req, res) => {
  try {
    const { graphNodeId } = req.params;
    const canvasId = req.query.canvasId || 'default';

    await CanvasState.destroy({
      where: {
        graph_node_id: graphNodeId,
        canvas_id: canvasId,
        user_id: req.user.id,
      },
    });

    res.json({ message: 'Canvas state deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
