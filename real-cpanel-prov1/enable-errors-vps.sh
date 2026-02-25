#!/bin/bash
# Enable error display temporarily - Run this on VPS

cd /var/www/html/realestate

echo "Enabling error display temporarily..."

# Backup config
cp config/config.php config/config.php.backup.$(date +%Y%m%d_%H%M%S)

# Add error display at the top of config.php (after <?php)
sed -i "2i ini_set('display_errors', 1);\nerror_reporting(E_ALL);" config/config.php

echo "✓ Error display enabled"
echo ""
echo "Now try adding a property and you'll see the actual error."
echo ""
echo "To disable later, run:"
echo "mv config/config.php.backup.* config/config.php"

