const express = require('express');
const router = express.Router();
const { Prompt, Image, Asset, AssetRelationship } = require('../models');
const { Op } = require('sequelize');

// 获取所有提示词
router.get('/', async (req, res) => {
  try {
    // 获取所有提示词，包括关联的图片，按最新排序
    const prompts = await Prompt.findAll({
      include: Image,
      order: [['created_at', 'DESC']],
    });
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 根据内容精确查找提示词（用于去重检查）
router.get('/find', async (req, res) => {
  try {
    const { content } = req.query;

    if (!content) {
      return res.status(400).json({ error: 'content parameter is required' });
    }

    const prompt = await Prompt.findOne({
      where: { content },
      include: Image,
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取未被使用的提示词
router.get('/unused', async (req, res) => {
  try {
    // 获取所有提示词，包括关联的图片，按最新排序
    const prompts = await Prompt.findAll({
      include: Image,
      order: [['created_at', 'DESC']],
    });
    // 过滤出没有关联图片的提示词
    const unusedPrompts = prompts.filter((prompt) => !prompt.Images || prompt.Images.length === 0);
    res.json(unusedPrompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新提示词
router.post('/', async (req, res) => {
  try {
    const { content } = req.body;

    // 检查是否已存在相同内容的提示词
    if (content) {
      const existingPrompt = await Prompt.findOne({
        where: { content },
      });

      if (existingPrompt) {
        return res.status(409).json({
          error: 'Prompt already exists',
          existingPrompt: {
            id: existingPrompt.id,
            content: existingPrompt.content,
            score: existingPrompt.score,
          },
        });
      }
    }

    const prompt = await Prompt.create(req.body);

    // 自动同步到 Asset 表（知识图谱）
    try {
      const asset = await Asset.create({
        asset_type: 'prompt',
        content: prompt.content,
        score: prompt.score,
        metadata: {
          legacy_prompt_id: prompt.id,
          type: prompt.type || 'text2image',
        },
      });

      console.log(`[Prompt] Created Asset #${asset.id} for Prompt #${prompt.id}`);
    } catch (assetError) {
      console.error('[Prompt] Failed to create Asset:', assetError.message);
      // 不影响主流程，只记录错误
    }

    res.status(201).json(prompt);
  } catch (error) {
    // 处理数据库唯一约束冲突
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Prompt with this content already exists',
      });
    }
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
    // 重新查询提示词信息，包含关联的图片
    const updatedPrompt = await Prompt.findByPk(req.params.id, { include: Image });
    res.json(updatedPrompt);
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

    const deleteImages = req.query.deleteImages === 'true';

    if (deleteImages) {
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
    } else {
      // 仅删除提示词，将关联图片的promptId设置为null
      const images = await prompt.getImages();
      for (const image of images) {
        await image.update({ promptId: null });
      }
    }

    // 删除关联的 Asset（知识图谱）
    try {
      const asset = await Asset.findOne({
        where: {
          asset_type: 'prompt',
          metadata: {
            legacy_prompt_id: prompt.id,
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
        console.log(`[Prompt] Deleted Asset #${asset.id} for Prompt #${prompt.id}`);
      }
    } catch (assetError) {
      console.error('[Prompt] Failed to delete Asset:', assetError.message);
      // 不影响主流程
    }

    // 从数据库中删除提示词记录
    await prompt.destroy();
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
