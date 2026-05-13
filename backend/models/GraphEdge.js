const { DataTypes } = require('sequelize');

const GraphEdge = (sequelize, dbType = 'sqlite') => {
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
    source_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'source_id',
      references: {
        model: 'GraphNodes',
        key: 'id',
      },
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'target_id',
      references: {
        model: 'GraphNodes',
        key: 'id',
      },
    },
    relationship_type: {
      type: DataTypes.ENUM('generated', 'derived_from', 'version_of', 'inspired_by', 'contains'),
      allowNull: false,
      field: 'relationship_type',
    },
    properties: {
      type: isPostgres ? DataTypes.JSONB : DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  };

  const model = sequelize.define('GraphEdge', schema, {
    tableName: 'GraphEdges',
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
        name: 'unique_graph_edge',
      },
    ],
  });

  return model;
};

module.exports = GraphEdge;
