const { DataTypes } = require('sequelize');

const Resource = (sequelize, dbType = 'sqlite') => {
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
    resource_type: {
      type: DataTypes.ENUM('pdf', 'web_link', 'youtube', 'note', 'file'),
      allowNull: false,
      field: 'resource_type',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'file_path',
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: isPostgres ? DataTypes.JSONB : DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    embedding: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('embedding');
        if (value) {
          try {
            return JSON.parse(value);
          } catch (_e) {
            return null;
          }
        }
        return null;
      },
      set(value) {
        this.setDataValue('embedding', value ? JSON.stringify(value) : null);
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  };

  const model = sequelize.define('Resource', schema, {
    tableName: 'Resources',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['resource_type'] }, { fields: ['user_id'] }, { fields: ['created_at'] }],
  });

  return model;
};

module.exports = Resource;
