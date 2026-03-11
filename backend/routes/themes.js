const express = require('express');
const router = express.Router();
const { Theme, Image, ThemeImage } = require('../models');

// 获取所有主题
router.get('/', async (req, res) => {
  try {
    const themes = await Theme.findAll({ include: Image });
    res.json(themes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新主题
router.post('/', async (req, res) => {
  try {
    const theme = await Theme.create(req.body);
    res.json(theme);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 为主题添加图片
router.post('/:id/images', async (req, res) => {
  try {
    const themeImage = await ThemeImage.create({
      themeId: req.params.id,
      imageId: req.body.imageId,
    });
    res.json(themeImage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取主题的所有图片
router.get('/:id/images', async (req, res) => {
  try {
    const theme = await Theme.findByPk(req.params.id, { include: Image });
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    res.json(theme.Images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 从主题中移除图片
router.delete('/:id/images/:imageId', async (req, res) => {
  try {
    const themeImage = await ThemeImage.findOne({
      where: {
        themeId: req.params.id,
        imageId: req.params.imageId,
      },
    });
    if (!themeImage) {
      return res.status(404).json({ error: 'ThemeImage not found' });
    }
    await themeImage.destroy();
    res.json({ message: 'Image removed from theme successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
