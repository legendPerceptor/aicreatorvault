const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Asset, AssetRelationship, sequelize } = require('../models');
const graphService = require('../services/graphService');

// 根据环境选择 uploads 目录
const UPLOADS_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/uploads'
    : path.join(__dirname, '../uploads');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Find asset by type and content (for deduplication)
router.get('/find', async (req, res) => {
  try {
    const { assetType, content } = req.query;

    if (!assetType || !content) {
      return res.status(400).json({
        error: 'Missing required parameters: assetType, content',
      });
    }

    // Validate asset type
    const validTypes = ['prompt', 'image', 'derived_image'];
    if (!validTypes.includes(assetType)) {
      return res.status(400).json({
        error: `Invalid assetType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const asset = await Asset.findOne({
      where: { asset_type: assetType, content },
    });

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
router.get('/', async (req, res) => {
  try {
    const { type, parentId, derivedType, limit, offset } = req.query;

    const where = {};
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findByPk(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
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
router.post('/', async (req, res) => {
  const body = req.body;

  try {
    const {
      assetType,
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
    if (!assetType || !validTypes.includes(assetType)) {
      return res.status(400).json({
        error: `Invalid assetType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // For derived images, parentId and derivedType are required
    if (assetType === 'derived_image' && (!parentId || !derivedType)) {
      return res.status(400).json({
        error: 'derived_image assets require parentId and derivedType',
      });
    }

    // Check for duplicate (assetType + content should be unique)
    if (content) {
      const existing = await Asset.findOne({
        where: { asset_type: assetType, content },
      });

      if (existing) {
        return res.status(409).json({
          error: 'Asset already exists',
          asset: graphService.assetToGraphNode(existing),
        });
      }
    }

    const assetData = {
      asset_type: assetType,
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
    if (assetType === 'derived_image' && parentId) {
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
            assetType: body.asset_type,
            content: body.content,
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
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { parentId, derivedType, promptId, score, description } = req.body;

    let assetType = 'image';
    if (parentId && derivedType) {
      assetType = 'derived_image';
    }

    const asset = await Asset.create({
      assetType,
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
});

// Derive a new asset from an existing one
router.post('/:id/derive', upload.single('image'), async (req, res) => {
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

    let assetData = {
      assetType: 'derived_image',
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
});

// Update an asset
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { score, description, metadata } = req.body;

    const asset = await Asset.findByPk(id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findByPk(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
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
