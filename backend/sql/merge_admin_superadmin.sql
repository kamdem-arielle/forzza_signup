-- =====================================================
-- Migration Script: Merge SuperAdmin into Admin with Role Column
-- =====================================================
-- This script consolidates superadmins into the admins table
-- by adding a 'role' column to distinguish admin types.
-- =====================================================

-- Step 1: Add 'role' column to admins table if it doesn't exist
-- Default role is 'admin', superadmins will have 'superadmin'
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS role ENUM('admin', 'superadmin','callcenter') NOT NULL DEFAULT 'admin';

-- Alternative syntax for MySQL versions that don't support IF NOT EXISTS:
-- SET @dbname = DATABASE();
-- SET @tablename = "admins";
-- SET @columnname = "role";
-- SET @preparedStatement = (SELECT IF(
--   (
--     SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
--     WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)
--   ) > 0,
--   "SELECT 1",
--   CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " ENUM('admin', 'superadmin') NOT NULL DEFAULT 'admin'")
-- ));
-- PREPARE alterIfNotExists FROM @preparedStatement;
-- EXECUTE alterIfNotExists;
-- DEALLOCATE PREPARE alterIfNotExists;

-- Step 2: Migrate superadmins to admins table with role='superadmin'
-- Only if superadmins table exists
INSERT INTO admins (username, password, role, created_at)
SELECT username, password, 'superadmin', created_at
FROM superadmins
WHERE username NOT IN (SELECT username FROM admins);

-- Step 3: Drop the superadmins table (uncomment when ready)
-- WARNING: Make sure migration is complete before dropping!
DROP TABLE IF EXISTS superadmins;

-- =====================================================
-- Verification queries (run these to verify migration)
-- =====================================================

-- Check all admins with their roles:
-- SELECT id, username, role, created_at FROM admins ORDER BY role, id;

-- Count admins by role:
-- SELECT role, COUNT(*) as count FROM admins GROUP BY role;

-- =====================================================
-- Rollback script (in case you need to undo)
-- =====================================================
-- CREATE TABLE IF NOT EXISTS superadmins (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     username VARCHAR(50) NOT NULL UNIQUE,
--     password VARCHAR(255) NOT NULL,
--     name VARCHAR(100),
--     email VARCHAR(100),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     last_login_at TIMESTAMP NULL
-- );
-- 
-- INSERT INTO superadmins (username, password, created_at)
-- SELECT username, password, created_at FROM admins WHERE role = 'superadmin';
-- 
-- DELETE FROM admins WHERE role = 'superadmin';
-- ALTER TABLE admins DROP COLUMN role;
