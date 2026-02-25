#!/bin/bash

# Update BASE_URL in config.php on the server

CONFIG_FILE="/var/www/html/realestate/config/config.php"

echo "Updating BASE_URL in config.php..."
echo ""

# Backup the config file
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Update BASE_URL - handle both old formats
# Old: https://rs.big4financialservices.com/realestate
# New: https://realestate.fmcqatar.com

sed -i "s|define('BASE_URL', 'https://rs\.big4financialservices\.com/realestate');|define('BASE_URL', 'https://realestate.fmcqatar.com');|g" "$CONFIG_FILE"

# Also handle if it's just the domain without /realestate
sed -i "s|define('BASE_URL', 'https://rs\.big4financialservices\.com');|define('BASE_URL', 'https://realestate.fmcqatar.com');|g" "$CONFIG_FILE"

# Also handle http version
sed -i "s|define('BASE_URL', 'http://rs\.big4financialservices\.com/realestate');|define('BASE_URL', 'https://realestate.fmcqatar.com');|g" "$CONFIG_FILE"
sed -i "s|define('BASE_URL', 'http://rs\.big4financialservices\.com');|define('BASE_URL', 'https://realestate.fmcqatar.com');|g" "$CONFIG_FILE"

echo "Updated BASE_URL. Verifying:"
grep "BASE_URL" "$CONFIG_FILE" | head -1

echo ""
echo "Done! The application should now use the correct domain."

