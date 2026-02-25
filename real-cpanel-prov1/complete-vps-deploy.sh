#!/bin/bash
# Complete VPS Deployment Script - Run this on VPS
# This script does everything: database, config, permissions

set -e

DB_NAME="realestate"
DB_USER="sidhyk"
DB_PASS="Tz#669933"
VPS_PATH="/var/www/html/realestate"
DOMAIN="realestate.fmcqatar.com"

echo "=========================================="
echo "Complete VPS Deployment"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Database: $DB_NAME"
echo "DB User: $DB_USER"
echo "=========================================="
echo ""

# Step 1: Create database and user
echo "Step 1: Creating database and user..."
mysql -u root -p'Tz@669933' <<MYSQL_EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP USER IF EXISTS '$DB_USER'@'localhost';
CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SELECT 'Database and user created successfully!' as Status;
MYSQL_EOF

echo "✓ Database created"
echo ""

# Step 2: Backup existing folder
echo "Step 2: Backing up existing folder (if exists)..."
if [ -d "$VPS_PATH" ]; then
    BACKUP_DIR="/var/www/html/realestate_backup_$(date +%Y%m%d_%H%M%S)"
    echo "  Backing up to: $BACKUP_DIR"
    mv "$VPS_PATH" "$BACKUP_DIR"
    echo "✓ Backed up to: $BACKUP_DIR"
else
    echo "✓ No existing folder to backup"
fi
echo ""

# Step 3: Create directory
echo "Step 3: Creating directory structure..."
mkdir -p "$VPS_PATH"
chown -R www-data:www-data "$VPS_PATH"
chmod -R 755 "$VPS_PATH"
echo "✓ Directory created"
echo ""

# Step 4: Wait for files to be copied (if they exist, update config)
if [ -f "$VPS_PATH/config/database.php" ]; then
    echo "Step 4: Updating config files..."
    
    # Update database.php
    sed -i "s/define('DB_NAME', '[^']*');/define('DB_NAME', '$DB_NAME');/" "$VPS_PATH/config/database.php"
    sed -i "s/define('DB_USER', '[^']*');/define('DB_USER', '$DB_USER');/" "$VPS_PATH/config/database.php"
    sed -i "s/define('DB_PASS', '[^']*');/define('DB_PASS', '$DB_PASS');/" "$VPS_PATH/config/database.php"
    
    # Update config.php
    sed -i "s|define('BASE_URL', '[^']*');|define('BASE_URL', 'https://$DOMAIN');|" "$VPS_PATH/config/config.php"
    
    echo "✓ Config files updated"
    echo ""
    
    # Step 5: Import database
    if [ -f "$VPS_PATH/database/schema.sql" ]; then
        echo "Step 5: Importing database schema..."
        mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$VPS_PATH/database/schema.sql"
        echo "✓ Database imported"
    elif [ -f "$VPS_PATH/database/complete_schema_xampp.sql" ]; then
        echo "Step 5: Importing database schema (complete)..."
        mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$VPS_PATH/database/complete_schema_xampp.sql"
        echo "✓ Database imported"
    else
        echo "⚠ Database schema file not found. Please import manually."
    fi
    echo ""
else
    echo "Step 4: Files not found yet. Please copy files first."
    echo "  Run from local machine: scp -r * root@104.237.2.52:$VPS_PATH/"
    echo ""
fi

# Step 6: Set permissions
echo "Step 6: Setting file permissions..."
chown -R www-data:www-data "$VPS_PATH"
find "$VPS_PATH" -type f -exec chmod 644 {} \;
find "$VPS_PATH" -type d -exec chmod 755 {} \;
echo "✓ Permissions set"
echo ""

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Next: Test the site at https://$DOMAIN"
echo "=========================================="

