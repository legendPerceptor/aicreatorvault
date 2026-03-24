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
        field: 'theme_id',
        references: {
          model: 'Themes',
          key: 'id',
        },
      },
      image_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'image_id',
        references: {
          model: 'Images',
          key: 'id',
        },
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      tableName: 'ThemeImages',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
};

module.exports = ThemeImage;
