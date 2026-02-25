#!/bin/bash
# Fix realestate database access
# Run this on VPS

echo "=========================================="
echo "Fixing Realestate Database Access"
echo "=========================================="
echo ""

ROOT_PASS="Tz@669933"
DB_USER="sidhyk"
DB_PASS="Tz#669933"
DB_NAME="realestate"

# Check if database exists
echo "1. Checking if database '$DB_NAME' exists..."
DB_EXISTS=$(mysql -u root -p"$ROOT_PASS" -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null | grep -c "$DB_NAME")

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "   ⚠ Database '$DB_NAME' does not exist. Creating it..."
    mysql -u root -p"$ROOT_PASS" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
    echo "   ✓ Database created"
else
    echo "   ✓ Database exists"
fi
echo ""

# Grant access
echo "2. Granting access to database '$DB_NAME' for user '$DB_USER'..."
mysql -u root -p"$ROOT_PASS" << EOF
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
    echo "   ✓ Access granted"
else
    echo "   ✗ Failed to grant access"
    exit 1
fi
echo ""

# Verify access
echo "3. Verifying access..."
mysql -u "$DB_USER" -p"$DB_PASS" -e "USE \`$DB_NAME\`; SELECT 'Database access OK' as Status;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✓ Access verified - OK"
else
    echo "   ✗ Access verification failed"
    exit 1
fi
echo ""

# Check tables
echo "4. Checking tables in database..."
TABLE_COUNT=$(mysql -u "$DB_USER" -p"$DB_PASS" -e "USE \`$DB_NAME\`; SHOW TABLES;" 2>/dev/null | wc -l)
echo "   Found $((TABLE_COUNT - 1)) tables"
echo ""

# Show current privileges
echo "5. Current privileges for '$DB_USER' on '$DB_NAME':"
mysql -u root -p"$ROOT_PASS" -e "SHOW GRANTS FOR '$DB_USER'@'localhost';" 2>/dev/null | grep -i "$DB_NAME"
echo ""

echo "=========================================="
echo "Done! Realestate database should now work."
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart Apache: systemctl restart apache2"
echo "2. Test: https://realestate.fmcqatar.com/landing.php"
echo ""

