#!/bin/bash
# Fix and import database schema - Run this on VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Fixing and Importing Database Schema"
echo "=========================================="
echo ""

# Create a cleaned version of the schema
echo "Cleaning schema.sql file..."
sed -e '/^CREATE DATABASE/,/;/d' \
    -e '/^USE /d' \
    -e 's/property_db/realestate/g' \
    database/schema.sql > /tmp/schema_cleaned.sql

echo "✓ Schema cleaned"
echo ""

# Import the cleaned schema
echo "Importing database..."
mysql -u sidhyk -p'Tz#669933' realestate < /tmp/schema_cleaned.sql

if [ $? -eq 0 ]; then
    echo "✓ Database imported successfully!"
    echo ""
    echo "Verifying tables:"
    mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SHOW TABLES;" 2>/dev/null | head -20
    echo ""
    TABLE_COUNT=$(mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SHOW TABLES;" 2>/dev/null | wc -l)
    echo "Total tables: $((TABLE_COUNT - 1))"
else
    echo "✗ Import failed. Check errors above."
    echo ""
    echo "Trying alternative: complete_schema_xampp.sql"
    if [ -f "database/complete_schema_xampp.sql" ]; then
        sed -e '/^CREATE DATABASE/,/;/d' \
            -e '/^USE /d' \
            -e 's/property_db/realestate/g' \
            database/complete_schema_xampp.sql > /tmp/schema_cleaned2.sql
        mysql -u sidhyk -p'Tz#669933' realestate < /tmp/schema_cleaned2.sql
        echo "✓ Imported from complete_schema_xampp.sql"
    fi
fi

echo ""
echo "=========================================="
echo "Database import complete!"
echo "=========================================="

