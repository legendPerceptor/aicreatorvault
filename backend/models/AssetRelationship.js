const { DataTypes } = require('sequelize');

const AssetRelationship = (sequelize, dbType = 'sqlite') => {
  const isPostgres = dbType === 'postgres';

  const schema = {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Source asset ID',
      references: {
        model: 'Assets',
        key: 'id',
      },
    },
    targetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Target asset ID',
      references: {
        model: 'Assets',
        key: 'id',
      },
    },
    relationshipType: {
      type: DataTypes.ENUM('generated', 'derived_from', 'version_of', 'inspired_by'),
      allowNull: false,
      comment: 'Type of relationship between assets',
    },
    properties: {
      type: isPostgres ? DataTypes.JSONB : DataTypes.JSON,
      allowNull: true,
      comment: 'Relationship metadata (edit timestamp, similarity score, etc.)',
      defaultValue: {},
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  };

  const model = sequelize.define('AssetRelationship', schema, {
    indexes: [
      { fields: ['sourceId'] },
      { fields: ['targetId'] },
      { fields: ['relationshipType'] },
      {
        unique: true,
        fields: ['sourceId', 'targetId', 'relationshipType'],
        name: 'unique_relationship',
      },
    ],
    tableName: 'AssetRelationships',
  });

  return model;
};

module.exports = AssetRelationship;
