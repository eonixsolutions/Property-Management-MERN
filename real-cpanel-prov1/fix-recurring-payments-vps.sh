#!/bin/bash
# Fix recurring_owner_payments.php on VPS

cd /var/www/html/realestate

# Backup first
cp includes/recurring_owner_payments.php includes/recurring_owner_payments.php.backup

# Comment out the duplicate require_once
sed -i "s|^require_once __DIR__ . '/../config/config.php';|// Don't require config.php here - it should already be included by the calling script\n// require_once __DIR__ . '/../config/config.php';|" includes/recurring_owner_payments.php

echo "✓ Fixed recurring_owner_payments.php"
echo "✓ Backup saved to includes/recurring_owner_payments.php.backup"

