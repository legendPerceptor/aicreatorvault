const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { optionalAuth } = require('../middleware/auth');

// 根据环境选择 uploads 目录
const UPLOADS_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/uploads'
    : path.join(__dirname, '../uploads');

/**
 * GET /api/files/:userId/:filename
 * Serve user files with authorization check
 */
router.get('/:userId/:filename', optionalAuth, async (req, res) => {
  try {
    const { userId, filename } = req.params;

    // Authorization check
    if (!req.user || req.user.id !== parseInt(userId, 10)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(UPLOADS_DIR, 'users', userId, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('[Files] Error serving file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/:userId/images/:filename
 * Alias for user image files
 */
router.get('/:userId/images/:filename', optionalAuth, async (req, res) => {
  try {
    const { userId, filename } = req.params;

    // Authorization check
    if (!req.user || req.user.id !== parseInt(userId, 10)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(UPLOADS_DIR, 'users', userId, 'images', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('[Files] Error serving image:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
