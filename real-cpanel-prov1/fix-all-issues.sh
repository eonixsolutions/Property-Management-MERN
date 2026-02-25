#!/bin/bash

# Comprehensive fix for all domain-related issues

echo "=========================================="
echo "Fixing All Domain Configuration Issues"
echo "=========================================="
echo ""

# Step 1: Update BASE_URL in config.php
echo "Step 1: Updating BASE_URL in config.php..."
CONFIG_FILE="/var/www/html/realestate/config/config.php"

if [ -f "$CONFIG_FILE" ]; then
    # Backup
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update BASE_URL - replace any old domain with new one
    sed -i "s|define('BASE_URL', 'https://rs\.big4financialservices\.com/realestate');|define('BASE_URL', 'https://realestate.fmcqatar.com');|g" "$CONFIG_FILE"
    sed -i "s|define('BASE_URL', 'https://rs\.big4financialservices\.com');|define('BASE_URL', 'https://realestate.fmcqatar.com');|g" "$CONFIG_FILE"
    sed -i "s|define('BASE_URL', 'http://rs\.big4financialservices\.com/realestate');|define('BASE_URL', 'https://realestate.fmcqatar.com');|g" "$CONFIG_FILE"
    sed -i "s|define('BASE_URL', 'http://rs\.big4financialservices\.com');|define('BASE_URL', 'https://realestate.fmcqatar.com');|g" "$CONFIG_FILE"
    
    echo "✓ Updated BASE_URL"
    echo "  Current value:"
    grep "BASE_URL" "$CONFIG_FILE" | head -1
else
    echo "✗ Config file not found: $CONFIG_FILE"
fi

echo ""

# Step 2: Verify DocumentRoot
echo "Step 2: Verifying DocumentRoot..."
HTTP_CONFIG="/etc/apache2/sites-available/realestate-http.conf"
SSL_CONFIG="/etc/apache2/sites-available/realestate-http-le-ssl.conf"

if grep -q "DocumentRoot /var/www/html/realestate" "$HTTP_CONFIG" 2>/dev/null; then
    echo "✓ HTTP DocumentRoot is correct"
else
    echo "✗ HTTP DocumentRoot needs fixing"
    sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/realestate|g' "$HTTP_CONFIG"
    echo "  Fixed HTTP DocumentRoot"
fi

if grep -q "DocumentRoot /var/www/html/realestate" "$SSL_CONFIG" 2>/dev/null; then
    echo "✓ SSL DocumentRoot is correct"
else
    echo "✗ SSL DocumentRoot needs fixing"
    sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/realestate|g' "$SSL_CONFIG"
    echo "  Fixed SSL DocumentRoot"
fi

echo ""

# Step 3: Check Apache status
echo "Step 3: Checking Apache status..."
systemctl is-active --quiet apache2
if [ $? -eq 0 ]; then
    echo "✓ Apache is running"
else
    echo "✗ Apache is not running - starting it..."
    systemctl start apache2
fi

echo ""

# Step 4: Test Apache configuration
echo "Step 4: Testing Apache configuration..."
apache2ctl configtest
if [ $? -eq 0 ]; then
    echo "✓ Apache configuration is valid"
    echo "  Restarting Apache..."
    systemctl restart apache2
    echo "✓ Apache restarted"
else
    echo "✗ Apache configuration has errors!"
    echo "  Please check the errors above"
fi

echo ""

# Step 5: Check enabled sites
echo "Step 5: Checking enabled sites..."
ENABLED_SITES=$(ls -1 /etc/apache2/sites-enabled/ | grep realestate)
if echo "$ENABLED_SITES" | grep -q "realestate-http.conf"; then
    echo "✓ HTTP site is enabled"
else
    echo "✗ HTTP site is not enabled - enabling..."
    a2ensite realestate-http.conf
fi

if echo "$ENABLED_SITES" | grep -q "realestate-http-le-ssl.conf"; then
    echo "✓ SSL site is enabled"
else
    echo "⚠ SSL site is not enabled (this is OK if you want HTTP only)"
fi

echo ""

# Step 6: Test the site
echo "Step 6: Testing site accessibility..."
echo "  Testing HTTP..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://realestate.fmcqatar.com 2>/dev/null)
if [ "$HTTP_RESPONSE" = "200" ] || [ "$HTTP_RESPONSE" = "302" ] || [ "$HTTP_RESPONSE" = "301" ]; then
    echo "  ✓ HTTP is responding (code: $HTTP_RESPONSE)"
else
    echo "  ✗ HTTP not responding correctly (code: $HTTP_RESPONSE)"
fi

echo "  Testing HTTPS..."
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://realestate.fmcqatar.com 2>/dev/null)
if [ "$HTTPS_RESPONSE" = "200" ] || [ "$HTTPS_RESPONSE" = "302" ] || [ "$HTTPS_RESPONSE" = "301" ]; then
    echo "  ✓ HTTPS is responding (code: $HTTPS_RESPONSE)"
else
    echo "  ✗ HTTPS not responding correctly (code: $HTTPS_RESPONSE)"
fi

echo ""
echo "=========================================="
echo "Fix Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - BASE_URL updated to: https://realestate.fmcqatar.com"
echo "  - DocumentRoot verified: /var/www/html/realestate"
echo "  - Apache restarted"
echo ""
echo "Test the site:"
echo "  http://realestate.fmcqatar.com"
echo "  https://realestate.fmcqatar.com"
echo ""

