#!/bin/bash

# Fix CSS and asset paths

echo "=========================================="
echo "Fixing CSS and Asset Paths"
echo "=========================================="
echo ""

# Check if CSS file exists
CSS_FILE="/var/www/html/realestate/assets/css/style.css"
if [ -f "$CSS_FILE" ]; then
    echo "✓ CSS file exists: $CSS_FILE"
    ls -la "$CSS_FILE"
else
    echo "✗ CSS file NOT found: $CSS_FILE"
    echo "Looking for CSS files..."
    find /var/www/html/realestate -name "*.css" -type f
fi

echo ""

# Check BASE_URL in config
echo "Current BASE_URL:"
grep "BASE_URL" /var/www/html/realestate/config/config.php | head -1

echo ""

# Check if assets directory has correct permissions
echo "Checking assets directory permissions:"
ls -ld /var/www/html/realestate/assets
ls -ld /var/www/html/realestate/assets/css

echo ""

# Test if CSS is accessible via web
echo "Testing CSS accessibility:"
echo "  URL: https://realestate.fmcqatar.com/assets/css/style.css"
curl -I https://realestate.fmcqatar.com/assets/css/style.css 2>&1 | head -5

echo ""

# Fix permissions if needed
echo "Setting correct permissions..."
chown -R www-data:www-data /var/www/html/realestate/assets
chmod -R 755 /var/www/html/realestate/assets
echo "✓ Permissions updated"

echo ""
echo "=========================================="
echo "CSS Fix Complete"
echo "=========================================="
echo ""
echo "If CSS still doesn't load, check:"
echo "1. Browser console for 404 errors"
echo "2. Apache error logs: tail -f /var/log/apache2/error.log"
echo "3. Verify BASE_URL is correct: https://realestate.fmcqatar.com"
echo ""

