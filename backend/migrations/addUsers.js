/**
 * Migration Script: Migrate Files to User Directory Structure
 *
 * This script should be run AFTER addUsers.sql
 * It handles:
 * - Copying files from /uploads/ to /uploads/users/1/images/
 * - Updating database paths to reflect new file locations
 *
 * Prerequisites:
 *   1. Run addUsers.sql first to add user_id columns and create legacy user
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
const { sequelize, Image, Asset } = require('../models');
const fs = require('fs');
const path = require('path');

// uploads 目录在项目根目录
const UPLOADS_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/uploads'
    : path.join(__dirname, '../../uploads');

const LEGACY_USER_ID = 1;
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE_UPDATE_PATHS = process.argv.includes('--force-update-paths');

/**
 * Main migration function
 */
async function migrateFiles() {
  console.log('===========================================');
  console.log('[Migration] File Path Migration');
  console.log('===========================================');
  console.log(`Uploads directory: ${UPLOADS_DIR}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Force update paths: ${FORCE_UPDATE_PATHS}`);
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY RUN] No changes will be made.');
    console.log('');
  }

  try {
    // Step 1: Ensure directory structure exists
    console.log('[Step 1/4] Ensuring directory structure...');
    await ensureDirectoryStructure();

    // Step 2: Copy files to new directory structure
    console.log('[Step 2/4] Copying files to user directory...');
    const fileResult = await copyFiles();

    // Step 3: Update database paths (CRITICAL for data consistency)
    console.log('[Step 3/4] Updating database paths...');
    const pathResult = await updateDatabasePaths(fileResult.pathMappings);

    // Step 4: Verify migration
    console.log('[Step 4/4] Verifying migration...');
    await verifyMigration();

    // Summary
    console.log('');
    console.log('===========================================');
    console.log('[Migration] Summary');
    console.log('===========================================');
    console.log(`File migration:`);
    console.log(`  - Files copied: ${fileResult.copied}`);
    console.log(`  - Files skipped (already exist): ${fileResult.skipped}`);
    console.log(`  - Files not found: ${fileResult.notFound}`);
    console.log('');
    console.log(`Database path updates:`);
    console.log(`  - Paths updated: ${pathResult.updated}`);
    console.log(`  - Paths unchanged: ${pathResult.unchanged}`);
    console.log(`  - Path errors: ${pathResult.errors}`);
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

/**
 * Ensure directory structure exists
 */
async function ensureDirectoryStructure() {
  const usersDir = path.join(UPLOADS_DIR, 'users');
  const legacyImagesDir = path.join(usersDir, String(LEGACY_USER_ID), 'images');

  if (!fs.existsSync(legacyImagesDir)) {
    if (!DRY_RUN) {
      fs.mkdirSync(legacyImagesDir, { recursive: true });
    }
    console.log(`  Will create directory: ${legacyImagesDir}`);
  } else {
    console.log(`  Directory exists: ${legacyImagesDir}`);
  }
}

/**
 * Copy files to user directory
 */
async function copyFiles() {
  const destDir = path.join(UPLOADS_DIR, 'users', String(LEGACY_USER_ID), 'images');
  const pathMappings = [];
  let copied = 0;
  let skipped = 0;
  let notFound = 0;

  // Get all images from database
  const images = await Image.findAll({
    where: { user_id: LEGACY_USER_ID },
    attributes: ['id', 'filename', 'path'],
  });

  console.log(`  Found ${images.length} images in database`);

  // Get all assets with files
  const assets = await Asset.findAll({
    where: { user_id: LEGACY_USER_ID },
    attributes: ['id', 'filename', 'path'],
  });

  console.log(`  Found ${assets.length} assets in database`);

  // Process Images
  for (const image of images) {
    const result = copySingleFile(image.path, image.filename, destDir, 'Image', image.id);
    if (result.copied) {
      copied++;
      pathMappings.push({
        type: 'Image',
        id: image.id,
        oldPath: image.path,
        newPath: result.newPath,
      });
    } else if (result.skipped && FORCE_UPDATE_PATHS && result.newPath) {
      skipped++;
      pathMappings.push({
        type: 'Image',
        id: image.id,
        oldPath: image.path,
        newPath: result.newPath,
      });
    } else if (result.skipped) {
      skipped++;
    } else {
      notFound++;
    }
  }

  // Process Assets
  for (const asset of assets) {
    if (!asset.filename && !asset.path) continue;
    const result = copySingleFile(asset.path, asset.filename, destDir, 'Asset', asset.id);
    if (result.copied) {
      copied++;
      pathMappings.push({
        type: 'Asset',
        id: asset.id,
        oldPath: asset.path,
        newPath: result.newPath,
      });
    } else if (result.skipped && FORCE_UPDATE_PATHS && result.newPath) {
      skipped++;
      pathMappings.push({
        type: 'Asset',
        id: asset.id,
        oldPath: asset.path,
        newPath: result.newPath,
      });
    } else if (result.skipped) {
      skipped++;
    } else {
      notFound++;
    }
  }

  return { copied, skipped, notFound, pathMappings };
}

/**
 * Copy a single file
 */
function copySingleFile(storedPath, filename, destDir, type, id) {
  const result = { copied: false, skipped: false, notFound: false, newPath: null };

  // Determine source path
  let sourcePath = null;
  if (storedPath && fs.existsSync(storedPath)) {
    sourcePath = storedPath;
  } else if (filename) {
    // Try common locations
    const possiblePaths = [
      path.join(UPLOADS_DIR, filename),
      path.join(UPLOADS_DIR, 'images', filename),
      storedPath, // original stored path
    ];
    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        sourcePath = p;
        break;
      }
    }
  }

  if (!sourcePath) {
    result.notFound = true;
    console.log(`  NOT FOUND [${type}:${id}]: ${storedPath || filename}`);
    return result;
  }

  const actualFilename = path.basename(sourcePath);
  const destPath = path.join(destDir, actualFilename);
  result.newPath = destPath;

  // Check if already at destination
  if (sourcePath === destPath) {
    result.skipped = true;
    return result;
  }

  // Check if destination already exists
  if (fs.existsSync(destPath)) {
    result.skipped = true;
    console.log(`  Skipped (exists): ${actualFilename}`);
    return result;
  }

  // Copy file
  if (!DRY_RUN) {
    fs.copyFileSync(sourcePath, destPath);
  }
  result.copied = true;
  console.log(`  Copied: ${actualFilename}`);

  return result;
}

