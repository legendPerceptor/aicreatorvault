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
      themeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      imageId: {
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
