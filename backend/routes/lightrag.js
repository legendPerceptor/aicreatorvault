const express = require('express');
const router = express.Router();
const lightragService = require('../services/lightragService');
const imageServiceClient = require('../services/imageServiceClient');
const { authenticate, optionalAuth } = require('../middleware/auth');

/**
 * Smart search via LightRAG knowledge graph
 * POST /api/lightrag/search
 */
router.post('/search', optionalAuth, async (req, res) => {
  try {
    const { query, mode = 'hybrid', onlyNeedContext = false } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await lightragService.smartSearch(query, { mode, onlyNeedContext });
    res.json(result);
  } catch (error) {
    console.error('[LightRAG] Search failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check LightRAG status
 * GET /api/lightrag/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await imageServiceClient.lightragStatus();
    res.json(status);
  } catch (error) {
    res.json({ initialized: false, error: error.message });
  }
});

/**
 * Backfill existing assets into LightRAG
 * POST /api/lightrag/backfill
 */
router.post('/backfill', authenticate, async (req, res) => {
  try {
    const result = await lightragService.backfillAssets(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('[LightRAG] Backfill failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
