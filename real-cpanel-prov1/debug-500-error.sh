#!/bin/bash
# Debug 500 Error - Run this on VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Debugging 500 Error"
echo "=========================================="
echo ""

# 1. Check PHP error log
echo "1. Checking PHP error logs..."
if [ -f "/var/log/php8.1-fpm.log" ]; then
    echo "PHP-FPM log:"
    tail -20 /var/log/php8.1-fpm.log | grep -i "error\|fatal\|warning" | tail -10
elif [ -f "/var/log/php_errors.log" ]; then
    echo "PHP errors log:"
    tail -20 /var/log/php_errors.log | grep -i "error\|fatal\|warning" | tail -10
else
    echo "No PHP log found. Checking PHP error log location:"
    php -r "echo ini_get('error_log');" 2>/dev/null
fi
echo ""

# 2. Check if error display is enabled
echo "2. Checking error display settings..."
grep -E "display_errors|error_reporting" config/config.php | head -5
echo ""

# 3. Test PHP syntax
echo "3. Testing PHP syntax..."
php -l properties/add.php 2>&1
echo ""

# 4. Test if file is accessible
echo "4. Testing file access..."
ls -la properties/add.php
echo ""

# 5. Check permissions
echo "5. Checking permissions..."
stat -c "%U:%G %a %n" properties/add.php
echo ""

# 6. Test database connection from PHP
echo "6. Testing database connection from PHP..."
php -r "
require 'config/database.php';
\$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (\$conn->connect_error) {
    echo 'ERROR: ' . \$conn->connect_error . PHP_EOL;
} else {
    echo 'OK: Database connected' . PHP_EOL;
    \$result = \$conn->query('SELECT COUNT(*) as count FROM properties');
    if (\$result) {
        \$row = \$result->fetch_assoc();
        echo 'Properties table has ' . \$row['count'] . ' rows' . PHP_EOL;
    }
    \$conn->close();
}
"
echo ""

# 7. Check if required files exist
echo "7. Checking required files..."
[ -f "includes/recurring_owner_payments.php" ] && echo "✓ includes/recurring_owner_payments.php exists" || echo "✗ includes/recurring_owner_payments.php MISSING"
[ -f "config/config.php" ] && echo "✓ config/config.php exists" || echo "✗ config/config.php MISSING"
[ -f "config/database.php" ] && echo "✓ config/database.php exists" || echo "✗ config/database.php MISSING"
echo ""

echo "=========================================="
echo "Next: Try accessing the page and check for errors"
echo "=========================================="

