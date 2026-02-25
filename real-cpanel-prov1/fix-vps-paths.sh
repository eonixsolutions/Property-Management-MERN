#!/bin/bash
# Fix VPS paths - Run this on VPS to find and update config files

cd /var/www/html/realestate

echo "=========================================="
echo "Finding Config Files"
echo "=========================================="
echo ""

# Find config files
echo "Searching for config files..."
find . -name "database.php" -type f
find . -name "config.php" -type f
echo ""

# Check directory structure
echo "Current directory structure:"
ls -la | head -20
echo ""

# Try different possible locations
echo "Checking common locations..."
[ -f "config/database.php" ] && echo "✓ Found: config/database.php" || echo "✗ Not found: config/database.php"
[ -f "config/config.php" ] && echo "✓ Found: config/config.php" || echo "✗ Not found: config/config.php"
[ -d "config" ] && echo "✓ config/ directory exists" || echo "✗ config/ directory missing"

echo ""
echo "If files are found, update them with:"
echo "sed -i \"s/define('DB_NAME', '[^']*');/define('DB_NAME', 'realestate');/\" <path_to_database.php>"
echo "sed -i \"s/define('DB_USER', '[^']*');/define('DB_USER', 'sidhyk');/\" <path_to_database.php>"
echo "sed -i \"s/define('DB_PASS', '[^']*');/define('DB_PASS', 'Tz#669933');/\" <path_to_database.php>"
echo "sed -i \"s|define('BASE_URL', '[^']*');|define('BASE_URL', 'https://realestate.fmcqatar.com');|\" <path_to_config.php>"

