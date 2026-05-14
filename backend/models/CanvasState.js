const { DataTypes } = require('sequelize');

const CanvasState = (sequelize) => {
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
    graph_node_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'graph_node_id',
      references: {
        model: 'GraphNodes',
        key: 'id',
      },
    },
    position_x: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      field: 'position_x',
    },
    position_y: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      field: 'position_y',
    },
    size_w: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'size_w',
    },
    size_h: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'size_h',
    },
    canvas_id: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'default',
      field: 'canvas_id',
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

  const model = sequelize.define('CanvasState', schema, {
    tableName: 'CanvasStates',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['canvas_id'] },
      {
        unique: true,
        fields: ['graph_node_id', 'canvas_id'],
        name: 'unique_node_canvas',
      },
    ],
  });

  return model;
};

module.exports = CanvasState;
