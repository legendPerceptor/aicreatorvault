const { DataTypes } = require('sequelize');

const Image = (sequelize, dbType = 'sqlite') => {
  const isPostgres = dbType === 'postgres';

  const schema = {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'user_id',
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
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
      comment: 'AI生成的图片描述',
    },
    embedding: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '图片嵌入向量(JSON格式)',
      get() {
        const value = this.getDataValue('embedding');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('embedding', value ? JSON.stringify(value) : null);
      },
    },
    embedding_model: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '生成嵌入的模型名称',
      field: 'embedding_model', // 明确指定数据库列名
    },
    analyzed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'AI分析时间',
      field: 'analyzed_at', // 明确指定数据库列名
    },
    // 参考图搜索相关字段
    is_reference: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否为参考图（从网络下载）',
      field: 'is_reference', // 明确指定数据库列名
    },
    original_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '原始图片URL（参考图来源）',
      field: 'original_url', // 明确指定数据库列名
    },
    source_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '图片来源网站名称',
      field: 'source_name', // 明确指定数据库列名
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '图片标题',
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '图片宽度',
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '图片高度',
    },
    prompt_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Prompts',
        key: 'id',
      },
      field: 'prompt_id', // 明确指定数据库列名
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_public',
    },
  };

  const model = sequelize.define('Image', schema, {
    tableName: 'Images',
    underscored: true, // 确保使用 snake_case
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  if (isPostgres) {
    model.addHook('afterSync', async () => {
      try {
        await sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'Images' AND column_name = 'embedding_vector') THEN
              ALTER TABLE "Images" ADD COLUMN embedding_vector vector(1536);
            END IF;
          END $$;
        `);
        console.log('[Image Model] embedding_vector column ready (vector type)');
      } catch (err) {
        console.warn('[Image Model] Could not add embedding_vector column:', err.message);
      }
    });

    model.prototype.getEmbeddingVector = async function () {
      const result = await sequelize.query(`SELECT embedding_vector FROM "Images" WHERE id = :id`, {
        replacements: { id: this.id },
        type: sequelize.QueryTypes.SELECT,
      });
      return result[0]?.embedding_vector || null;
    };

    model.prototype.setEmbeddingVector = async function (value) {
      if (value && Array.isArray(value)) {
        const vectorStr = '[' + value.join(',') + ']';
        await sequelize.query(
          `UPDATE "Images" SET embedding_vector = :vector::vector WHERE id = :id`,
          { replacements: { vector: vectorStr, id: this.id } }
        );
      }
      return this;
    };
  }

  return model;
};

module.exports = Image;
