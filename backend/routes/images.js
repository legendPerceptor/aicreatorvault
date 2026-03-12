const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Image, Prompt } = require('../models');
const imageServiceClient = require('../services/imageServiceClient');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './backend/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const image = await Image.create({
      filename: req.file.filename,
      path: req.file.path,
      promptId: req.body.promptId,
    });

    const projectRoot = path.resolve(__dirname, '..', '..');
    const absolutePath = path.join(projectRoot, 'backend', 'uploads', req.file.filename);

    try {
      const analysis = await imageServiceClient.analyzeImage(absolutePath);
      await image.update({
        description: analysis.description,
        embedding: analysis.embedding,
        embeddingModel: analysis.model,
        analyzedAt: new Date(),
      });
    } catch (analyzeError) {
      console.error('AI分析失败，但图片已保存:', analyzeError.message);
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
    await image.update({ promptId: req.body.promptId });
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

    const projectRoot = path.resolve(__dirname, '..', '..');
    const uploadsDir = path.join(projectRoot, 'backend', 'uploads');
    const filePath = path.join(uploadsDir, image.filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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

    const projectRoot = path.resolve(__dirname, '..', '..');
    const absolutePath = path.join(projectRoot, 'backend', 'uploads', image.filename);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const analysis = await imageServiceClient.analyzeImage(absolutePath);
    await image.update({
      description: analysis.description,
      embedding: analysis.embedding,
      embeddingModel: analysis.model,
      analyzedAt: new Date(),
    });

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
    const projectRoot = path.resolve(__dirname, '..', '..');
    const uploadsDir = path.join(projectRoot, 'backend', 'uploads');

    if (!fs.existsSync(uploadsDir)) {
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

    const imagePaths = imagesToAnalyze
      .map((img) => {
        const filePath = path.join(uploadsDir, img.filename);
        return filePath;
      })
      .filter((filePath) => fs.existsSync(filePath));

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

module.exports = router;
