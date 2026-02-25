#!/bin/bash

# Fix database connection issues

echo "=========================================="
echo "Fixing Database Connection"
echo "=========================================="
echo ""

CONFIG_FILE="/var/www/html/realestate/config/database.php"

# Check current config
echo "Current database configuration:"
if [ -f "$CONFIG_FILE" ]; then
    grep -E "DB_USER|DB_PASS|DB_NAME" "$CONFIG_FILE"
else
    echo "ERROR: Config file not found: $CONFIG_FILE"
    exit 1
fi

echo ""
echo "Options to fix:"
echo "1. Use root user (if MySQL root has no password)"
echo "2. Create/update MySQL user 'sidhyk'"
echo "3. Use existing user 'realv1_user'"
echo ""

# Option 1: Try root user first (most common on VPS)
echo "Trying Option 1: Using root user..."
read -p "Enter MySQL root password (press Enter if no password): " ROOT_PASS

# Test root connection
if [ -z "$ROOT_PASS" ]; then
    mysql -u root -e "SELECT 1;" 2>/dev/null
else
    mysql -u root -p"$ROOT_PASS" -e "SELECT 1;" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo "✓ Root connection successful"
    
    # Backup config
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update config to use root
    sed -i "s/define('DB_USER', '.*');/define('DB_USER', 'root');/" "$CONFIG_FILE"
    if [ -z "$ROOT_PASS" ]; then
        sed -i "s/define('DB_PASS', '.*');/define('DB_PASS', '');/" "$CONFIG_FILE"
    else
        # Escape special characters in password for sed
        ESCAPED_PASS=$(echo "$ROOT_PASS" | sed 's/[[\.*^$()+?{|]/\\&/g')
        sed -i "s/define('DB_PASS', '.*');/define('DB_PASS', '$ESCAPED_PASS');/" "$CONFIG_FILE"
    fi
    
    # Ensure database exists
    if [ -z "$ROOT_PASS" ]; then
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS realv1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    else
        mysql -u root -p"$ROOT_PASS" -e "CREATE DATABASE IF NOT EXISTS realv1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    fi
    
    echo "✓ Database config updated to use root user"
    echo "✓ Database 'realv1' created/verified"
else
    echo "✗ Root connection failed"
    echo ""
    echo "Trying Option 2: Creating/updating user 'sidhyk'..."
    
    read -p "Enter MySQL root password: " ROOT_PASS
    read -p "Enter password for user 'sidhyk': " SIDHYK_PASS
    
    if [ -z "$ROOT_PASS" ]; then
        mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS realv1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sidhyk'@'localhost' IDENTIFIED BY '$SIDHYK_PASS';
GRANT ALL PRIVILEGES ON realv1.* TO 'sidhyk'@'localhost';
FLUSH PRIVILEGES;
EOF
    else
        mysql -u root -p"$ROOT_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS realv1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sidhyk'@'localhost' IDENTIFIED BY '$SIDHYK_PASS';
GRANT ALL PRIVILEGES ON realv1.* TO 'sidhyk'@'localhost';
FLUSH PRIVILEGES;
EOF
    fi
    
    if [ $? -eq 0 ]; then
        # Backup config
        cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update config
        sed -i "s/define('DB_USER', '.*');/define('DB_USER', 'sidhyk');/" "$CONFIG_FILE"
        ESCAPED_PASS=$(echo "$SIDHYK_PASS" | sed 's/[[\.*^$()+?{|]/\\&/g')
        sed -i "s/define('DB_PASS', '.*');/define('DB_PASS', '$ESCAPED_PASS');/" "$CONFIG_FILE"
        
        echo "✓ User 'sidhyk' created/updated"
        echo "✓ Database config updated"
    else
        echo "✗ Failed to create user"
        exit 1
    fi
fi

echo ""
echo "Updated configuration:"
grep -E "DB_USER|DB_PASS|DB_NAME" "$CONFIG_FILE"

echo ""
echo "=========================================="
echo "Database connection should be fixed!"
echo "=========================================="
echo ""
echo "Test the site: https://realestate.fmcqatar.com"
echo ""

