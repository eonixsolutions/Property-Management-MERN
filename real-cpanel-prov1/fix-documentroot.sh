#!/bin/bash

# Fix DocumentRoot in Apache virtual host configurations

HTTP_CONFIG="/etc/apache2/sites-available/realestate-http.conf"
SSL_CONFIG="/etc/apache2/sites-available/realestate-http-le-ssl.conf"

echo "Fixing DocumentRoot in Apache configurations..."
echo ""

# Backup files
echo "Backing up configurations..."
cp "$HTTP_CONFIG" "${HTTP_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SSL_CONFIG" "${SSL_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Update HTTP config
echo "Updating HTTP configuration..."
sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/realestate|g' "$HTTP_CONFIG"

# Update SSL config
echo "Updating SSL configuration..."
sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/realestate|g' "$SSL_CONFIG"

echo ""
echo "Updated DocumentRoot to: /var/www/html/realestate"
echo ""
echo "Verifying changes:"
grep "DocumentRoot" "$HTTP_CONFIG"
grep "DocumentRoot" "$SSL_CONFIG"
echo ""

echo "Testing Apache configuration..."
apache2ctl configtest

if [ $? -eq 0 ]; then
    echo ""
    echo "Configuration test passed!"
    echo "Restarting Apache..."
    systemctl restart apache2
    echo ""
    echo "Apache restarted. The site should now work correctly!"
    echo ""
    echo "Test with: curl -I https://realestate.fmcqatar.com"
else
    echo ""
    echo "ERROR: Configuration test failed!"
    echo "Please check the configuration manually."
fi

