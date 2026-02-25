#!/bin/bash

# Script to verify the realestate application setup

REALESTATE_DIR="/var/www/html/realestate"

echo "=========================================="
echo "Verifying Realestate Application Setup"
echo "=========================================="
echo ""

# Check if directory exists
if [ ! -d "$REALESTATE_DIR" ]; then
    echo "ERROR: Directory $REALESTATE_DIR does not exist!"
    exit 1
fi

echo "✓ Directory exists: $REALESTATE_DIR"
echo ""

# Check for key files
echo "Checking for key files:"
if [ -f "$REALESTATE_DIR/index.php" ]; then
    echo "  ✓ index.php exists"
else
    echo "  ✗ index.php NOT found"
fi

if [ -f "$REALESTATE_DIR/config/config.php" ]; then
    echo "  ✓ config/config.php exists"
    echo ""
    echo "  BASE_URL configuration:"
    grep "BASE_URL" "$REALESTATE_DIR/config/config.php" | head -1
else
    echo "  ✗ config/config.php NOT found"
fi

if [ -f "$REALESTATE_DIR/config/database.php" ]; then
    echo "  ✓ config/database.php exists"
else
    echo "  ✗ config/database.php NOT found"
fi

if [ -d "$REALESTATE_DIR/uploads" ]; then
    echo "  ✓ uploads/ directory exists"
    UPLOADS_PERM=$(stat -c "%a" "$REALESTATE_DIR/uploads" 2>/dev/null || stat -f "%OLp" "$REALESTATE_DIR/uploads" 2>/dev/null)
    echo "    Permissions: $UPLOADS_PERM (should be 755 or 775)"
else
    echo "  ✗ uploads/ directory NOT found"
fi

echo ""
echo "Checking Apache virtual host configuration:"
echo ""

# Check HTTP config
if [ -f "/etc/apache2/sites-available/realestate-http.conf" ]; then
    echo "HTTP Virtual Host:"
    grep -E "ServerName|DocumentRoot" /etc/apache2/sites-available/realestate-http.conf | head -2
    echo ""
fi

# Check SSL config
if [ -f "/etc/apache2/sites-available/realestate-http-le-ssl.conf" ]; then
    echo "SSL Virtual Host (Let's Encrypt):"
    grep -E "ServerName|DocumentRoot" /etc/apache2/sites-available/realestate-http-le-ssl.conf | head -2
    echo ""
fi

# Check enabled sites
echo "Enabled Apache sites:"
ls -la /etc/apache2/sites-enabled/ | grep realestate
echo ""

# Check file permissions
echo "Checking file ownership:"
OWNER=$(stat -c "%U:%G" "$REALESTATE_DIR" 2>/dev/null || stat -f "%Su:%Sg" "$REALESTATE_DIR" 2>/dev/null)
echo "  Directory owner: $OWNER"
echo "  (Should be www-data:www-data for Apache)"
echo ""

# List some files in the directory
echo "Sample files in realestate directory:"
ls -la "$REALESTATE_DIR" | head -10
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="

