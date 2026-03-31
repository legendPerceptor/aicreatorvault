const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Image, Prompt, DB_TYPE, supportsVector } = require('../models');
const imageServiceClient = require('../services/imageServiceClient');
const imageGenerationClient = require('../services/imageGenerationClient');
const { saveEmbeddingVector } = require('../utils/vectorSearch');
const retrievalService = require('../services/retrievalService');

// 根据环境选择 uploads 目录
// Docker 模式: NODE_ENV=production, 使用 /app/uploads
// 本地开发模式: 使用 ./uploads
const UPLOADS_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/uploads'
    : path.join(__dirname, '../uploads');

// 确保 uploads 目录存在
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 限制
  },
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const image = await Image.create({
      filename: req.file.filename,
      path: req.file.path, // 存储容器内绝对路径
      promptId: req.body.promptId || req.body.prompt_id,
    });

    // 直接使用容器内路径
    const imagePath = req.file.path;

    // 检查是否要自动分析，默认为true以保持向后兼容
    const autoAnalyze =
      req.body.autoAnalyze === undefined ||
      req.body.autoAnalyze === 'true' ||
      req.body.autoAnalyze === 'on';

    if (autoAnalyze) {
      try {
        const analysis = await imageServiceClient.analyzeImage(imagePath);
        await image.update({
          description: analysis.description,
          embedding: analysis.embedding,
          embeddingModel: analysis.model,
          analyzedAt: new Date(),
        });
        if (DB_TYPE === 'postgres' && supportsVector()) {
          await saveEmbeddingVector(image.id, analysis.embedding);
        }

        // 同步写入 Qdrant 向量数据库
        try {
          await imageServiceClient.qdrantUpsert(image.id, analysis.embedding, {
            prompt_id: image.prompt_id,
            filename: image.filename,
            description: analysis.description,
          });
          console.log(`[Image] 已写入 Qdrant: Image #${image.id}`);
        } catch (qdrantError) {
          console.error('[Image] Qdrant 写入失败:', qdrantError.message);
          // 不影响主流程
        }
      } catch (analyzeError) {
        console.error('AI分析失败，但图片已保存:', analyzeError.message);
      }
    }

    // 自动同步到 Asset 表（知识图谱）
    try {
      const { Asset, AssetRelationship } = require('../models');
      // Op unused

      const asset = await Asset.create({
        asset_type: 'image',
        filename: image.filename,
        path: image.path,
        score: image.score,
        description: image.description,
        metadata: {
          legacy_image_id: image.id,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });

      // 如果有关联的 promptId，创建 GENERATED 关系
      if (req.body.promptId || req.body.prompt_id) {
        // 查找 prompt 对应的 Asset
        const promptAsset = await Asset.findOne({
          where: {
            asset_type: 'prompt',
            metadata: {
              legacy_prompt_id: parseInt(req.body.promptId || req.body.prompt_id),
            },
          },
        });

        if (promptAsset) {
          await AssetRelationship.create({
            source_id: promptAsset.id,
            target_id: asset.id,
            relationship_type: 'generated',
            properties: {
              createdAt: new Date().toISOString(),
            },
          });
          console.log(
            `[Image] Created GENERATED relationship: Asset #${promptAsset.id} -> Asset #${asset.id}`
          );
        }
      }

      console.log(`[Image] Created Asset #${asset.id} for Image #${image.id}`);
    } catch (assetError) {
      console.error('[Image] Failed to create Asset:', assetError.message);
      // 不影响主流程，只记录错误
    }

    const imageWithPrompt = await Image.findByPk(image.id, { include: Prompt });
    res.json(imageWithPrompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { analyzed } = req.query;
    const whereClause = {};

    if (analyzed === 'true') {
      whereClause.description = { [require('sequelize').Op.ne]: null };
    } else if (analyzed === 'false') {
      whereClause.description = null;
    }

    const images = await Image.findAll({
      where: whereClause,
      include: Prompt,
    });
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/score', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    await image.update({ score: req.body.score });
    const imageWithPrompt = await Image.findByPk(image.id, { include: Prompt });
    res.json(imageWithPrompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/prompt', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    await image.update({ prompt_id: req.body.promptId || req.body.prompt_id });
    const imageWithPrompt = await Image.findByPk(image.id, { include: Prompt });
    res.json(imageWithPrompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // 使用数据库中存储的路径
    const filePath = image.path;

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 删除关联的 Asset（知识图谱）
    try {
      const { Asset, AssetRelationship } = require('../models');
      // Op unused

      const asset = await Asset.findOne({
        where: {
          asset_type: 'image',
          metadata: {
            legacy_image_id: image.id,
          },
        },
      });

      if (asset) {
        // 删除关联的关系
        await AssetRelationship.destroy({
          where: {
            [Op.or]: [{ source_id: asset.id }, { target_id: asset.id }],
          },
        });
        // 删除 Asset
        await asset.destroy();
        console.log(`[Image] Deleted Asset #${asset.id} for Image #${image.id}`);
      }
    } catch (assetError) {
      console.error('[Image] Failed to delete Asset:', assetError.message);
      // 不影响主流程
    }

    // 删除 Qdrant 向量
    try {
      await imageServiceClient.qdrantDelete(image.id);
      console.log(`[Image] Deleted from Qdrant: Image #${image.id}`);
    } catch (qdrantError) {
      console.error('[Image] Failed to delete from Qdrant:', qdrantError.message);
    }

    await image.destroy();
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // 使用数据库中存储的路径
    const imagePath = image.path;

    if (!imagePath || !fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const analysis = await imageServiceClient.analyzeImage(imagePath);

    await image.update({
      description: analysis.description,
      embedding: analysis.embedding,
      embeddingModel: analysis.model,
      analyzedAt: new Date(),
    });

    if (DB_TYPE === 'postgres' && supportsVector()) {
      await saveEmbeddingVector(image.id, analysis.embedding);
    }

    // 同步写入 Qdrant 向量数据库
    try {
      await imageServiceClient.qdrantUpsert(image.id, analysis.embedding, {
        prompt_id: image.prompt_id,
        filename: image.filename,
        description: analysis.description,
      });
      console.log(`[Image] 已写入 Qdrant: Image #${image.id}`);
    } catch (qdrantError) {
      console.error('[Image] Qdrant 写入失败:', qdrantError.message);
    }

    const imageWithPrompt = await Image.findByPk(image.id, { include: Prompt });
    res.json(imageWithPrompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { query, topK = 10 } = req.body;

    const images = await Image.findAll({ include: Prompt });
    const imagesWithEmbeddings = images
      .filter((img) => img.embedding)
      .map((img) => ({
        id: img.id,
        filename: img.filename,
        description: img.description,
        embedding: img.embedding,
        score: img.score,
        Prompt: img.Prompt,
      }));

    if (imagesWithEmbeddings.length === 0) {
      return res.json([]);
    }

    const results = await imageServiceClient.searchByText(query, imagesWithEmbeddings, topK);

    const resultIds = results.map((r) => r.id);
    const fullImages = await Image.findAll({
      where: { id: resultIds },
      include: Prompt,
    });

    const imageMap = new Map(fullImages.map((img) => [img.id, img]));
    const sortedResults = results
      .map((r) => {
        const img = imageMap.get(r.id);
        if (img) {
          return {
            ...img.toJSON(),
            similarity: r.similarity,
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json(sortedResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/search-by-image', upload.single('image'), async (req, res) => {
  try {
    const { topK = 10 } = req.body;

    const images = await Image.findAll({ include: Prompt });
    const imagesWithEmbeddings = images
      .filter((img) => img.embedding)
      .map((img) => ({
        id: img.id,
        filename: img.filename,
        description: img.description,
        embedding: img.embedding,
        score: img.score,
      }));

    if (imagesWithEmbeddings.length === 0) {
      return res.json([]);
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const results = await imageServiceClient.searchByImage(
      fileBuffer,
      req.file.originalname,
      imagesWithEmbeddings,
      topK
    );

    fs.unlinkSync(req.file.path);

    const resultIds = results.map((r) => r.id);
    const fullImages = await Image.findAll({
      where: { id: resultIds },
      include: Prompt,
    });

    const imageMap = new Map(fullImages.map((img) => [img.id, img]));
    const sortedResults = results
      .map((r) => {
        const img = imageMap.get(r.id);
        if (img) {
          return {
            ...img.toJSON(),
            similarity: r.similarity,
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json(sortedResults);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/service/status', async (req, res) => {
  try {
    const isHealthy = await imageServiceClient.healthCheck();
    res.json({ status: isHealthy ? 'connected' : 'disconnected' });
  } catch (error) {
    res.json({ status: 'error', message: error.message });
  }
});

router.post('/batch-analyze', async (req, res) => {
  try {
    const { forceAll = false } = req.body;

    // 检查 uploads 目录
    if (!fs.existsSync(UPLOADS_DIR)) {
      return res.status(404).json({ error: 'Uploads directory not found' });
    }

    let imagesToAnalyze;
    if (forceAll) {
      imagesToAnalyze = await Image.findAll();
    } else {
      imagesToAnalyze = await Image.findAll({
        where: {
          description: null,
        },
      });
    }

    if (imagesToAnalyze.length === 0) {
      return res.json({
        total: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
        message: '没有需要分析的图片',
      });
    }

    // 使用数据库中存储的路径，过滤出存在的文件
    const imagePaths = imagesToAnalyze
      .filter((img) => img.path && fs.existsSync(img.path))
      .map((img) => img.path);

    const results = await imageServiceClient.batchProcessPaths(imagePaths);

    let updated = 0;
    let failed = 0;

    for (const result of results) {
      if (result.status === 'success') {
        try {
          const filename = path.basename(result.image_path);
          const image = await Image.findOne({ where: { filename } });

          if (image) {
            await image.update({
              description: result.description,
              embedding: result.embedding,
              embeddingModel: result.model,
              analyzedAt: new Date(),
            });
            if (DB_TYPE === 'postgres' && supportsVector()) {
              await saveEmbeddingVector(image.id, result.embedding);
            }
            // 同步写入 Qdrant 向量数据库
            try {
              await imageServiceClient.qdrantUpsert(image.id, result.embedding, {
                prompt_id: image.prompt_id,
                filename: image.filename,
                description: result.description,
              });
            } catch (qdrantError) {
              console.error('[Image] Qdrant 写入失败:', qdrantError.message);
            }
            updated++;
          }
        } catch (updateError) {
          console.error(`更新图片失败: ${result.image_path}`, updateError.message);
          failed++;
        }
      } else {
        failed++;
      }
    }

    res.json({
      total: results.length,
      updated,
      failed,
      skipped: imagesToAnalyze.length - imagePaths.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 混合检索 API
 * 结合关键词和语义搜索，返回重排序后的结果
 */
router.post('/search/hybrid', async (req, res) => {
  try {
    const {
      query,
      topK = 20,
      alpha = 0.7,
      minScore,
      maxScore,
      minSimilarity,
      themeIds,
      includeUnanalyzed = true,
    } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 优化查询
    const optimizedQuery = retrievalService.optimizeQuery(query);

    // 执行混合检索
    const results = await retrievalService.hybridSearch(optimizedQuery, {
      topK,
      alpha,
      minScore,
      maxScore,
      minSimilarity,
      themeIds,
      includeUnanalyzed,
    });

    res.json({
      query: optimizedQuery,
      originalQuery: query,
      totalResults: results.length,
      results,
    });
  } catch (error) {
    console.error('混合检索失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 查询扩展 API
 * 返回查询的扩展版本，用于提高召回率
 */
router.post('/search/expand', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const optimizedQuery = retrievalService.optimizeQuery(query);
    const expandedQueries = await retrievalService.expandQuery(optimizedQuery);

    res.json({
      originalQuery: query,
      optimizedQuery,
      expandedQueries,
    });
  } catch (error) {
    console.error('查询扩展失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 搜索建议 API
 * 基于部分输入提供搜索建议
 */
router.get('/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Op unused

    // 从描述中提取匹配的词作为建议
    const images = await Image.findAll({
      where: {
        description: {
          [Op.iLike]: `%${q}%`,
        },
      },
      attributes: ['description'],
      limit: 50,
    });

    // 提取匹配的短语
    const suggestions = new Set();
    images.forEach((img) => {
      if (img.description) {
        const words = img.description.split(/[，。、,.\s]+/);
        words.forEach((word) => {
          if (word.length >= 2 && word.toLowerCase().includes(q.toLowerCase())) {
            suggestions.add(word);
          }
        });
      }
    });

    // 从提示词中提取建议
    const prompts = await Prompt.findAll({
      where: {
        content: {
          [Op.iLike]: `%${q}%`,
        },
      },
      attributes: ['content'],
      limit: 20,
    });

    prompts.forEach((prompt) => {
      if (prompt.content) {
        const words = prompt.content.split(/\s+/);
        words.forEach((word) => {
          if (word.length >= 2 && word.toLowerCase().includes(q.toLowerCase())) {
            suggestions.add(word);
          }
        });
      }
    });

    res.json({
      suggestions: Array.from(suggestions).slice(0, 10),
    });
  } catch (error) {
    console.error('搜索建议失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate images from a text prompt
 * POST /api/images/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, n = 1, aspect_ratio = '1:1', model = 'image-01' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required and must be a string' });
    }

    if (n < 1 || n > 4) {
      return res.status(400).json({ error: 'n must be between 1 and 4' });
    }

    const result = await imageGenerationClient.generateImages(prompt, {
      n,
      aspect_ratio,
      model,
    });

    res.json({
      success: true,
      prompt: result.prompt,
      images: result.images.map((img) => ({
        url: img.url,
        localPath: img.localPath,
        filename: img.filename,
      })),
    });
  } catch (error) {
    console.error('[Image] Generation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
