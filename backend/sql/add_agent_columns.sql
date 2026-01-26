-- Migration: Add new columns to agents table
-- Date: 2026-01-22
-- Description: Add city, qr_code, agent_url columns and make phone unique

-- Add city column (VARCHAR)
ALTER TABLE agents ADD COLUMN city VARCHAR(100) NULL AFTER email;

-- Add qr_code column (LONGTEXT) to store Base64 PNG image
ALTER TABLE agents ADD COLUMN qr_code LONGTEXT NULL AFTER city;

-- Add agent_url column (VARCHAR)
ALTER TABLE agents ADD COLUMN agent_url VARCHAR(500) NULL AFTER qr_code;

-- Update phone column to be UNIQUE
-- Note: Before running this, ensure there are no duplicate phone numbers in the table
-- You can check with: SELECT phone, COUNT(*) FROM agents GROUP BY phone HAVING COUNT(*) > 1;
ALTER TABLE agents ADD UNIQUE INDEX idx_agents_phone_unique (phone);
