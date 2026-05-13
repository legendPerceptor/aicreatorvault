/**
 * Migration: Rebuild knowledge graph using GraphNode/GraphEdge
 *
 * Reads all Prompts, Images, Themes from the entity tables
 * and creates lightweight GraphNode references + GraphEdge relationships.
 *
 * Safe to run multiple times (idempotent).
 */

require('dotenv').config({ path: __dirname + '/../../.env' });

const { sequelize, Prompt, Image, Theme, ThemeImage, GraphNode, GraphEdge } = require('../models');

async function migrate() {
  console.log('[Migration] Starting GraphNode migration...');

  try {
    await sequelize.authenticate();
    console.log('[Migration] Database connected');

    await sequelize.sync({ force: false });
    console.log('[Migration] Tables synced');

    // Check if already migrated
    const existingCount = await GraphNode.count();
    if (existingCount > 0) {
      console.log(`[Migration] ${existingCount} GraphNodes already exist. Clearing for rebuild...`);
      await GraphEdge.destroy({ where: {} });
      await GraphNode.destroy({ where: {} });
      console.log('[Migration] Cleared existing graph data');
    }

    // 1. Migrate Prompts
    const prompts = await Prompt.findAll();
    console.log(`[Migration] Found ${prompts.length} prompts`);
    for (const p of prompts) {
      await GraphNode.create({
        user_id: p.user_id || 1,
        entity_type: 'prompt',
        entity_id: p.id,
      });
    }

    // 2. Migrate Images
    const images = await Image.findAll();
    console.log(`[Migration] Found ${images.length} images`);
    for (const img of images) {
      await GraphNode.create({
        user_id: img.user_id || 1,
        entity_type: 'image',
        entity_id: img.id,
      });
    }

    // 3. Migrate Themes
    const themes = await Theme.findAll();
    console.log(`[Migration] Found ${themes.length} themes`);
    for (const t of themes) {
      await GraphNode.create({
        user_id: t.user_id || 1,
        entity_type: 'theme',
        entity_id: t.id,
      });
    }

    // 4. Create generated edges (prompt -> image)
    let generatedCount = 0;
    const imagesWithPrompt = images.filter((img) => img.promptId || img.prompt_id);
    for (const img of imagesWithPrompt) {
      const promptId = img.promptId || img.prompt_id;
      const promptNode = await GraphNode.findOne({
        where: { entity_type: 'prompt', entity_id: promptId },
      });
      const imageNode = await GraphNode.findOne({
        where: { entity_type: 'image', entity_id: img.id },
      });
      if (promptNode && imageNode) {
        await GraphEdge.create({
          user_id: promptNode.user_id,
          source_id: promptNode.id,
          target_id: imageNode.id,
          relationship_type: 'generated',
          properties: {},
        });
        generatedCount++;
      }
    }
    console.log(`[Migration] Created ${generatedCount} generated edges`);

    // 5. Create contains edges (theme -> image)
    const themeImages = await ThemeImage.findAll();
    let containsCount = 0;
    for (const ti of themeImages) {
      const themeNode = await GraphNode.findOne({
        where: { entity_type: 'theme', entity_id: ti.themeId },
      });
      const imageNode = await GraphNode.findOne({
        where: { entity_type: 'image', entity_id: ti.imageId },
      });
      if (themeNode && imageNode) {
        await GraphEdge.create({
          user_id: themeNode.user_id,
          source_id: themeNode.id,
          target_id: imageNode.id,
          relationship_type: 'contains',
          properties: {},
        });
        containsCount++;
      }
    }
    console.log(`[Migration] Created ${containsCount} contains edges`);

    // Summary
    const totalNodes = await GraphNode.count();
    const totalEdges = await GraphEdge.count();
    console.log(`[Migration] Done! Created ${totalNodes} nodes and ${totalEdges} edges`);

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

migrate();
