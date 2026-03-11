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
    // 重新查询图片信息，包含关联的提示词
    const imageWithPrompt = await Image.findByPk(image.id, { include: Prompt });
    res.json(imageWithPrompt);
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
    // 重新查询图片信息，包含关联的提示词
    const imageWithPrompt = await Image.findByPk(image.id, { include: Prompt });
    res.json(imageWithPrompt);
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
    // 使用绝对路径构建文件路径
    const projectRoot = path.resolve(__dirname, '..', '..');
    const uploadsDir = path.join(projectRoot, 'backend', 'uploads');
    console.log('项目根目录:', projectRoot);
    console.log('上传目录:', uploadsDir);
    console.log('图片文件名:', image.filename);
    const filePath = path.join(uploadsDir, image.filename);
    console.log('删除文件的绝对路径:', filePath);
    
    // 检查上传目录是否存在
    if (fs.existsSync(uploadsDir)) {
      console.log('上传目录存在');
      // 列出上传目录中的文件
      const files = fs.readdirSync(uploadsDir);
      console.log('上传目录中的文件:', files);
      // 检查文件是否存在
      if (fs.existsSync(filePath)) {
        console.log('文件存在，准备删除');
        try {
          fs.unlinkSync(filePath);
          console.log('文件删除成功:', filePath);
        } catch (error) {
          console.error('删除文件失败:', error);
        }
      } else {
        console.log('文件不存在:', filePath);
      }
    } else {
      console.log('上传目录不存在:', uploadsDir);
    }
    
    // 从数据库中删除记录
    await image.destroy();
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;