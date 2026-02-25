#!/bin/bash
# Finish Deployment - Run this on VPS after files are copied

cd /var/www/html/realestate

echo "=========================================="
echo "Finishing Deployment"
echo "=========================================="
echo ""

# Update config files
echo "Step 1: Updating config files..."
sed -i "s/define('DB_NAME', '[^']*');/define('DB_NAME', 'realestate');/" config/database.php
sed -i "s/define('DB_USER', '[^']*');/define('DB_USER', 'sidhyk');/" config/database.php
sed -i "s/define('DB_PASS', '[^']*');/define('DB_PASS', 'Tz#669933');/" config/database.php
sed -i "s|define('BASE_URL', '[^']*');|define('BASE_URL', 'https://realestate.fmcqatar.com');|" config/config.php
echo "✓ Config files updated"
echo ""

# Import database
echo "Step 2: Importing database schema..."
if [ -f "database/schema.sql" ]; then
    mysql -u sidhyk -p'Tz#669933' realestate < database/schema.sql
    echo "✓ Database imported from schema.sql"
elif [ -f "database/complete_schema_xampp.sql" ]; then
    mysql -u sidhyk -p'Tz#669933' realestate < database/complete_schema_xampp.sql
    echo "✓ Database imported from complete_schema_xampp.sql"
else
    echo "⚠ Database schema file not found!"
fi
echo ""

# Set permissions
echo "Step 3: Setting file permissions..."
chown -R www-data:www-data /var/www/html/realestate
find /var/www/html/realestate -type f -exec chmod 644 {} \;
find /var/www/html/realestate -type d -exec chmod 755 {} \;
echo "✓ Permissions set"
echo ""

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Test the site: https://realestate.fmcqatar.com"
echo "=========================================="

