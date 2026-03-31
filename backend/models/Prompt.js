const { DataTypes } = require('sequelize');

const Prompt = (sequelize) => {
  return sequelize.define(
    'Prompt',
    {
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
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true, // 添加唯一约束，防止重复提示词
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false, // 'text2image' or 'image2image'
        defaultValue: 'text2image',
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 10,
        },
      },
      is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_public',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      tableName: 'Prompts',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['content'],
          name: 'prompts_content_unique',
        },
        {
          fields: ['user_id'],
          name: 'prompts_user_id_index',
        },
        {
          fields: ['is_public'],
          name: 'prompts_is_public_index',
        },
      ],
    }
  );
};

module.exports = Prompt;
