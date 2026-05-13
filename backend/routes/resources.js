const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Resource, DB_TYPE } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const graphSyncService = require('../services/graphSyncService');

const UPLOADS_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/uploads'
    : path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(UPLOADS_DIR, 'users', String(req.user?.id || 1), 'resources');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// List resources
router.get('/', optionalAuth, async (req, res) => {
  try {
    const where = {};
    if (req.user) {
      where.user_id = req.user.id;
    }
    if (req.query.type) {
      where.resource_type = req.query.type;
    }

    const resources = await Resource.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single resource
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create resource (text-based: note, web_link, youtube)
router.post('/', authenticate, async (req, res) => {
  try {
    const { resource_type, title, content, url, metadata } = req.body;

    if (!resource_type) {
      return res.status(400).json({ error: 'resource_type is required' });
    }

    const resource = await Resource.create({
      user_id: req.user.id,
      resource_type,
      title: title || '',
      content: content || '',
      url: url || null,
      metadata: metadata || {},
    });

    // Sync to graph
    try {
      await graphSyncService.syncCreateEntity('resource', resource.id, req.user.id);
    } catch (graphError) {
      console.error('[Resource] Graph sync failed:', graphError.message);
    }

    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload file-based resource (PDF, file)
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const resource_type = req.body.resource_type || 'file';
    const title = req.body.title || req.file.originalname;

    // Extract text content from PDF if possible
    let content = '';
    if (resource_type === 'pdf' && req.file.mimetype === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(pdfBuffer);
        content = pdfData.text || '';
      } catch (pdfError) {
        console.error('[Resource] PDF parsing failed:', pdfError.message);
        content = '';
      }
    }

    const resource = await Resource.create({
      user_id: req.user.id,
      resource_type,
      title,
      content,
      file_path: req.file.path,
      metadata: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });

    // Sync to graph
    try {
      await graphSyncService.syncCreateEntity('resource', resource.id, req.user.id);
    } catch (graphError) {
      console.error('[Resource] Graph sync failed:', graphError.message);
    }

    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update resource
router.put('/:id', authenticate, async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (resource.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, content, url, metadata } = req.body;
    await resource.update({
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(url !== undefined && { url }),
      ...(metadata !== undefined && { metadata }),
    });

    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete resource
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (resource.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file if exists
    if (resource.file_path && fs.existsSync(resource.file_path)) {
      fs.unlinkSync(resource.file_path);
    }

    // Remove from graph
    try {
      await graphSyncService.syncDeleteEntity('resource', resource.id);
    } catch (graphError) {
      console.error('[Resource] Graph sync delete failed:', graphError.message);
    }

    await resource.destroy();
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve resource files
router.get('/:id/file', optionalAuth, async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (!resource.file_path || !fs.existsSync(resource.file_path)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(resource.file_path);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
