-- =====================================================
-- Migration Script: Admin Hierarchy Architecture
-- =====================================================
-- This script implements the new admin hierarchy:
-- SuperAdmin -> Admin (Super Agent) -> Agent -> Signup -> Transaction
-- =====================================================

-- Step 1: Create the superadmins table
-- SuperAdmin can view ALL data across all admins
-- In the future, superadmin can create admins
CREATE TABLE IF NOT EXISTS superadmins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL
);

-- Step 2: Add admin_id column to agents table
-- This links each agent to their admin (super agent)
ALTER TABLE agents 
ADD COLUMN admin_id INT NULL AFTER id;

-- Step 3: Add foreign key constraint
-- Note: Run this only after setting admin_id values for existing agents
ALTER TABLE agents
ADD CONSTRAINT fk_agents_admin
FOREIGN KEY (admin_id) REFERENCES admins(id)
ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Create index for better query performance
CREATE INDEX idx_agents_admin_id ON agents(admin_id);

-- =====================================================
-- Optional: Migration script for existing data
-- =====================================================

-- If you have existing agents and want to assign them to admin with id=1:
-- UPDATE agents SET admin_id = 1 WHERE admin_id IS NULL;

-- =====================================================
-- Create a default superadmin (change password in production!)
-- =====================================================
-- INSERT INTO superadmins (username, password, name, email) 
-- VALUES ('superadmin', 'changeme123', 'Super Administrator', 'superadmin@example.com');

-- =====================================================
-- Verification queries
-- =====================================================

-- Check the updated agents table structure:
-- DESCRIBE agents;

-- Check the new superadmins table:
-- DESCRIBE superadmins;

-- View agents with their admin assignments:
-- SELECT a.id, a.username, a.name, a.admin_id, ad.username as admin_username 
-- FROM agents a 
-- LEFT JOIN admins ad ON a.admin_id = ad.id;
