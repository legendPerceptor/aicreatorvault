const { DataTypes } = require('sequelize');

const GraphNode = (sequelize) => {
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
    entity_type: {
      type: DataTypes.ENUM('prompt', 'image', 'theme'),
      allowNull: false,
      field: 'entity_type',
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'entity_id',
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

  const model = sequelize.define('GraphNode', schema, {
    tableName: 'GraphNodes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['entity_type'] },
      { fields: ['user_id'] },
      {
        unique: true,
        fields: ['entity_type', 'entity_id'],
        name: 'unique_entity_ref',
      },
    ],
  });

  return model;
};

module.exports = GraphNode;
