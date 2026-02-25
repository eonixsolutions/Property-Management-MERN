#!/bin/bash
# Deploy Admin Full Access to VPS
# Run this on the VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Deploying Admin Full Access to VPS"
echo "=========================================="
echo ""

# Backup files first
echo "1. Backing up files..."
cp config/config.php config/config.php.backup.$(date +%Y%m%d_%H%M%S)
cp auth/login.php auth/login.php.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backups created"
echo ""

# Note: The actual file updates need to be done by copying from local
# This script will handle the database migration and verification

echo "2. Checking database connection..."
mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SELECT 'Database connected' as Status;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Database connected"
else
    echo "✗ Database connection failed"
    exit 1
fi
echo ""

echo "3. Running database migration..."
mysql -u sidhyk -p'Tz#669933' realestate << 'EOF'
-- Check if role column exists
SET @has_role = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'realestate' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'role');

-- Add role column if it doesn't exist
SET @sql = IF(@has_role = 0,
    'ALTER TABLE users ADD COLUMN role ENUM(\'Super Admin\', \'Admin\', \'Manager\', \'User\', \'Viewer\') DEFAULT \'User\' AFTER last_name',
    'SELECT "Role column already exists" as Status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if status column exists
SET @has_status = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'realestate' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'status');

-- Add status column if it doesn't exist
SET @sql = IF(@has_status = 0,
    'ALTER TABLE users ADD COLUMN status ENUM(\'Active\', \'Inactive\', \'Suspended\') DEFAULT \'Active\' AFTER role',
    'SELECT "Status column already exists" as Status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update admin user to Super Admin
UPDATE users SET role = 'Super Admin', status = 'Active' WHERE email = 'sidhykqatar@gmail.com';

-- Show current users and roles
SELECT 'Current users and roles:' as Info;
SELECT id, email, first_name, last_name, role, status FROM users ORDER BY role, email;
EOF

if [ $? -eq 0 ]; then
    echo "✓ Database migration completed"
else
    echo "✗ Database migration failed"
    exit 1
fi
echo ""

echo "4. Verifying files..."
if [ -f "config/config.php" ]; then
    echo "✓ config/config.php exists"
    # Check if admin functions exist
    if grep -q "function isAdmin" config/config.php; then
        echo "✓ Admin functions found in config.php"
    else
        echo "⚠ Admin functions not found - you need to copy updated config.php"
    fi
else
    echo "✗ config/config.php not found"
fi

if [ -f "auth/login.php" ]; then
    echo "✓ auth/login.php exists"
    # Check if role is stored in session
    if grep -q "user_role" auth/login.php; then
        echo "✓ User role storage found in login.php"
    else
        echo "⚠ User role storage not found - you need to copy updated login.php"
    fi
else
    echo "✗ auth/login.php not found"
fi
echo ""

echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""
echo "IMPORTANT: You need to copy these files from local to VPS:"
echo "  1. config/config.php (with admin functions)"
echo "  2. auth/login.php (with role storage)"
echo ""
echo "Then run this script again to verify everything is working."
echo ""
echo "To copy files from local to VPS:"
echo "  scp config/config.php root@104.237.2.52:/var/www/html/realestate/config/"
echo "  scp auth/login.php root@104.237.2.52:/var/www/html/realestate/auth/"
echo ""
echo "=========================================="

