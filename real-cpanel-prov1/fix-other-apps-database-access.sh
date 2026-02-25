#!/bin/bash
# Fix database access for other applications (rashid, safeway1, newsabra, etc.)
# Run this on VPS

echo "=========================================="
echo "Fixing Database Access for Other Applications"
echo "=========================================="
echo ""

# List of databases that need access
DATABASES=("newsabra" "rashid" "safeway1" "safeway")

DB_USER="sidhyk"
DB_PASS="Tz#669933"
ROOT_PASS="Tz@669933"

echo "1. Checking which databases exist..."
mysql -u root -p"$ROOT_PASS" -e "SHOW DATABASES;" 2>/dev/null | grep -E "newsabra|rashid|safeway"
echo ""

echo "2. Checking current privileges for user '$DB_USER'..."
mysql -u root -p"$ROOT_PASS" -e "SHOW GRANTS FOR '$DB_USER'@'localhost';" 2>/dev/null
echo ""

echo "3. Granting access to all databases..."
for DB in "${DATABASES[@]}"; do
    echo "   Processing database: $DB"
    
    # Check if database exists
    DB_EXISTS=$(mysql -u root -p"$ROOT_PASS" -e "SHOW DATABASES LIKE '$DB';" 2>/dev/null | grep -c "$DB")
    
    if [ "$DB_EXISTS" -eq 0 ]; then
        echo "   ⚠ Database '$DB' does not exist. Creating it..."
        mysql -u root -p"$ROOT_PASS" << EOF
CREATE DATABASE IF NOT EXISTS $DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON $DB.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
        echo "   ✓ Database '$DB' created and access granted"
    else
        echo "   ✓ Database '$DB' exists"
        # Grant privileges anyway to ensure access
        mysql -u root -p"$ROOT_PASS" << EOF
GRANT ALL PRIVILEGES ON $DB.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
        echo "   ✓ Access granted to '$DB'"
    fi
    echo ""
done

echo "4. Verifying access..."
for DB in "${DATABASES[@]}"; do
    echo -n "   Testing access to '$DB': "
    mysql -u "$DB_USER" -p"$DB_PASS" -e "USE $DB; SELECT 'OK' as Status;" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "   ✓ Access OK"
    else
        echo "   ✗ Access FAILED"
    fi
done
echo ""

echo "5. Checking all databases user has access to..."
mysql -u root -p"$ROOT_PASS" -e "SELECT DISTINCT table_schema FROM information_schema.table_privileges WHERE grantee = '\''$DB_USER'@'localhost'\'';" 2>/dev/null
echo ""

echo "=========================================="
echo "Done!"
echo "=========================================="
echo ""
echo "If apps still don't work, check:"
echo "1. Database credentials in each app's config file"
echo "2. Apache error logs: tail -f /var/log/apache2/error.log"
echo "3. PHP error logs"
echo ""


