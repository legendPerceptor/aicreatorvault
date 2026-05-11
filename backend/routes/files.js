const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { optionalAuth } = require('../middleware/auth');

// 根据环境选择 uploads 目录
const UPLOADS_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/uploads'
    : path.join(__dirname, '../../uploads');

// Legacy 用户 ID，其文件默认公开访问
const LEGACY_USER_ID = 1;

/**
 * GET /api/files/reference/:filename
 * Serve reference images downloaded from web
 * 重要：这个路由必须放在 /:userId/* 之前，否则 /reference/xxx 会被错误匹配为 userId=reference
 */
router.get('/reference/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(UPLOADS_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`[Files] Reference image not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('[Files] Error serving reference image:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/:userId/:filename
 * Serve user files with authorization check
 * Legacy user (id=1) files are publicly accessible
 */
router.get('/:userId/:filename', optionalAuth, async (req, res) => {
  try {
    const { userId, filename } = req.params;
    const userIdNum = parseInt(userId, 10);

    // Authorization check
    // Legacy user's files are public
    const isLegacyUser = userIdNum === LEGACY_USER_ID;
    const isOwner = req.user && req.user.id === userIdNum;

    if (!isLegacyUser && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Use UPLOADS_DIR base path, not the database path
    // Database stores absolute host paths which won't work in container
    const filePath = path.join(UPLOADS_DIR, 'users', userId, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`[Files] File not found: ${filePath}`);
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
 * Legacy user (id=1) files are publicly accessible
 */
router.get('/:userId/images/:filename', optionalAuth, async (req, res) => {
  try {
    const { userId, filename } = req.params;
    const userIdNum = parseInt(userId, 10);

    // Authorization check
    // Legacy user's files are public
    const isLegacyUser = userIdNum === LEGACY_USER_ID;
    const isOwner = req.user && req.user.id === userIdNum;

    if (!isLegacyUser && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Use UPLOADS_DIR base path, not the database path
    // Database stores absolute host paths which won't work in container
    const filePath = path.join(UPLOADS_DIR, 'users', userId, 'images', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`[Files] File not found: ${filePath}`);
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
