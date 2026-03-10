const express = require('express');
const router = express.Router();
const { Prompt, Image } = require('../models');

// 获取所有提示词
router.get('/', async (req, res) => {
  try {
    const prompts = await Prompt.findAll({ include: Image });
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新提示词
router.post('/', async (req, res) => {
  try {
    const prompt = await Prompt.create(req.body);
    res.json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新提示词评分
router.put('/:id/score', async (req, res) => {
  try {
    const prompt = await Prompt.findByPk(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    await prompt.update({ score: req.body.score });
    res.json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除提示词
router.delete('/:id', async (req, res) => {
  try {
    const prompt = await Prompt.findByPk(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    // 删除关联的图片
    const images = await prompt.getImages();
    const fs = require('fs');
    const path = require('path');
    
    for (const image of images) {
      // 从文件系统中删除文件
      const filePath = path.join(__dirname, '..', image.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      // 从数据库中删除图片记录
      await image.destroy();
    }
    
    // 从数据库中删除提示词记录
    await prompt.destroy();
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;