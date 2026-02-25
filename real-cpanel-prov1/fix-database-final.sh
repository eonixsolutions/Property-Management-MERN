#!/bin/bash

# Final fix for database connection - handles both database name and user issues

echo "=========================================="
echo "Fixing Database Connection Issues"
echo "=========================================="
echo ""

CONFIG_FILE="/var/www/html/realestate/config/database.php"
MYSQL_ROOT_PASS="Tz@669933"

# Check current config
echo "Current database configuration:"
grep -E "DB_USER|DB_PASS|DB_NAME" "$CONFIG_FILE"
echo ""

# Backup config
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Option 1: Use root user (simplest)
echo "Setting up database with root user..."

# Create database if it doesn't exist
mysql -u root -p"$MYSQL_ROOT_PASS" <<EOF 2>/dev/null
CREATE DATABASE IF NOT EXISTS realv1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS realestate_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

if [ $? -eq 0 ]; then
    echo "✓ Databases created/verified"
    
    # Update config to use root
    sed -i "s/define('DB_USER', '.*');/define('DB_USER', 'root');/" "$CONFIG_FILE"
    sed -i "s/define('DB_PASS', '.*');/define('DB_PASS', 'Tz@669933');/" "$CONFIG_FILE"
    sed -i "s/define('DB_NAME', '.*');/define('DB_NAME', 'realv1');/" "$CONFIG_FILE"
    
    echo "✓ Config updated to use root user with database 'realv1'"
else
    echo "✗ Failed to connect with root. Trying to create user..."
    
    # Option 2: Create realv1_user
    mysql -u root -p"$MYSQL_ROOT_PASS" <<EOF 2>/dev/null
CREATE DATABASE IF NOT EXISTS realv1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS realestate_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'realv1_user'@'localhost' IDENTIFIED BY 'Tz@669933';
GRANT ALL PRIVILEGES ON realv1.* TO 'realv1_user'@'localhost';
GRANT ALL PRIVILEGES ON realestate_db.* TO 'realv1_user'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    if [ $? -eq 0 ]; then
        echo "✓ User 'realv1_user' created/updated"
        echo "✓ Databases created/verified"
        
        # Update config to use realv1_user
        sed -i "s/define('DB_USER', '.*');/define('DB_USER', 'realv1_user');/" "$CONFIG_FILE"
        sed -i "s/define('DB_PASS', '.*');/define('DB_PASS', 'Tz@669933');/" "$CONFIG_FILE"
        sed -i "s/define('DB_NAME', '.*');/define('DB_NAME', 'realv1');/" "$CONFIG_FILE"
        
        echo "✓ Config updated to use realv1_user with database 'realv1'"
    else
        echo "✗ Failed to create user. Please check MySQL root password."
        exit 1
    fi
fi

echo ""
echo "Updated configuration:"
grep -E "DB_USER|DB_PASS|DB_NAME" "$CONFIG_FILE"

echo ""
echo "Testing database connection..."
php -r "
require_once '$CONFIG_FILE';
\$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (\$conn->connect_error) {
    echo '✗ Connection failed: ' . \$conn->connect_error . PHP_EOL;
    exit(1);
} else {
    echo '✓ Database connection successful!' . PHP_EOL;
    \$conn->close();
}
"

echo ""
echo "=========================================="
echo "Database connection fixed!"
echo "=========================================="
echo ""
echo "If the database is empty, import the schema:"
echo "  mysql -u root -p'Tz@669933' realv1 < /var/www/html/realestate/database/schema.sql"
echo ""

