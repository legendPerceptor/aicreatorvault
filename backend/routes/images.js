const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Image, Prompt } = require('../models');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './backend/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// 上传图片
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const image = await Image.create({
      filename: req.file.filename,
      path: req.file.path,
      promptId: req.body.promptId
    });
    res.json(image);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取所有图片
router.get('/', async (req, res) => {
  try {
    const images = await Image.findAll({ include: Prompt });
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新图片评分
router.put('/:id/score', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    await image.update({ score: req.body.score });
    res.json(image);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除图片
router.delete('/:id', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // 从文件系统中删除文件
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', image.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // 从数据库中删除记录
    await image.destroy();
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;