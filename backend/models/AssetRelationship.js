const { DataTypes } = require('sequelize');

const POSTGRES_LIKE_DIALECTS = ['postgres', 'opengauss'];

const AssetRelationship = (sequelize, dbType = 'sqlite') => {
  const isPostgresLike = POSTGRES_LIKE_DIALECTS.includes(dbType);

  const schema = {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    source_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Source asset ID',
      field: 'source_id',
      references: {
        model: 'Assets',
        key: 'id',
      },
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Target asset ID',
      field: 'target_id',
      references: {
        model: 'Assets',
        key: 'id',
      },
    },
    relationship_type: {
      type: DataTypes.ENUM('generated', 'derived_from', 'version_of', 'inspired_by'),
      allowNull: false,
      comment: 'Type of relationship between assets',
      field: 'relationship_type',
    },
    properties: {
      type: isPostgresLike ? DataTypes.JSONB : DataTypes.JSON,
      allowNull: true,
      comment: 'Relationship metadata (edit timestamp, similarity score, etc.)',
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  };

  const model = sequelize.define('AssetRelationship', schema, {
    tableName: 'AssetRelationships',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['source_id'] },
      { fields: ['target_id'] },
      { fields: ['relationship_type'] },
      {
        unique: true,
        fields: ['source_id', 'target_id', 'relationship_type'],
        name: 'unique_relationship',
      },
    ],
  });

  return model;
};

module.exports = AssetRelationship;
