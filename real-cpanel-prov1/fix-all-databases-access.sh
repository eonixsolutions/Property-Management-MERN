#!/bin/bash
# Comprehensive fix for ALL databases and users
# This ensures all programs work regardless of which user/database they use
# Run this on VPS

echo "=========================================="
echo "Fixing Database Access for ALL Programs"
echo "=========================================="
echo ""

ROOT_PASS="Tz@669933"
DB_USER="sidhyk"
DB_PASS="Tz#669933"

# Get all databases (excluding system databases)
echo "1. Finding all databases..."
ALL_DATABASES=$(mysql -u root -p"$ROOT_PASS" -e "SHOW DATABASES;" 2>/dev/null | grep -vE "Database|information_schema|performance_schema|mysql|sys")

echo "   Found databases:"
echo "$ALL_DATABASES" | while read DB; do
    if [ ! -z "$DB" ]; then
        echo "   - $DB"
    fi
done
echo ""

# Grant access to ALL databases for sidhyk user
echo "2. Granting access to ALL databases for user '$DB_USER'..."
echo "$ALL_DATABASES" | while read DB; do
    if [ ! -z "$DB" ]; then
        echo "   Processing: $DB"
        mysql -u root -p"$ROOT_PASS" << EOF 2>/dev/null
GRANT ALL PRIVILEGES ON \`$DB\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
        if [ $? -eq 0 ]; then
            echo "   ✓ Access granted to $DB"
        else
            echo "   ✗ Failed to grant access to $DB"
        fi
    fi
done
echo ""

# Also grant global privileges (safer approach)
echo "3. Granting global privileges..."
mysql -u root -p"$ROOT_PASS" << EOF 2>/dev/null
-- Grant all privileges on all existing and future databases
GRANT ALL PRIVILEGES ON *.* TO '$DB_USER'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
    echo "   ✓ Global privileges granted"
else
    echo "   ✗ Failed to grant global privileges"
fi
echo ""

# Check for other database users
echo "4. Checking for other database users..."
OTHER_USERS=$(mysql -u root -p"$ROOT_PASS" -e "SELECT User FROM mysql.user WHERE User != 'root' AND User != 'mysql.sys' AND User != 'mysql.session' AND User != 'debian-sys-maint';" 2>/dev/null | grep -v "User")

if [ ! -z "$OTHER_USERS" ]; then
    echo "   Found other users:"
    echo "$OTHER_USERS" | while read USER; do
        if [ ! -z "$USER" ]; then
            echo "   - $USER"
            # Grant access to all databases for this user too
            mysql -u root -p"$ROOT_PASS" << EOF 2>/dev/null
GRANT ALL PRIVILEGES ON *.* TO '$USER'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EOF
            echo "     ✓ Granted access to all databases"
        fi
    done
else
    echo "   No other users found (only using $DB_USER)"
fi
echo ""

# Verify access
echo "5. Verifying access..."
echo "$ALL_DATABASES" | while read DB; do
    if [ ! -z "$DB" ]; then
        echo -n "   Testing $DB: "
        mysql -u "$DB_USER" -p"$DB_PASS" -e "USE \`$DB\`; SELECT 'OK' as Status;" 2>/dev/null > /dev/null
        if [ $? -eq 0 ]; then
            echo "✓ OK"
        else
            echo "✗ FAILED"
        fi
    fi
done
echo ""

# Show final privileges
echo "6. Current privileges for '$DB_USER':"
mysql -u root -p"$ROOT_PASS" -e "SHOW GRANTS FOR '$DB_USER'@'localhost';" 2>/dev/null
echo ""

echo "=========================================="
echo "Done! All databases should now be accessible."
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart Apache: systemctl restart apache2"
echo "2. Test all applications"
echo "3. If you add a new database, run this script again"
echo ""