/**
 * Update database paths
 */
async function updateDatabasePaths(pathMappings) {
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  if (pathMappings.length === 0) {
    console.log('  No paths to update.');
    return { updated, unchanged, errors };
  }

  // Use transaction for atomic updates
  const transaction = DRY_RUN ? null : await sequelize.transaction();

  try {
    for (const mapping of pathMappings) {
      const { type, id, oldPath, newPath } = mapping;

      if (!newPath || oldPath === newPath) {
        unchanged++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would update ${type}:${id}: ${oldPath} -> ${newPath}`);
        updated++;
        continue;
      }

      try {
        if (type === 'Image') {
          await Image.update({ path: newPath }, { where: { id }, transaction });
        } else if (type === 'Asset') {
          await Asset.update({ path: newPath }, { where: { id }, transaction });
        }
        console.log(`  Updated ${type}:${id} path`);
        updated++;
      } catch (err) {
        console.error(`  Error updating ${type}:${id}: ${err.message}`);
        errors++;
      }
    }

    if (!DRY_RUN && transaction) {
      await transaction.commit();
      console.log('  Transaction committed.');
    }
  } catch (error) {
    if (!DRY_RUN && transaction) {
      await transaction.rollback();
      console.log('  Transaction rolled back due to error.');
    }
    throw error;
  }

  return { updated, unchanged, errors };
}

/**
 * Verify migration by checking files exist
 */
async function verifyMigration() {
  const destDir = path.join(UPLOADS_DIR, 'users', String(LEGACY_USER_ID), 'images');

  // Count files in destination
  let fileCount = 0;
  if (fs.existsSync(destDir)) {
    const files = fs.readdirSync(destDir);
    fileCount = files.filter((f) => fs.statSync(path.join(destDir, f)).isFile()).length;
  }

  console.log(`  Files in ${destDir}: ${fileCount}`);

  // Count images in database for legacy user
  const dbCount = await Image.count({ where: { user_id: LEGACY_USER_ID } });
  console.log(`  Images in database for user ${LEGACY_USER_ID}: ${dbCount}`);
}

// Run migration if called directly
if (require.main === module) {
  const startTime = Date.now();

  migrateFiles()
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

module.exports = { migrateFiles };
