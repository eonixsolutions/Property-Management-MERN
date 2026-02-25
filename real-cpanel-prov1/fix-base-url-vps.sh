#!/bin/bash
# Fix BASE_URL on VPS - Run this on VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Fixing BASE_URL Configuration"
echo "=========================================="
echo ""

# Find config.php
CONFIG_FILE=$(find . -name "config.php" -type f | head -1)

if [ -z "$CONFIG_FILE" ]; then
    echo "✗ config.php not found!"
    echo "Searching for config files..."
    find . -name "*.php" -path "*/config/*" -type f
    exit 1
fi

echo "Found config.php at: $CONFIG_FILE"
echo ""

# Backup original
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✓ Backup created"

# Update BASE_URL
sed -i "s|define('BASE_URL', '[^']*');|define('BASE_URL', 'https://realestate.fmcqatar.com');|" "$CONFIG_FILE"

echo "✓ BASE_URL updated"
echo ""

# Verify
echo "Current BASE_URL setting:"
grep "BASE_URL" "$CONFIG_FILE" | head -1
echo ""

# Also update database config if needed
DB_FILE=$(find . -name "database.php" -type f | head -1)
if [ -n "$DB_FILE" ]; then
    echo "Updating database.php..."
    sed -i "s/define('DB_NAME', '[^']*');/define('DB_NAME', 'realestate');/" "$DB_FILE"
    sed -i "s/define('DB_USER', '[^']*');/define('DB_USER', 'sidhyk');/" "$DB_FILE"
    sed -i "s/define('DB_PASS', '[^']*');/define('DB_PASS', 'Tz#669933');/" "$DB_FILE"
    echo "✓ Database config updated"
fi

echo ""
echo "=========================================="
echo "Configuration Updated!"
echo "=========================================="
echo "Clear browser cache and try again:"
echo "https://realestate.fmcqatar.com"
echo "=========================================="

