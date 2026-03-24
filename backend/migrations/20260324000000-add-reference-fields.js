'use strict';

/**
 * 迁移：添加参考图搜索功能所需的字段
 *
 * 这个迁移会：
 * 1. 添加新字段：isReference, originalUrl, sourceName, title, width, height, themeId
 * 2. 重命名可能存在的 snake_case 列为 camelCase
 * 3. 删除重复的旧列
 *
 * 执行方式：
 * npx sequelize-cli db:migrate
 *
 * 回滚方式：
 * npx sequelize-cli db:migrate:undo
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    console.log('开始迁移：添加参考图搜索字段...');

    // =========================================
    // 步骤 1: 检查并重命名 snake_case 列
    // =========================================

    const [columns] = await queryInterface.sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Images'
    `);

    const columnNames = columns.map((col) => col.column_name);

    // 重命名 is_reference → isReference
    if (columnNames.includes('is_reference')) {
      console.log('  重命名列: is_reference → isReference');
      await queryInterface.renameColumn('Images', 'is_reference', 'isReference');
    }

    // 重命名 original_url → originalUrl
    if (columnNames.includes('original_url')) {
      console.log('  重命名列: original_url → originalUrl');
      await queryInterface.renameColumn('Images', 'original_url', 'originalUrl');
    }

    // 重命名 source_name → sourceName
    if (columnNames.includes('source_name')) {
      console.log('  重命名列: source_name → sourceName');
      await queryInterface.renameColumn('Images', 'source_name', 'sourceName');
    }

    // 重命名 theme_id → themeId
    if (columnNames.includes('theme_id')) {
      console.log('  重命名列: theme_id → themeId');
      await queryInterface.renameColumn('Images', 'theme_id', 'themeId');
    }

    // =========================================
    // 步骤 2: 添加缺失的新字段
    // =========================================

    // 添加 isReference 字段
    if (!columnNames.includes('isReference')) {
      console.log('  添加列: isReference');
      await queryInterface.addColumn('Images', 'isReference', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
    }

    // 添加 originalUrl 字段
    if (!columnNames.includes('originalUrl')) {
      console.log('  添加列: originalUrl');
      await queryInterface.addColumn('Images', 'originalUrl', {
        type: DataTypes.STRING(2048),
        allowNull: true,
      });
    }

    // 添加 sourceName 字段
    if (!columnNames.includes('sourceName')) {
      console.log('  添加列: sourceName');
      await queryInterface.addColumn('Images', 'sourceName', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
    }

    // 添加 title 字段
    if (!columnNames.includes('title')) {
      console.log('  添加列: title');
      await queryInterface.addColumn('Images', 'title', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
    }

    // 添加 width 字段
    if (!columnNames.includes('width')) {
      console.log('  添加列: width');
      await queryInterface.addColumn('Images', 'width', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }

    // 添加 height 字段
    if (!columnNames.includes('height')) {
      console.log('  添加列: height');
      await queryInterface.addColumn('Images', 'height', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }

    // 添加 themeId 字段
    if (!columnNames.includes('themeId')) {
      console.log('  添加列: themeId');
      await queryInterface.addColumn('Images', 'themeId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Themes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    console.log('✅ 迁移完成！');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('开始回滚迁移...');

    // 删除添加的字段
    await queryInterface.removeColumn('Images', 'isReference');
    await queryInterface.removeColumn('Images', 'originalUrl');
    await queryInterface.removeColumn('Images', 'sourceName');
    await queryInterface.removeColumn('Images', 'title');
    await queryInterface.removeColumn('Images', 'width');
    await queryInterface.removeColumn('Images', 'height');
    await queryInterface.removeColumn('Images', 'themeId');

    console.log('✅ 回滚完成！');
  },
};
