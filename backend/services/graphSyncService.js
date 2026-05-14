const { GraphNode, GraphEdge, Image, Prompt, Theme, ThemeImage, Resource } = require('../models');
const { Op } = require('sequelize');

class GraphSyncService {
  async syncCreateEntity(entityType, entityId, userId) {
    const [node, created] = await GraphNode.findOrCreate({
      where: { entity_type: entityType, entity_id: entityId },
      defaults: { user_id: userId, entity_type: entityType, entity_id: entityId },
    });

    if (!created) {
      return node;
    }

    if (entityType === 'image') {
      const image = await Image.findByPk(entityId);
      if (image && image.prompt_id) {
        await this.syncPromptImage(entityId, image.prompt_id, 'add');
      }
      // Create contains edges for existing theme associations
      const themeImages = await ThemeImage.findAll({ where: { imageId: entityId } });
      for (const ti of themeImages) {
        await this.syncThemeImage(ti.themeId, entityId, 'add');
      }
    }

    if (entityType === 'theme') {
      const themeImages = await ThemeImage.findAll({ where: { themeId: entityId } });
      for (const ti of themeImages) {
        await this.syncThemeImage(entityId, ti.imageId, 'add');
      }
    }

    return node;
  }

  async syncDeleteEntity(entityType, entityId) {
    const node = await GraphNode.findOne({
      where: { entity_type: entityType, entity_id: entityId },
    });
    if (!node) return;

    await GraphEdge.destroy({
      where: {
        [Op.or]: [{ source_id: node.id }, { target_id: node.id }],
      },
    });

    await node.destroy();
  }

  async syncThemeImage(themeId, imageId, action) {
    const themeNode = await GraphNode.findOne({
      where: { entity_type: 'theme', entity_id: themeId },
    });
    const imageNode = await GraphNode.findOne({
      where: { entity_type: 'image', entity_id: imageId },
    });

    if (!themeNode || !imageNode) return;

    if (action === 'add') {
      await GraphEdge.findOrCreate({
        where: {
          source_id: themeNode.id,
          target_id: imageNode.id,
          relationship_type: 'contains',
        },
        defaults: {
          user_id: themeNode.user_id,
          source_id: themeNode.id,
          target_id: imageNode.id,
          relationship_type: 'contains',
          properties: {},
        },
      });
    } else if (action === 'remove') {
      await GraphEdge.destroy({
        where: {
          source_id: themeNode.id,
          target_id: imageNode.id,
          relationship_type: 'contains',
        },
      });
    }
  }

  async syncPromptImage(imageId, promptId, action) {
    const promptNode = await GraphNode.findOne({
      where: { entity_type: 'prompt', entity_id: promptId },
    });
    const imageNode = await GraphNode.findOne({
      where: { entity_type: 'image', entity_id: imageId },
    });

    if (!promptNode || !imageNode) return;

    if (action === 'add') {
      await GraphEdge.findOrCreate({
        where: {
          source_id: promptNode.id,
          target_id: imageNode.id,
          relationship_type: 'generated',
        },
        defaults: {
          user_id: promptNode.user_id,
          source_id: promptNode.id,
          target_id: imageNode.id,
          relationship_type: 'generated',
          properties: {},
        },
      });
    } else if (action === 'remove') {
      await GraphEdge.destroy({
        where: {
          source_id: promptNode.id,
          target_id: imageNode.id,
          relationship_type: 'generated',
        },
      });
    }
  }

  async fullRebuild(userId) {
    // Remove existing graph data for this user
    const existingNodes = await GraphNode.findAll({ where: { user_id: userId } });
    const nodeIds = existingNodes.map((n) => n.id);

    if (nodeIds.length > 0) {
      await GraphEdge.destroy({
        where: {
          [Op.or]: [{ source_id: { [Op.in]: nodeIds } }, { target_id: { [Op.in]: nodeIds } }],
        },
      });
      await GraphNode.destroy({ where: { user_id: userId } });
    }

    // Rebuild from prompts
    const prompts = await Prompt.findAll({
      where: userId ? { user_id: userId } : {},
    });
    for (const p of prompts) {
      await GraphNode.create({
        user_id: p.user_id || userId,
        entity_type: 'prompt',
        entity_id: p.id,
      });
    }

    // Rebuild from images
    const images = await Image.findAll({
      where: userId ? { user_id: userId } : {},
    });
    for (const img of images) {
      await GraphNode.create({
        user_id: img.user_id || userId,
        entity_type: 'image',
        entity_id: img.id,
      });
    }

    // Rebuild from themes
    const themes = await Theme.findAll({
      where: userId ? { user_id: userId } : {},
    });
    for (const t of themes) {
      await GraphNode.create({
        user_id: t.user_id || userId,
        entity_type: 'theme',
        entity_id: t.id,
      });
    }

    // Create generated edges from prompt→image
    for (const img of images) {
      if (img.prompt_id) {
        await this.syncPromptImage(img.id, img.prompt_id, 'add');
      }
    }

    // Rebuild from resources
    const resources = await Resource.findAll({
      where: userId ? { user_id: userId } : {},
    });
    for (const r of resources) {
      await GraphNode.create({
        user_id: r.user_id || userId,
        entity_type: 'resource',
        entity_id: r.id,
      });
    }

    // Create contains edges from theme→image
    const allThemeImages = await ThemeImage.findAll();
    for (const ti of allThemeImages) {
      await this.syncThemeImage(ti.themeId, ti.imageId, 'add');
    }

    return {
      nodes: prompts.length + images.length + themes.length + resources.length,
      edges: images.filter((i) => i.prompt_id).length + allThemeImages.length,
    };
  }
}

module.exports = new GraphSyncService();
