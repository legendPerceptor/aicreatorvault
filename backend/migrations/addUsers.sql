-- ============================================================
-- Migration: Add Multi-User Authentication Support
-- ============================================================
-- This script adds user_id and is_public columns to existing tables
-- and creates the legacy user for existing data.
--
-- Usage:
--   PGPASSWORD=your_password psql -h localhost -p 5436 -U aicreator -d aicreatorvault -f addUsers.sql
--
-- Or in Docker:
--   docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault < addUsers.sql
-- ============================================================

BEGIN;

-- ============================================================
-- Step 1: Add user_id and is_public columns
-- ============================================================

-- Images table
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Prompts table
ALTER TABLE "Prompts" ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE "Prompts" ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Themes table
ALTER TABLE "Themes" ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE "Themes" ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Assets table
ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- AssetRelationships table
ALTER TABLE "AssetRelationships" ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- ============================================================
-- Step 2: Create indexes for user_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_images_user_id ON "Images"(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON "Prompts"(user_id);
CREATE INDEX IF NOT EXISTS idx_themes_user_id ON "Themes"(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON "Assets"(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_relationships_user_id ON "AssetRelationships"(user_id);

-- ============================================================
-- Step 3: Create legacy user (id=1)
-- ============================================================

-- Insert legacy user if not exists
INSERT INTO "Users" (username, email, password_hash, is_default, created_at, updated_at)
VALUES (
  'legacy',
  'legacy@local',
  -- Random bcrypt hash (password is random, user cannot login directly)
  '$2a$10$X5vG1hQ8Z9K2mN3pL4qR5O7sT8uV9wX0Y1Z2a3B4c5D6e7F8g9H0i',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Step 4: Set existing data to legacy user (user_id=1) and public
-- ============================================================

-- Update all existing Images
UPDATE "Images"
SET user_id = 1, is_public = true
WHERE user_id IS NULL;

-- Update all existing Prompts
UPDATE "Prompts"
SET user_id = 1, is_public = true
WHERE user_id IS NULL;

-- Update all existing Themes
UPDATE "Themes"
SET user_id = 1, is_public = true
WHERE user_id IS NULL;

-- Update all existing Assets
UPDATE "Assets"
SET user_id = 1, is_public = true
WHERE user_id IS NULL;

-- Update all existing AssetRelationships
UPDATE "AssetRelationships"
SET user_id = 1
WHERE user_id IS NULL;

-- ============================================================
-- Step 5: Make columns NOT NULL (after data migration)
-- ============================================================

ALTER TABLE "Images" ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE "Prompts" ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE "Themes" ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE "Assets" ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE "AssetRelationships" ALTER COLUMN user_id SET NOT NULL;

-- ============================================================
-- Step 6: Add foreign key constraints
-- ============================================================

ALTER TABLE "Images"
  ADD CONSTRAINT fk_images_user
  FOREIGN KEY (user_id) REFERENCES "Users"(id)
  ON DELETE CASCADE;

ALTER TABLE "Prompts"
  ADD CONSTRAINT fk_prompts_user
  FOREIGN KEY (user_id) REFERENCES "Users"(id)
  ON DELETE CASCADE;

ALTER TABLE "Themes"
  ADD CONSTRAINT fk_themes_user
  FOREIGN KEY (user_id) REFERENCES "Users"(id)
  ON DELETE CASCADE;

ALTER TABLE "Assets"
  ADD CONSTRAINT fk_assets_user
  FOREIGN KEY (user_id) REFERENCES "Users"(id)
  ON DELETE CASCADE;

ALTER TABLE "AssetRelationships"
  ADD CONSTRAINT fk_asset_relationships_user
  FOREIGN KEY (user_id) REFERENCES "Users"(id)
  ON DELETE CASCADE;

-- ============================================================
-- Step 7: Verify migration
-- ============================================================

DO $$
DECLARE
  users_count INTEGER;
  images_migrated INTEGER;
  prompts_migrated INTEGER;
  themes_migrated INTEGER;
  assets_migrated INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_count FROM "Users" WHERE email = 'legacy@local';
  SELECT COUNT(*) INTO images_migrated FROM "Images" WHERE user_id = 1;
  SELECT COUNT(*) INTO prompts_migrated FROM "Prompts" WHERE user_id = 1;
  SELECT COUNT(*) INTO themes_migrated FROM "Themes" WHERE user_id = 1;
  SELECT COUNT(*) INTO assets_migrated FROM "Assets" WHERE user_id = 1;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Legacy user exists: %', CASE WHEN users_count > 0 THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE 'Images migrated: %', images_migrated;
  RAISE NOTICE 'Prompts migrated: %', prompts_migrated;
  RAISE NOTICE 'Themes migrated: %', themes_migrated;
  RAISE NOTICE 'Assets migrated: %', assets_migrated;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================
-- Post-migration notes:
-- ============================================================
-- 1. Files in /uploads/ need to be copied to /uploads/users/1/images/
-- 2. Database paths need to be updated to reflect new file locations
-- 3. The legacy user password is random - user cannot login directly
-- 4. All legacy data is marked as public (is_public=true)
-- ============================================================
