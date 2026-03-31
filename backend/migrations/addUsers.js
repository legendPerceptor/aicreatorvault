/**
 * Migration Script: Add Users to the database
 *
 * This script:
 * 1. Creates a legacy user (id=1) for existing data
 * 2. Sets userId=1 for all existing data (Prompts, Images, Themes, Assets, AssetRelationships)
 * 3. Migrates uploaded files to user directory structure
 *
 * SAFETY FEATURES:
 * - Only migrates files if they exist in the source location
 * - Does NOT delete any source files (copy instead of move)
 * - Can be run multiple times safely (idempotent)
 * - Supports --dry-run to preview what would be migrated
 *
 * Usage:
 *   node backend/migrations/addUsers.js          # Run migration
 *   node backend/migrations/addUsers.js --dry-run  # Preview without changes
 *
 * Docker Usage:
 *   docker exec -it aicreatorvault-backend-1 node backend/migrations/addUsers.js
 *   docker exec -it aicreatorvault-backend-1 node backend/migrations/addUsers.js --dry-run
 */

require('dotenv').config({ path: __dirname + '/../../.env' });
const { sequelize, User, Prompt, Image, Theme, Asset, AssetRelationship } = require('../models');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/uploads'
    : path.join(__dirname, '../uploads');

const LEGACY_USER_ID = 1;
const DRY_RUN = process.argv.includes('--dry-run');

async function migrateToUsers() {
  console.log('===========================================');
  console.log('[Migration] Multi-User Authentication Setup');
  console.log('===========================================');

  if (DRY_RUN) {
    console.log('[DRY RUN] No changes will be made.');
    console.log('');
  }

  try {
    // Sync all models to create new columns
    console.log('[Step 1/5] Syncing database models...');
    if (!DRY_RUN) {
      await sequelize.sync({ alter: true });
    }
    console.log('[Step 1/5] Database models synced (or will be synced).');

    // Check if legacy user already exists
    let legacyUser = await User.findOne({ where: { email: 'legacy@local' } });

    if (!legacyUser) {
      console.log('[Step 2/5] Creating legacy user...');
      if (!DRY_RUN) {
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash('legacy_password', 10);

        legacyUser = await User.create({
          username: 'legacy',
          email: 'legacy@local',
          password_hash: passwordHash,
          is_default: true,
        });
      }
      console.log(`[Step 2/5] Will create legacy user (id=${LEGACY_USER_ID})`);
    } else {
      console.log(`[Step 2/5] Legacy user already exists (id=${legacyUser.id})`);
    }

    // Get counts of data to migrate
    const promptCount = await Prompt.count({ where: { user_id: null } });
    const imageCount = await Image.count({ where: { user_id: null } });
    const themeCount = await Theme.count({ where: { user_id: null } });
    const assetCount = await Asset.count({ where: { user_id: null } });
    const relationshipCount = await AssetRelationship.count({ where: { user_id: null } });

    console.log('[Step 3/5] Database records to migrate:');
    console.log(`  - Prompts: ${promptCount}`);
    console.log(`  - Images: ${imageCount}`);
    console.log(`  - Themes: ${themeCount}`);
    console.log(`  - Assets: ${assetCount}`);
    console.log(`  - AssetRelationships: ${relationshipCount}`);

    if (!DRY_RUN) {
      // Migrate Prompts
      if (promptCount > 0) {
        await Prompt.update({ user_id: LEGACY_USER_ID }, { where: { user_id: null } });
        console.log(`[Step 3/5] Migrated ${promptCount} Prompts`);
      }

      // Migrate Images
      if (imageCount > 0) {
        await Image.update({ user_id: LEGACY_USER_ID }, { where: { user_id: null } });
        console.log(`[Step 3/5] Migrated ${imageCount} Images`);
      }

      // Migrate Themes
      if (themeCount > 0) {
        await Theme.update({ user_id: LEGACY_USER_ID }, { where: { user_id: null } });
        console.log(`[Step 3/5] Migrated ${themeCount} Themes`);
      }

      // Migrate Assets
      if (assetCount > 0) {
        await Asset.update({ user_id: LEGACY_USER_ID }, { where: { user_id: null } });
        console.log(`[Step 3/5] Migrated ${assetCount} Assets`);
      }

      // Migrate AssetRelationships
      if (relationshipCount > 0) {
        await AssetRelationship.update({ user_id: LEGACY_USER_ID }, { where: { user_id: null } });
        console.log(`[Step 3/5] Migrated ${relationshipCount} AssetRelationships`);
      }
    }

    // Migrate files
    console.log('[Step 4/5] File migration...');
    const fileMigrationResult = await migrateFiles();

    // Create uploads/users directory structure (but don't delete old files)
    console.log('[Step 5/5] Ensuring directory structure...');
    await ensureDirectoryStructure();

    console.log('');
    console.log('===========================================');
    console.log('[Migration] Summary');
    console.log('===========================================');
    console.log(`Legacy User ID: ${LEGACY_USER_ID}`);
    console.log(`Database records migrated:`);
    console.log(`  - Prompts: ${promptCount}`);
    console.log(`  - Images: ${imageCount}`);
    console.log(`  - Themes: ${themeCount}`);
    console.log(`  - Assets: ${assetCount}`);
    console.log(`  - AssetRelationships: ${relationshipCount}`);
    console.log(`Files migrated: ${fileMigrationResult.migrated}`);
    console.log(`Files skipped (already exist): ${fileMigrationResult.skipped}`);
    console.log(`Files not found: ${fileMigrationResult.notFound}`);
    console.log('');
    console.log('IMPORTANT: Source files in /uploads/ were NOT deleted.');
    console.log('You can delete them manually after verifying the migration.');
    console.log('===========================================');

    if (DRY_RUN) {
      console.log('[DRY RUN] No actual changes were made.');
    } else {
      console.log('[Migration] Completed successfully!');
    }
  } catch (error) {
    console.error('[Migration] Error:', error.message);
    console.error(error.stack);
    throw error;
  }
}

