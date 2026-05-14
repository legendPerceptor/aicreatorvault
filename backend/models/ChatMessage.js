const { DataTypes } = require('sequelize');

const ChatMessage = (sequelize) => {
  const model = sequelize.define(
    'ChatMessage',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
      },
      resource_id: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'default',
        field: 'resource_id',
      },
      role: {
        type: DataTypes.ENUM('system', 'user', 'assistant'),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: 'ChatMessages',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [{ fields: ['user_id', 'resource_id'] }, { fields: ['created_at'] }],
    }
  );

  return model;
};

module.exports = ChatMessage;
