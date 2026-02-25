#!/bin/bash
# Quick fix for "Can't Add User" - addresses all potential issues
# Run this on VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Quick Fix: Can't Add User"
echo "=========================================="
echo ""

# 1. Add missing columns
echo "1. Adding missing database columns..."
mysql -u sidhyk -p'Tz#669933' realestate << 'EOF'
-- Add role column (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('Super Admin', 'Admin', 'Manager', 'User', 'Viewer') DEFAULT 'User' AFTER last_name;

-- Add status column (if not exists)  
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active' AFTER role;

-- Add phone column (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL AFTER email;

-- Set admin to Super Admin
UPDATE users SET role = 'Super Admin', status = 'Active' WHERE email = 'sidhykqatar@gmail.com';

SELECT 'Columns added/updated' as Status;
EOF

echo "✓ Database columns fixed"
echo ""

# 2. Check if config.php has admin functions
echo "2. Checking config.php..."
if grep -q "function isAdmin" config/config.php; then
    echo "✓ Admin functions found in config.php"
else
    echo "⚠ Admin functions missing - you may need to update config.php"
fi
echo ""

# 3. Check if login.php stores role
echo "3. Checking login.php..."
if grep -q "user_role" auth/login.php; then
    echo "✓ Role storage found in login.php"
else
    echo "⚠ Role storage missing - you may need to update login.php"
fi
echo ""

# 4. Show current user status
echo "4. Current user status:"
mysql -u sidhyk -p'Tz#669933' realestate -e "SELECT id, email, role, status FROM users WHERE email = 'sidhykqatar@gmail.com';" 2>/dev/null
echo ""

echo "=========================================="
echo "Fix Complete!"
echo "=========================================="
echo ""
echo "IMPORTANT: Log out and log back in to refresh your session!"
echo ""
echo "Then try adding a user again."
echo ""


