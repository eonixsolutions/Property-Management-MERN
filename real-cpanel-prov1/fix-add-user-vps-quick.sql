-- Quick fix for "Can't Add User" on VPS
-- Run: mysql -u sidhyk -p'Tz#669933' realestate < fix-add-user-vps-quick.sql

USE realestate;

-- Add role column if it doesn't exist
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'realestate' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'role');

SET @sql = IF(@exists = 0,
    'ALTER TABLE users ADD COLUMN role ENUM(\'Super Admin\', \'Admin\', \'Manager\', \'User\', \'Viewer\') DEFAULT \'User\' AFTER last_name',
    'SELECT "Role column already exists" as Status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add status column if it doesn't exist
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'realestate' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'status');

SET @sql = IF(@exists = 0,
    'ALTER TABLE users ADD COLUMN status ENUM(\'Active\', \'Inactive\', \'Suspended\') DEFAULT \'Active\' AFTER role',
    'SELECT "Status column already exists" as Status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add phone column if it doesn't exist
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'realestate' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'phone');

SET @sql = IF(@exists = 0,
    'ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER email',
    'SELECT "Phone column already exists" as Status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update admin user to Super Admin
UPDATE users SET role = 'Super Admin', status = 'Active' WHERE email = 'sidhykqatar@gmail.com';

-- Show current users
SELECT 'Current users:' as Info;
SELECT id, email, first_name, last_name, role, status FROM users ORDER BY role, email;

