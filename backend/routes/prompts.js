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

module.exports = router;