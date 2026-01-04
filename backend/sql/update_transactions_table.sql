-- SQL Commands to Update the Transactions Table
-- Run these commands to update the table structure for the new Excel import format
-- WARNING: This will DROP the existing table and create a new one with the updated structure

-- ============================================
-- OPTION 1: Drop and recreate the table (RECOMMENDED if you want a clean start)
-- This will delete all existing data
-- ============================================

-- First, drop the existing table
DROP TABLE IF EXISTS transactions;

-- Create the new transactions table with updated columns
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_datetime DATETIME NOT NULL COMMENT 'Date and time of the transaction',
    channel VARCHAR(255) COMMENT 'Channel/shop name (e.g., KYZ shop1)',
    username VARCHAR(255) NOT NULL COMMENT 'Bettor username extracted from the Excel file',
    booking VARCHAR(255) COMMENT 'Transaction type (e.g., Betting slip payment)',
    amount DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Transaction amount in XAF',
    balance DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'User balance after transaction',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    
    -- Indexes for better query performance
    INDEX idx_transaction_datetime (transaction_datetime),
    INDEX idx_username (username),
    INDEX idx_channel (channel),
    INDEX idx_booking (booking)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- OPTION 2: Alter the existing table (if you want to preserve some data)
-- Note: This approach is more complex and may require data migration
-- ============================================

-- -- Rename old columns and add new ones
-- ALTER TABLE transactions
--     DROP COLUMN IF EXISTS bettor_name,
--     DROP COLUMN IF EXISTS promo_code,
--     DROP COLUMN IF EXISTS transaction_date,
--     ADD COLUMN IF NOT EXISTS transaction_datetime DATETIME NOT NULL AFTER id,
--     ADD COLUMN IF NOT EXISTS channel VARCHAR(255) AFTER transaction_datetime,
--     ADD COLUMN IF NOT EXISTS username VARCHAR(255) NOT NULL AFTER channel,
--     ADD COLUMN IF NOT EXISTS booking VARCHAR(255) AFTER username,
--     ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) DEFAULT 0.00 AFTER amount;

-- -- Add indexes
-- ALTER TABLE transactions
--     ADD INDEX idx_transaction_datetime (transaction_datetime),
--     ADD INDEX idx_username (username),
--     ADD INDEX idx_channel (channel),
--     ADD INDEX idx_booking (booking);


-- ============================================
-- UTILITY COMMANDS
-- ============================================

-- Empty the transactions table (keep structure, delete all data)
-- TRUNCATE TABLE transactions;

-- Or using DELETE (slower but allows WHERE clause if needed)
-- DELETE FROM transactions;

-- View the table structure
-- DESCRIBE transactions;

-- View sample data
-- SELECT * FROM transactions LIMIT 10;
