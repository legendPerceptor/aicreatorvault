const { DataTypes } = require('sequelize');

const Asset = (sequelize, dbType = 'sqlite') => {
  const isPostgres = dbType === 'postgres';

  const schema = {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    assetType: {
      type: DataTypes.ENUM('prompt', 'image', 'derived_image'),
      allowNull: false,
      comment: 'Type of asset: prompt, original image, or derived image',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Prompt text (for prompts)',
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'File filename (for images)',
    },
    path: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'File path (for images)',
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 10,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'AI-generated description or user notes',
    },
    metadata: {
      type: isPostgres ? DataTypes.JSONB : DataTypes.JSON,
      allowNull: true,
      comment: 'Type-specific metadata (dimensions, edit type, etc.)',
      defaultValue: {},
    },
    embedding: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Embedding vector (JSON format)',
      get() {
        const value = this.getDataValue('embedding');
        if (value) {
          try {
            return JSON.parse(value);
          } catch (e) {
            return null;
          }
        }
        return null;
      },
      set(value) {
        this.setDataValue('embedding', value ? JSON.stringify(value) : null);
      },
    },
    embeddingVector: {
      type: isPostgres ? DataTypes.TEXT : DataTypes.TEXT,
      allowNull: true,
      comment: 'Vector type for PostgreSQL with pgvector',
    },
    embeddingModel: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Model used to generate embedding',
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Parent asset for derived versions',
      references: {
        model: 'Assets',
        key: 'id',
      },
    },
    derivedType: {
      type: DataTypes.ENUM('edit', 'variant', 'upscale', 'crop'),
      allowNull: true,
      comment: 'Type of derivation for derived_image assets',
    },
    analyzedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'AI analysis timestamp',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  };

  const model = sequelize.define('Asset', schema, {
    indexes: [
      { fields: ['assetType'] },
      { fields: ['parentId'] },
      { fields: ['derivedType'] },
      { fields: ['createdAt'] },
    ],
  });

  // PostgreSQL-specific: Add vector column support
  if (isPostgres) {
    model.addHook('afterSync', async () => {
      try {
        // Check if pgvector is available
        const vectorCheck = await sequelize.query(
          `
          SELECT 1 FROM pg_extension WHERE extname = 'vector';
        `,
          { type: sequelize.QueryTypes.SELECT }
        );

        if (vectorCheck.length > 0) {
          await sequelize.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                             WHERE table_name = 'Assets' AND column_name = 'embedding_vector') THEN
                ALTER TABLE "Assets" ADD COLUMN embedding_vector vector(1536);
              END IF;
            END $$;
          `);
          console.log('[Asset Model] embedding_vector column ready (vector type)');
        } else {
          console.log('[Asset Model] pgvector not available, using JSON for embeddings');
        }
      } catch (err) {
        console.warn('[Asset Model] Could not add embedding_vector column:', err.message);
      }
    });

    model.prototype.getEmbeddingVector = async function () {
      const result = await sequelize.query(`SELECT embedding_vector FROM "Assets" WHERE id = :id`, {
        replacements: { id: this.id },
        type: sequelize.QueryTypes.SELECT,
      });
      return result[0]?.embedding_vector || null;
    };

    model.prototype.setEmbeddingVector = async function (value) {
      if (value && Array.isArray(value)) {
        const vectorStr = '[' + value.join(',') + ']';
        await sequelize.query(
          `UPDATE "Assets" SET embedding_vector = :vector::vector WHERE id = :id`,
          { replacements: { vector: vectorStr, id: this.id } }
        );
      }
      return this;
    };
  }

  return model;
};

module.exports = Asset;
