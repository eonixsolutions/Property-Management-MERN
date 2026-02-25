#!/bin/bash
# Fix add.php and recurring_owner_payments.php on VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Fixing add property functionality"
echo "=========================================="

# 1. Fix recurring_owner_payments.php (comment out duplicate require)
if [ -f "includes/recurring_owner_payments.php" ]; then
    cp includes/recurring_owner_payments.php includes/recurring_owner_payments.php.backup
    sed -i '7s|^require_once|// require_once|' includes/recurring_owner_payments.php
    echo "✓ Fixed recurring_owner_payments.php"
else
    echo "✗ includes/recurring_owner_payments.php not found"
fi

# 2. Add error handling to add.php (temporarily enable error display at top)
if [ -f "properties/add.php" ]; then
    # Check if error display is already enabled
    if ! grep -q "ini_set('display_errors'" properties/add.php; then
        # Add error display after the opening PHP tag
        sed -i "2i error_reporting(E_ALL);\nini_set('display_errors', 1);" properties/add.php
        echo "✓ Added error display to properties/add.php"
    else
        echo "✓ Error display already enabled in properties/add.php"
    fi
else
    echo "✗ properties/add.php not found"
fi

# 3. Test PHP syntax
echo ""
echo "Testing PHP syntax:"
php -l properties/add.php
php -l includes/recurring_owner_payments.php

echo ""
echo "=========================================="
echo "Done! Now try adding a property again."
echo "You should see any errors on screen."
echo "=========================================="

