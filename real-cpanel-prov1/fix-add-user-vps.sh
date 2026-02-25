#!/bin/bash
# Fix "Can't Add User" issue on VPS
# Run this on the VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Fixing Add User Issue on VPS"
echo "=========================================="
echo ""

# Check database connection
echo "1. Checking database connection..."
mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SELECT 'Connected' as Status;" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "✗ Database connection failed"
    exit 1
fi
echo "✓ Database connected"
echo ""

# Check if role column exists
echo "2. Checking if role column exists..."
ROLE_EXISTS=$(mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'realestate' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role';" 2>/dev/null | tail -n 1)

if [ "$ROLE_EXISTS" = "0" ]; then
    echo "   Role column doesn't exist. Adding it..."
    mysql -u sidhyk -p'Tz#669933' realestate << 'EOF'
ALTER TABLE users ADD COLUMN role ENUM('Super Admin', 'Admin', 'Manager', 'User', 'Viewer') DEFAULT 'User' AFTER last_name;
SELECT 'Role column added' as Status;
EOF
    echo "✓ Role column added"
else
    echo "✓ Role column already exists"
fi
echo ""

# Check if status column exists
echo "3. Checking if status column exists..."
STATUS_EXISTS=$(mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'realestate' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status';" 2>/dev/null | tail -n 1)

if [ "$STATUS_EXISTS" = "0" ]; then
    echo "   Status column doesn't exist. Adding it..."
    mysql -u sidhyk -p'Tz#669933' realestate << 'EOF'
ALTER TABLE users ADD COLUMN status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active' AFTER role;
SELECT 'Status column added' as Status;
EOF
    echo "✓ Status column added"
else
    echo "✓ Status column already exists"
fi
echo ""

# Update admin user to Super Admin
echo "4. Setting admin user to Super Admin..."
mysql -u sidhyk -p'Tz#669933' realestate << 'EOF'
UPDATE users SET role = 'Super Admin', status = 'Active' WHERE email = 'sidhykqatar@gmail.com';
SELECT 'Admin user updated' as Status;
EOF
echo "✓ Admin user updated"
echo ""

# Verify current users and roles
echo "5. Current users and roles:"
echo "----------------------------------------"
mysql -u sidhyk -p'Tz#669933' realestate -e "SELECT id, email, first_name, last_name, role, status FROM users ORDER BY role, email;" 2>/dev/null
echo ""

# Check if phone column exists (needed for add user)
echo "6. Checking if phone column exists..."
PHONE_EXISTS=$(mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'realestate' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone';" 2>/dev/null | tail -n 1)

if [ "$PHONE_EXISTS" = "0" ]; then
    echo "   Phone column doesn't exist. Adding it..."
    mysql -u sidhyk -p'Tz#669933' realestate << 'EOF'
ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER email;
SELECT 'Phone column added' as Status;
EOF
    echo "✓ Phone column added"
else
    echo "✓ Phone column already exists"
fi
echo ""

echo "=========================================="
echo "Fix Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Log out and log back in to refresh your session"
echo "2. Try adding a user again at: https://realestate.fmcqatar.com/users/add.php"
echo ""
echo "If you still can't add users, check:"
echo "- Are you logged in as admin? (Check your role in users list)"
echo "- Are there any error messages when you try to add a user?"
echo "- Check Apache error log: tail -f /var/log/apache2/error.log"
echo ""

