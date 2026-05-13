const express = require('express');
const router = express.Router();
const { Theme, Image, ThemeImage } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const graphSyncService = require('../services/graphSyncService');

// 获取所有主题
router.get('/', optionalAuth, async (req, res) => {
  try {
    const where = {};

    // Filter by user or public
    if (req.user) {
      where.user_id = req.user.id;
    } else {
      where.is_public = true;
    }

    const themes = await Theme.findAll({
      where,
      include: Image,
    });
    res.json(themes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新主题
router.post('/', authenticate, async (req, res) => {
  try {
    const theme = await Theme.create({
      ...req.body,
      user_id: req.user.id,
    });

    // 同步到知识图谱
    try {
      await graphSyncService.syncCreateEntity('theme', theme.id, req.user.id);
    } catch (graphError) {
      console.error('[Theme] Graph sync failed:', graphError.message);
    }

    res.json(theme);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除主题
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const theme = await Theme.findByPk(req.params.id);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    if (theme.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 删除关联的 ThemeImage 记录
    await ThemeImage.destroy({ where: { themeId: theme.id } });

    // 删除关联的知识图谱节点
    try {
      await graphSyncService.syncDeleteEntity('theme', theme.id);
    } catch (graphError) {
      console.error('[Theme] Graph sync delete failed:', graphError.message);
    }

    await theme.destroy();
    res.json({ message: 'Theme deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 为主题添加图片
router.post('/:id/images', authenticate, async (req, res) => {
  try {
    const theme = await Theme.findByPk(req.params.id);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    // Check ownership
    if (theme.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const themeImage = await ThemeImage.create({
      themeId: req.params.id,
      imageId: req.body.imageId,
    });

    // 同步到知识图谱
    try {
      await graphSyncService.syncThemeImage(req.params.id, req.body.imageId, 'add');
    } catch (graphError) {
      console.error('[Theme] Graph sync failed:', graphError.message);
    }

    res.json(themeImage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取主题的所有图片
router.get('/:id/images', optionalAuth, async (req, res) => {
  try {
    const theme = await Theme.findByPk(req.params.id, { include: Image });
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    // Check access
    if (!req.user && !theme.is_public) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user && theme.user_id !== req.user.id && !theme.is_public) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(theme.Images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 从主题中移除图片
router.delete('/:id/images/:imageId', authenticate, async (req, res) => {
  try {
    const theme = await Theme.findByPk(req.params.id);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    // Check ownership
    if (theme.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

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

    // 同步到知识图谱
    try {
      await graphSyncService.syncThemeImage(req.params.id, req.params.imageId, 'remove');
    } catch (graphError) {
      console.error('[Theme] Graph sync failed:', graphError.message);
    }

    res.json({ message: 'Image removed from theme successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