async function migrateFiles() {
  const legacyDir = path.join(UPLOADS_DIR, 'users', String(LEGACY_USER_ID));
  const imagesDir = path.join(legacyDir, 'images');

  let migrated = 0;
  let skipped = 0;
  let notFound = 0;

  // Get all images from database to find their actual paths
  const images = await Image.findAll({
    where: { user_id: LEGACY_USER_ID },
    attributes: ['id', 'filename', 'path'],
  });

  console.log(`  Found ${images.length} images in database`);

  // Ensure directory exists
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log(`  Created directory: ${imagesDir}`);
  }

  for (const image of images) {
    if (!image.path) {
      notFound++;
      continue;
    }

    // Check if file exists at stored path
    if (fs.existsSync(image.path)) {
      const filename = path.basename(image.path);
      const destPath = path.join(imagesDir, filename);

      // Check if already migrated
      if (fs.existsSync(destPath)) {
        skipped++;
        console.log(`  Skipped (exists): ${filename}`);
      } else {
        if (!DRY_RUN) {
          fs.copyFileSync(image.path, destPath);
        }
        migrated++;
        console.log(`  Migrated: ${filename}`);
      }
    } else {
      // File not found at stored path, check root uploads directory
      const rootPath = path.join(UPLOADS_DIR, image.filename);
      if (fs.existsSync(rootPath)) {
        const destPath = path.join(imagesDir, image.filename);

        if (fs.existsSync(destPath)) {
          skipped++;
          console.log(`  Skipped (exists): ${image.filename}`);
        } else {
          if (!DRY_RUN) {
            fs.copyFileSync(rootPath, destPath);
          }
          migrated++;
          console.log(`  Migrated from root: ${image.filename}`);
        }
      } else {
        notFound++;
        console.log(`  NOT FOUND: ${image.path} or ${rootPath}`);
      }
    }
  }

  return { migrated, skipped, notFound };
}

async function ensureDirectoryStructure() {
  // Ensure the users directory exists for future users
  const usersDir = path.join(UPLOADS_DIR, 'users');
  if (!fs.existsSync(usersDir)) {
    if (!DRY_RUN) {
      fs.mkdirSync(usersDir, { recursive: true });
    }
    console.log(`  Created: ${usersDir}`);
  }
}

// Run migration if called directly
if (require.main === module) {
  const startTime = Date.now();

  migrateToUsers()
    .then(() => {
      const duration = Date.now() - startTime;
      console.log(`[Migration] Total time: ${duration}ms`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateToUsers };
