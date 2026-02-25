#!/bin/bash
# Fresh VPS Deployment Script
# Deploys complete system to realestate.fmcqatar.com
# Database: realestate (user: sidhyk, password: Tz#669933)

set -e

VPS_HOST="104.237.2.52"
VPS_USER="root"
VPS_PATH="/var/www/html/realestate"
DB_NAME="realestate"
DB_USER="sidhyk"
DB_PASS="Tz#669933"
DOMAIN="realestate.fmcqatar.com"

echo "=========================================="
echo "Fresh VPS Deployment"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Database: $DB_NAME"
echo "DB User: $DB_USER"
echo "VPS Path: $VPS_PATH"
echo "=========================================="
echo ""

# Step 1: Create database and user
echo "Step 1: Creating database and user..."
mysql -u root -p <<EOF
-- Create database
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user and grant privileges
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SELECT 'Database and user created successfully!' as Status;
SHOW DATABASES LIKE '$DB_NAME';
EOF

echo ""
echo "Step 2: Backing up existing realestate folder (if exists)..."
if [ -d "$VPS_PATH" ]; then
    BACKUP_DIR="/var/www/html/realestate_backup_$(date +%Y%m%d_%H%M%S)"
    echo "  Backing up to: $BACKUP_DIR"
    mv "$VPS_PATH" "$BACKUP_DIR" || echo "  Warning: Could not backup (may not exist)"
else
    echo "  No existing folder to backup"
fi

echo ""
echo "Step 3: Creating new realestate directory..."
mkdir -p "$VPS_PATH"
chown -R www-data:www-data "$VPS_PATH"
chmod -R 755 "$VPS_PATH"

echo ""
echo "Step 4: Files need to be copied manually or via SCP"
echo "  From local machine, run:"
echo "  scp -r * root@$VPS_HOST:$VPS_PATH/"
echo ""
echo "  Or use SFTP/FileZilla to upload all files"
echo ""

echo "Step 5: After files are copied, run database import..."
echo "  mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < database/complete_schema_xampp.sql"
echo "  OR"
echo "  mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < database/schema.sql"
echo ""

echo "Step 6: Update config files on VPS..."
echo "  Update config/database.php with:"
echo "    DB_NAME = '$DB_NAME'"
echo "    DB_USER = '$DB_USER'"
echo "    DB_PASS = '$DB_PASS'"
echo ""
echo "  Update config/config.php with:"
echo "    BASE_URL = 'https://$DOMAIN'"
echo ""

echo "Step 7: Set file permissions..."
echo "  chown -R www-data:www-data $VPS_PATH"
echo "  find $VPS_PATH -type f -exec chmod 644 {} \\;"
echo "  find $VPS_PATH -type d -exec chmod 755 {} \\;"
echo ""

echo "=========================================="
echo "Deployment Steps Summary"
echo "=========================================="
echo "1. ✓ Database and user created"
echo "2. ✓ Directory structure ready"
echo "3. ⏳ Copy files to VPS (manual step)"
echo "4. ⏳ Import database schema"
echo "5. ⏳ Update config files"
echo "6. ⏳ Set permissions"
echo "=========================================="

