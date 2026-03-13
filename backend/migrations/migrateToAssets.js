const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize, Prompt, Image, Asset, AssetRelationship } = require('../models');

async function migrateToAssets() {
  console.log('[Migration] Starting migration to Assets model...');

  try {
    // Ensure tables exist
    await sequelize.sync();
    console.log('[Migration] Database synchronized');

    // Check if migration has already been run
    const existingAssets = await Asset.count();
    if (existingAssets > 0) {
      console.log(`[Migration] Found ${existingAssets} existing assets. Skipping migration.`);
      return;
    }

    // Migrate Prompts to Assets
    console.log('[Migration] Migrating Prompts...');
    const prompts = await Prompt.findAll();

    for (const prompt of prompts) {
      await Asset.create({
        assetType: 'prompt',
        content: prompt.content,
        score: prompt.score,
        description: null,
        metadata: {
          legacyPromptId: prompt.id,
          type: prompt.type || 'text2image',
        },
        createdAt: prompt.createdAt,
        updatedAt: prompt.updatedAt || prompt.createdAt,
      });
    }

    console.log(`[Migration] Migrated ${prompts.length} prompts to Assets`);

    // Migrate Images to Assets
    console.log('[Migration] Migrating Images...');
    const images = await Image.findAll();
    const promptIdToAssetId = new Map();

    // Build a map of prompt IDs to asset IDs
    const promptAssets = await Asset.findAll({
      where: { assetType: 'prompt' },
    });

    for (const promptAsset of promptAssets) {
      const legacyPromptId = promptAsset.metadata?.legacyPromptId;
      if (legacyPromptId) {
        promptIdToAssetId.set(legacyPromptId, promptAsset.id);
      }
    }

    for (const image of images) {
      const asset = await Asset.create({
        assetType: 'image',
        filename: image.filename,
        path: image.path,
        score: image.score,
        description: image.description,
        metadata: {
          legacyImageId: image.id,
        },
        embedding: image.embedding,
        embeddingModel: image.embeddingModel,
        analyzedAt: image.analyzedAt,
        createdAt: image.createdAt,
      });

      // If the image has a promptId, create a GENERATED relationship
      if (image.promptId && promptIdToAssetId.has(image.promptId)) {
        const promptAssetId = promptIdToAssetId.get(image.promptId);
        await AssetRelationship.create({
          sourceId: promptAssetId,
          targetId: asset.id,
          relationshipType: 'generated',
          properties: {
            legacyRelationship: true,
            createdAt: image.createdAt,
          },
        });
      }
    }

    console.log(`[Migration] Migrated ${images.length} images to Assets`);

    // Count created relationships
    const relationshipCount = await AssetRelationship.count();
    console.log(`[Migration] Created ${relationshipCount} relationships`);

    console.log('[Migration] Migration completed successfully!');
    console.log('[Migration] Summary:');
    console.log(`  - Prompts migrated: ${prompts.length}`);
    console.log(`  - Images migrated: ${images.length}`);
    console.log(`  - Relationships created: ${relationshipCount}`);
    console.log(
      '[Migration] NOTE: Original Prompt and Image tables are preserved for backward compatibility'
    );
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToAssets()
    .then(() => {
      console.log('[Migration] Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateToAssets;
