#!/bin/bash

# Verify and finalize database configuration

echo "=========================================="
echo "Verifying Database Configuration"
echo "=========================================="
echo ""

CONFIG_FILE="/var/www/html/realestate/config/database.php"

# Check current config
echo "Current database configuration:"
grep -E "DB_USER|DB_PASS|DB_NAME" "$CONFIG_FILE" | head -3
echo ""

# Verify MySQL user exists and has access
echo "Testing database connection..."
mysql -u realv1_user -p'Tz@669933' -e "USE realv1; SHOW TABLES;" realv1 2>&1 | head -10

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database connection successful!"
    echo ""
    
    # Count tables
    TABLE_COUNT=$(mysql -u realv1_user -p'Tz@669933' -e "USE realv1; SHOW TABLES;" realv1 2>/dev/null | wc -l)
    if [ "$TABLE_COUNT" -gt 1 ]; then
        echo "✓ Database has tables (schema imported)"
    else
        echo "⚠ Database is empty - you may need to import schema"
        echo "  Run: mysql -u realv1_user -p'Tz@669933' realv1 < /var/www/html/realestate/database/schema.sql"
    fi
else
    echo ""
    echo "✗ Database connection failed!"
    echo ""
    echo "Trying to fix..."
    
    # Ensure user exists and has permissions
    mysql -u root -p'Tz@669933' <<EOF 2>/dev/null
CREATE DATABASE IF NOT EXISTS realv1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'realv1_user'@'localhost' IDENTIFIED BY 'Tz@669933';
GRANT ALL PRIVILEGES ON realv1.* TO 'realv1_user'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    if [ $? -eq 0 ]; then
        echo "✓ User and database created/verified"
        echo "  Test again: mysql -u realv1_user -p'Tz@669933' -e 'USE realv1; SHOW TABLES;' realv1"
    else
        echo "✗ Failed to create user. Check MySQL root password."
    fi
fi

echo ""
echo "=========================================="
echo "Configuration Summary"
echo "=========================================="
echo "Database User: realv1_user"
echo "Database Name: realv1"
echo "Config File: $CONFIG_FILE"
echo ""
echo "If you still get errors, check:"
echo "1. MySQL service is running: systemctl status mysql"
echo "2. User has correct password"
echo "3. Database exists: mysql -u root -p'Tz@669933' -e 'SHOW DATABASES;'"
echo ""

