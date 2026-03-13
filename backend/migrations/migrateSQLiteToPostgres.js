const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Sequelize = require('sequelize');

console.log('[Migration] DB_TYPE:', process.env.DB_TYPE);
console.log('[Migration] DB_HOST:', process.env.DB_HOST);
console.log('[Migration] DB_USER:', process.env.DB_USER);
console.log('[Migration] DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'UNDEFINED');

// SQLite configuration
const sqliteConfig = {
  dialect: 'sqlite',
  storage: __dirname + '/../database.db',
  logging: false,
};

// PostgreSQL configuration
const postgresConfig = {
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'aigc_assistant',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  logging: false,
};

async function migrateSQLiteToPostgres() {
  console.log('[Migration] Starting SQLite to PostgreSQL migration...');

  const sqliteSequelize = new Sequelize(sqliteConfig);
  const postgresSequelize = new Sequelize(postgresConfig);

  try {
    // Connect to both databases
    await sqliteSequelize.authenticate();
    await postgresSequelize.authenticate();
    console.log('[Migration] Connected to both databases');

    // Import model factories
    const Prompt = require('../models/Prompt');
    const Image = require('../models/Image');
    const Theme = require('../models/Theme');
    const ThemeImage = require('../models/ThemeImage');
    const Asset = require('../models/Asset');
    const AssetRelationship = require('../models/AssetRelationship');

    // Create SQLite models
    const PromptLite = Prompt(sqliteSequelize);
    const ImageLite = Image(sqliteSequelize, 'sqlite');
    const ThemeLite = Theme(sqliteSequelize);
    const ThemeImageLite = ThemeImage(sqliteSequelize);
    const AssetLite = Asset(sqliteSequelize, 'sqlite');
    const AssetRelationshipLite = AssetRelationship(sqliteSequelize, 'sqlite');

    // Create PostgreSQL models
    const PromptPG = Prompt(postgresSequelize);
    const ImagePG = Image(postgresSequelize, 'postgres');
    const ThemePG = Theme(postgresSequelize);
    const ThemeImagePG = ThemeImage(postgresSequelize);
    const AssetModelPG = Asset(postgresSequelize, 'postgres');
    const AssetRelationshipModelPG = AssetRelationship(postgresSequelize, 'postgres');

    // Sync all models
    await PromptLite.sync();
    await ImageLite.sync();
    await ThemeLite.sync();
    await ThemeImageLite.sync();
    await AssetLite.sync();
    await AssetRelationshipLite.sync();

    await PromptPG.sync();
    await ImagePG.sync();
    await ThemePG.sync();
    await ThemeImagePG.sync();
    await AssetModelPG.sync();
    await AssetRelationshipModelPG.sync();

    console.log('[Migration] Models synced');

    // Step 1: Clear existing data in PostgreSQL to avoid conflicts
    console.log('[Migration] Clearing existing PostgreSQL data...');
    await postgresSequelize.query(`TRUNCATE TABLE "AssetRelationships" CASCADE`);
    await postgresSequelize.query(`TRUNCATE TABLE "Assets" CASCADE`);
    await postgresSequelize.query(`TRUNCATE TABLE "ThemeImages" CASCADE`);
    await postgresSequelize.query(`TRUNCATE TABLE "Themes" CASCADE`);
    await postgresSequelize.query(`TRUNCATE TABLE "Images" CASCADE`);
    await postgresSequelize.query(`TRUNCATE TABLE "Prompts" CASCADE`);
    console.log('[Migration] PostgreSQL tables cleared');

    // Step 2: Migrate Prompts
    console.log('[Migration] Migrating Prompts...');
    const promptsLite = await sqliteSequelize.query(`SELECT * FROM Prompts`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    for (const prompt of promptsLite) {
      await postgresSequelize.query(
        `INSERT INTO "Prompts" (id, content, type, score, "createdAt", "updatedAt")
         VALUES (:id, :content, :type, :score, :createdAt, :updatedAt)`,
        {
          replacements: {
            id: prompt.id,
            content: prompt.content,
            type: prompt.type || 'text2image',
            score: prompt.score,
            createdAt: prompt.createdAt,
            updatedAt: prompt.updatedAt || prompt.createdAt,
          },
        }
      );
    }
    console.log(`[Migration] Migrated ${promptsLite.length} Prompts`);

    // Step 3: Migrate Images
    console.log('[Migration] Migrating Images...');
    const imagesLite = await sqliteSequelize.query(`SELECT * FROM Images`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    for (const image of imagesLite) {
      await postgresSequelize.query(
        `INSERT INTO "Images" (id, filename, path, score, description, embedding, "embeddingModel", "analyzedAt", "promptId", "createdAt", "updatedAt")
         VALUES (:id, :filename, :path, :score, :description, :embedding::jsonb, :embeddingModel, :analyzedAt, :promptId, :createdAt, :updatedAt)`,
        {
          replacements: {
            id: image.id,
            filename: image.filename,
            path: image.path,
            score: image.score,
            description: image.description,
            embedding: image.embedding || null,
            embeddingModel: image.embeddingModel,
            analyzedAt: image.analyzedAt,
            promptId: image.promptId,
            createdAt: image.createdAt,
            updatedAt: image.createdAt,
          },
        }
      );
    }
    console.log(`[Migration] Migrated ${imagesLite.length} Images`);

    // Step 4: Migrate Themes
    console.log('[Migration] Migrating Themes...');
    const themesLite = await sqliteSequelize.query(`SELECT * FROM Themes`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    for (const theme of themesLite) {
      await postgresSequelize.query(
        `INSERT INTO "Themes" (id, name, description, "createdAt", "updatedAt")
         VALUES (:id, :name, :description, :createdAt, :updatedAt)`,
        {
          replacements: {
            id: theme.id,
            name: theme.name,
            description: theme.description,
            createdAt: theme.createdAt,
            updatedAt: theme.createdAt,
          },
        }
      );
    }
    console.log(`[Migration] Migrated ${themesLite.length} Themes`);

    // Step 5: Migrate ThemeImages
    console.log('[Migration] Migrating ThemeImages...');
    const themeImagesLite = await sqliteSequelize.query(`SELECT * FROM ThemeImages`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    for (const themeImage of themeImagesLite) {
      await postgresSequelize.query(
        `INSERT INTO "ThemeImages" (id, "themeId", "imageId", "createdAt", "updatedAt")
         VALUES (:id, :themeId, :imageId, :createdAt, :updatedAt)`,
        {
          replacements: {
            id: themeImage.id,
            themeId: themeImage.themeId,
            imageId: themeImage.imageId,
            createdAt: themeImage.createdAt,
            updatedAt: themeImage.createdAt,
          },
        }
      );
    }
    console.log(`[Migration] Migrated ${themeImagesLite.length} ThemeImages`);

    // Step 6: Migrate Assets
    console.log('[Migration] Migrating Assets...');
    const assetsLite = await sqliteSequelize.query(`SELECT * FROM Assets`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    for (const asset of assetsLite) {
      // Parse embedding if it's a string
      let embeddingValue = asset.embedding;
      if (typeof embeddingValue === 'string') {
        try {
          embeddingValue = JSON.parse(embeddingValue);
        } catch (e) {
          embeddingValue = null;
        }
      }

      // Convert embedding to vector if it's an array
      let embeddingVector = null;
      if (embeddingValue && Array.isArray(embeddingValue)) {
        embeddingVector = '[' + embeddingValue.join(',') + ']';
      }

      await postgresSequelize.query(
        `INSERT INTO "Assets"
         (id, "assetType", content, filename, path, score, description, metadata, embedding, "embeddingModel", "parentId", "derivedType", "analyzedAt", "createdAt", "updatedAt")
         VALUES
         (:id, :assetType, :content, :filename, :path, :score, :description, :metadata::jsonb, :embedding::jsonb, :embeddingModel, :parentId, :derivedType, :analyzedAt, :createdAt, :updatedAt)`,
        {
          replacements: {
            id: asset.id,
            assetType: asset.assetType,
            content: asset.content,
            filename: asset.filename,
            path: asset.path,
            score: asset.score,
            description: asset.description,
            metadata: typeof asset.metadata === 'string' ? asset.metadata : asset.metadata,
            embedding:
              typeof embeddingValue === 'string' ? embeddingValue : JSON.stringify(embeddingValue),
            embeddingModel: asset.embeddingModel,
            parentId: asset.parentId,
            derivedType: asset.derivedType,
            analyzedAt: asset.analyzedAt,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt || asset.createdAt,
          },
        }
      );

      // Update embedding_vector if pgvector is available
      if (embeddingVector) {
        try {
          await postgresSequelize.query(
            `UPDATE "Assets" SET "embeddingVector" = :vector::vector WHERE id = :id`,
            {
              replacements: {
                id: asset.id,
                vector: embeddingVector,
              },
            }
          );
        } catch (e) {
          // pgvector might not be available, skip
        }
      }
    }
    console.log(`[Migration] Migrated ${assetsLite.length} Assets`);

    // Step 7: Migrate AssetRelationships
    console.log('[Migration] Migrating AssetRelationships...');
    const relationshipsLite = await sqliteSequelize.query(`SELECT * FROM AssetRelationships`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    for (const rel of relationshipsLite) {
      await postgresSequelize.query(
        `INSERT INTO "AssetRelationships" (id, "sourceId", "targetId", "relationshipType", properties, "createdAt", "updatedAt")
         VALUES (:id, :sourceId, :targetId, :relationshipType, :properties::jsonb, :createdAt, :updatedAt)`,
        {
          replacements: {
            id: rel.id,
            sourceId: rel.sourceId,
            targetId: rel.targetId,
            relationshipType: rel.relationshipType,
            properties: typeof rel.properties === 'string' ? rel.properties : rel.properties,
            createdAt: rel.createdAt,
            updatedAt: rel.createdAt,
          },
        }
      );
    }
    console.log(`[Migration] Migrated ${relationshipsLite.length} AssetRelationships`);

    // Reset sequences (optional - skip if sequences don't exist)
    console.log('[Migration] Resetting sequences...');
    try {
      const sequences = await postgresSequelize.query(
        `SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'`,
        {
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      for (const seq of sequences) {
        const tableName = seq.sequencename.replace('_id_seq', '');
        try {
          await postgresSequelize.query(
            `SELECT setval('${seq.sequencename}', (SELECT COALESCE(MAX(id), 1) FROM "${tableName}"))`
          );
        } catch (e) {
          console.log(`[Migration] Could not reset sequence ${seq.sequencename}: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`[Migration] Could not reset sequences: ${e.message}`);
    }

    console.log('[Migration] Migration completed successfully!');
    console.log('[Migration] Summary:');
    console.log(`  - Prompts: ${promptsLite.length}`);
    console.log(`  - Images: ${imagesLite.length}`);
    console.log(`  - Themes: ${themesLite.length}`);
    console.log(`  - ThemeImages: ${themeImagesLite.length}`);
    console.log(`  - Assets: ${assetsLite.length}`);
    console.log(`  - AssetRelationships: ${relationshipsLite.length}`);
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    throw error;
  } finally {
    await sqliteSequelize.close();
    await postgresSequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSQLiteToPostgres()
    .then(() => {
      console.log('[Migration] Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateSQLiteToPostgres;
