#!/bin/bash
# Check and fix VPS files - Run this on VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Checking Realestate Directory"
echo "=========================================="
echo ""

echo "Current directory: $(pwd)"
echo ""

echo "Listing all files and directories:"
ls -la
echo ""

echo "Checking if directory is empty:"
if [ "$(ls -A)" ]; then
    echo "✓ Directory is NOT empty"
    echo ""
    echo "File count:"
    find . -type f | wc -l
    echo "Directory count:"
    find . -type d | wc -l
    echo ""
    echo "Top-level items:"
    ls -1 | head -20
else
    echo "✗ Directory is EMPTY - files were not copied!"
    echo ""
    echo "Checking parent directory:"
    ls -la /var/www/html/ | grep realestate
fi

echo ""
echo "Checking permissions:"
ls -ld /var/www/html/realestate
echo ""

echo "Checking ownership:"
stat -c "%U:%G %a %n" /var/www/html/realestate
echo ""

echo "If files exist but can't be seen, try:"
echo "chmod -R 755 /var/www/html/realestate"
echo "chown -R www-data:www-data /var/www/html/realestate"

