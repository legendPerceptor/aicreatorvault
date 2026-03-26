const { DataTypes } = require('sequelize');

const ThemeImage = (sequelize) => {
  return sequelize.define(
    'ThemeImage',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      theme_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      image_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'ThemeImages',
      timestamps: false,
    }
  );
};

module.exports = ThemeImage;
