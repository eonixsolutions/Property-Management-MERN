#!/bin/bash
# Import Database Schema on VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Importing Database Schema"
echo "=========================================="
echo ""

# Check which schema file exists
if [ -f "database/schema.sql" ]; then
    echo "Found: database/schema.sql"
    echo "Importing..."
    mysql -u sidhyk -p'Tz#669933' realestate < database/schema.sql
    echo "✓ Database imported from schema.sql"
elif [ -f "database/complete_schema_xampp.sql" ]; then
    echo "Found: database/complete_schema_xampp.sql"
    echo "Importing..."
    mysql -u sidhyk -p'Tz#669933' realestate < database/complete_schema_xampp.sql
    echo "✓ Database imported from complete_schema_xampp.sql"
else
    echo "✗ No schema file found!"
    echo "Looking for SQL files..."
    find . -name "*.sql" -type f
    exit 1
fi

echo ""
echo "Verifying tables were created..."
TABLE_COUNT=$(mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SHOW TABLES;" 2>/dev/null | wc -l)
if [ "$TABLE_COUNT" -gt 1 ]; then
    echo "✓ Success! Found $((TABLE_COUNT - 1)) tables"
    echo ""
    echo "Tables created:"
    mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SHOW TABLES;" 2>/dev/null
else
    echo "✗ No tables found! Import may have failed."
    echo "Check for errors above."
fi

echo ""
echo "=========================================="
echo "Next: Check Apache error log if 500 persists"
echo "tail -50 /var/log/apache2/error.log"
echo "=========================================="

