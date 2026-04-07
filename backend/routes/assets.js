const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Asset, AssetRelationship, sequelize } = require('../models');
const graphService = require('../services/graphService');
const { authenticate, optionalAuth } = require('../middleware/auth');

// 根据环境选择 uploads 目录
const UPLOADS_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/uploads'
    : path.join(__dirname, '../uploads');

// Multer storage with user directory support
const getStorage = (userId) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const userDir = path.join(UPLOADS_DIR, 'users', String(userId), 'images');
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      cb(null, userDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });
};

const getUpload = (userId) => {
  return multer({
    storage: getStorage(userId),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  });
};

// Find asset by type and content (for deduplication)
router.get('/find', optionalAuth, async (req, res) => {
  try {
    const { asset_type, content } = req.query;

    if (!asset_type || !content) {
      return res.status(400).json({
        error: 'Missing required parameters: asset_type, content',
      });
    }

    // Validate asset type
    const validTypes = ['prompt', 'image', 'derived_image'];
    if (!validTypes.includes(asset_type)) {
      return res.status(400).json({
        error: `Invalid asset_type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const where = { asset_type: asset_type, content };

    // Filter by user
    if (req.user) {
      where.user_id = req.user.id;
    }

    const asset = await Asset.findOne({ where });

    if (asset) {
      return res.json(graphService.assetToGraphNode(asset));
    } else {
      return res.status(404).json({ error: 'Asset not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all assets with filtering
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, parentId, derivedType, limit, offset } = req.query;

    const where = {};

    // Filter by user
    if (req.user) {
      where.user_id = req.user.id;
    }

    if (type) {
      where.asset_type = type;
    }
    if (parentId) {
      where.parent_id = parentId;
    }
    if (derivedType) {
      where.derived_type = derivedType;
    }

    const options = { where };
    if (limit) {
      options.limit = parseInt(limit, 10);
    }
    if (offset) {
      options.offset = parseInt(offset, 10);
    }

    const assets = await Asset.findAll({
      ...options,
      order: [['created_at', 'DESC']],
    });

    res.json(assets.map((asset) => graphService.assetToGraphNode(asset)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single asset by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findByPk(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check user access
    if (!req.user || asset.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Include relationships if requested
    const includeRelationships = req.query.relationships === 'true';
    if (includeRelationships) {
      const details = await graphService.getNodeDetails(id);
      res.json(details);
    } else {
      res.json(graphService.assetToGraphNode(asset));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new asset
router.post('/', authenticate, async (req, res) => {
  const body = req.body;

  try {
    const {
      asset_type,
      content,
      filename,
      path: filePath,
      score,
      description,
      metadata,
      parentId,
      derivedType,
    } = body;

    // Validate asset type
    const validTypes = ['prompt', 'image', 'derived_image'];
    if (!asset_type || !validTypes.includes(asset_type)) {
      return res.status(400).json({
        error: `Invalid asset_type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // For derived images, parentId and derivedType are required
    if (asset_type === 'derived_image' && (!parentId || !derivedType)) {
      return res.status(400).json({
        error: 'derived_image assets require parentId and derivedType',
      });
    }

    // Check for duplicate (asset_type + content should be unique)
    if (content) {
      const existing = await Asset.findOne({
        where: { asset_type: asset_type, content, user_id: req.user.id },
      });

      if (existing) {
        return res.status(409).json({
          error: 'Asset already exists',
          asset: graphService.assetToGraphNode(existing),
        });
      }
    }

    const assetData = {
      user_id: req.user.id,
      asset_type: asset_type,
      content,
      filename,
      path: filePath,
      score,
      description,
      metadata,
      parent_id: parentId,
      derived_type: derivedType,
    };
    const asset = await Asset.create(assetData);

    // Auto-create relationship for derived images
    if (asset_type === 'derived_image' && parentId) {
      const relationshipType =
        derivedType === 'variant' || derivedType === 'upscale' ? 'version_of' : 'derived_from';

      await graphService.createRelationship(parseInt(parentId, 10), asset.id, relationshipType, {
        derivedType,
        created_at: new Date().toISOString(),
      });
    }

    res.status(201).json(graphService.assetToGraphNode(asset));
  } catch (error) {
    // Handle unique constraint violation (race condition fallback)
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Try to find the existing asset and return it
      try {
        const existing = await Asset.findOne({
          where: {
            asset_type: body.asset_type,
            content: body.content,
            user_id: req.user.id,
          },
        });
        if (existing) {
          return res.status(409).json({
            error: 'Asset already exists',
            asset: graphService.assetToGraphNode(existing),
          });
        }
      } catch (_findError) {
        // Ignore find error, fall through to original error
      }
    }
    res.status(500).json({ error: error.message });
  }
});

// Upload an image asset
router.post(
  '/upload',
  authenticate,
  (req, res, next) => {
    getUpload(req.user.id).single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { parentId, derivedType, promptId, score, description } = req.body;

      let asset_type = req.body.asset_type || 'image';
      if (parentId && derivedType) {
        asset_type = 'derived_image';
      }

      const asset = await Asset.create({
        user_id: req.user.id,
        asset_type,
        filename: req.file.filename,
        path: req.file.path,
        score: score ? parseInt(score, 10) : null,
        description,
        parentId: parentId ? parseInt(parentId, 10) : null,
        derivedType: derivedType || null,
        metadata: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });

      // Create relationship based on parent
      if (parentId) {
        const relationshipType =
          derivedType === 'variant' || derivedType === 'upscale' ? 'version_of' : 'derived_from';

        await graphService.createRelationship(parseInt(parentId, 10), asset.id, relationshipType, {
          derivedType,
          created_at: new Date().toISOString(),
        });
      }

      // Create relationship from prompt if provided
      if (promptId) {
        await graphService.createRelationship(parseInt(promptId, 10), asset.id, 'generated', {
          created_at: new Date().toISOString(),
        });
      }

      res.status(201).json(graphService.assetToGraphNode(asset));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Derive a new asset from an existing one
router.post(
  '/:id/derive',
  authenticate,
  (req, res, next) => {
    getUpload(req.user.id).single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const { derivedType, description } = req.body;

      // Validate derived type
      const validTypes = ['edit', 'variant', 'upscale', 'crop'];
      if (!derivedType || !validTypes.includes(derivedType)) {
        return res.status(400).json({
          error: `Invalid derivedType. Must be one of: ${validTypes.join(', ')}`,
        });
      }

      // Check if parent exists
      const parent = await Asset.findByPk(id);
      if (!parent) {
        return res.status(404).json({ error: 'Parent asset not found' });
      }

      // Check ownership
      if (parent.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      let assetData = {
        user_id: req.user.id,
        asset_type: 'derived_image',
        parentId: parseInt(id, 10),
        derivedType,
        description,
      };

      // If a file was uploaded, include file info
      if (req.file) {
        assetData.filename = req.file.filename;
        assetData.path = req.file.path;
        assetData.metadata = {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        };
      } else {
        // For non-file derivations, copy parent's file info
        assetData.filename = parent.filename;
        assetData.path = parent.path;
      }

      const asset = await Asset.create(assetData);

      // Create relationship
      const relationshipType =
        derivedType === 'variant' || derivedType === 'upscale' ? 'version_of' : 'derived_from';

      const relationship = await graphService.createRelationship(
        parseInt(id, 10),
        asset.id,
        relationshipType,
        { derivedType, created_at: new Date().toISOString() }
      );

      res.status(201).json({
        asset: graphService.assetToGraphNode(asset),
        relationship,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update an asset
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { score, description, metadata } = req.body;

    const asset = await Asset.findByPk(id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check ownership
    if (asset.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (score !== undefined) updates.score = score;
    if (description !== undefined) updates.description = description;
    if (metadata !== undefined) updates.metadata = metadata;

    await asset.update(updates);
    res.json(graphService.assetToGraphNode(asset));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an asset
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findByPk(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check ownership
    if (asset.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file if it's an image
    if (asset.asset_type === 'image' || asset.asset_type === 'derived_image') {
      if (asset.path && fs.existsSync(asset.path)) {
        fs.unlinkSync(asset.path);
      }
    }

    // Delete relationships
    await AssetRelationship.destroy({
      where: {
        [sequelize.Op.or]: [{ sourceId: id }, { targetId: id }],
      },
    });

    // Delete asset
    await asset.destroy();

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
