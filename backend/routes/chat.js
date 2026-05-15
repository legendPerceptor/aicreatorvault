const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const chatService = require('../services/chatService');
const { getAvailableProviders } = require('../services/llmProviders');

// GET /providers — List available LLM providers
router.get('/providers', authenticate, (_req, res) => {
  try {
    res.json(getAvailableProviders());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / — Send message, receive SSE stream
router.post('/', authenticate, async (req, res) => {
  const { resourceId = 'default', message, nodes = [], provider = 'minimax', model } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    const stream = chatService.streamChat(
      req.user.id,
      resourceId,
      message.trim(),
      nodes,
      provider,
      model
    );
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('[Chat] Stream error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  }

  res.end();
});

// GET /history — Load chat history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { resourceId = 'default', limit = 50 } = req.query;
    const messages = await chatService.getHistory(req.user.id, resourceId, parseInt(limit));
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /history — Clear chat history
router.delete('/history', authenticate, async (req, res) => {
  try {
    const { resourceId = 'default' } = req.query;
    await chatService.clearHistory(req.user.id, resourceId);
    res.json({ message: 'History cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
