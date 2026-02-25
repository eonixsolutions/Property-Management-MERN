#!/bin/bash
# Fix 500 Error - Run this on VPS

echo "=========================================="
echo "Diagnosing 500 Error"
echo "=========================================="
echo ""

cd /var/www/html/realestate

# Check Apache error logs
echo "1. Checking recent Apache errors:"
tail -20 /var/log/apache2/error.log | grep -i "realestate\|php\|fatal\|error" | tail -10
echo ""

# Check PHP syntax
echo "2. Checking PHP syntax in config files:"
php -l config/config.php 2>&1
php -l config/database.php 2>&1
echo ""

# Check file permissions
echo "3. Checking file permissions:"
ls -la config/ | head -5
echo ""

# Check if database connection works
echo "4. Testing database connection:"
php -r "
require 'config/database.php';
\$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (\$conn->connect_error) {
    echo '✗ Database connection failed: ' . \$conn->connect_error . PHP_EOL;
} else {
    echo '✓ Database connection successful' . PHP_EOL;
    \$conn->close();
}
"
echo ""

# Check BASE_URL
echo "5. Checking BASE_URL setting:"
grep "BASE_URL" config/config.php | head -1
echo ""

# Check file ownership
echo "6. Checking file ownership:"
stat -c "%U:%G %a %n" config/config.php
stat -c "%U:%G %a %n" config/database.php
echo ""

echo "=========================================="
echo "Common Fixes:"
echo "=========================================="
echo "1. Fix permissions:"
echo "   chown -R www-data:www-data /var/www/html/realestate"
echo "   find /var/www/html/realestate -type f -exec chmod 644 {} \\;"
echo "   find /var/www/html/realestate -type d -exec chmod 755 {} \\;"
echo ""
echo "2. Check error log for specific errors:"
echo "   tail -f /var/log/apache2/error.log"
echo ""
echo "3. Enable PHP error display (temporarily):"
echo "   Add to config/config.php:"
echo "   ini_set('display_errors', 1);"
echo "   error_reporting(E_ALL);"
echo "=========================================="

