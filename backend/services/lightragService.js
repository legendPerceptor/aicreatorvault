const imageServiceClient = require('./imageServiceClient');
const { Image, Prompt, Asset } = require('../models');

class LightRAGService {
  /**
   * Index an image (with its prompt if available) into LightRAG.
   * Called after image analysis is complete.
   */
  async indexImage(imageId) {
    const image = await Image.findByPk(imageId, { include: Prompt });
    if (!image || !image.description) return null;

    const content = this._buildImageContent(image);
    const metadata = {
      filename: image.filename,
      score: image.score,
    };
    if (image.Prompt) {
      metadata.prompt = image.Prompt.content;
    }

    return await imageServiceClient.lightragIndex(content, image.id, 'image', metadata);
  }

  /**
   * Index a prompt into LightRAG.
   * Called after prompt creation.
   */
  async indexPrompt(promptId) {
    const prompt = await Prompt.findByPk(promptId);
    if (!prompt) return null;

    const content = `[PROMPT] ${prompt.content}`;
    const metadata = {
      type: prompt.type || 'text2image',
      score: prompt.score,
    };

    return await imageServiceClient.lightragIndex(content, prompt.id, 'prompt', metadata);
  }

  /**
   * Delete an indexed document from LightRAG.
   */
  async deleteIndex(docId) {
    return await imageServiceClient.lightragDelete(String(docId));
  }

  /**
   * Smart search via LightRAG knowledge graph.
   */
  async smartSearch(query, options = {}) {
    const { mode = 'hybrid', onlyNeedContext = false } = options;
    return await imageServiceClient.lightragQuery(query, mode, onlyNeedContext);
  }

  /**
   * Backfill existing assets into LightRAG.
   */
  async backfillAssets(userId, options = {}) {
    const assets = await Asset.findAll({
      where: { user_id: userId },
      limit: options.limit || 100,
    });

    const items = assets
      .filter((a) => a.content || a.description)
      .map((a) => ({
        content: a.content || a.description,
        asset_id: String(a.id),
        asset_type: a.asset_type,
        metadata: {
          score: a.score,
          filename: a.filename,
        },
      }));

    if (items.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, results: [] };
    }

    return await imageServiceClient.lightragBatchIndex(items);
  }

  _buildImageContent(image) {
    const parts = ['[IMAGE]'];
    if (image.description) parts.push(`Description: ${image.description}`);
    if (image.Prompt && image.Prompt.content) {
      parts.push(`Generated with prompt: ${image.Prompt.content}`);
    }
    if (image.score != null) parts.push(`Rating: ${image.score}/10`);
    return parts.join('\n');
  }
}

module.exports = new LightRAGService();
