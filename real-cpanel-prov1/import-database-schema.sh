#!/bin/bash

# Import database schema

echo "=========================================="
echo "Importing Database Schema"
echo "=========================================="
echo ""

SCHEMA_FILE="/var/www/html/realestate/database/schema.sql"

# Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "ERROR: Schema file not found: $SCHEMA_FILE"
    echo ""
    echo "Looking for schema files..."
    find /var/www/html/realestate -name "*.sql" -type f 2>/dev/null
    exit 1
fi

echo "Schema file found: $SCHEMA_FILE"
echo ""

# Check file size
FILE_SIZE=$(stat -f%z "$SCHEMA_FILE" 2>/dev/null || stat -c%s "$SCHEMA_FILE" 2>/dev/null)
echo "File size: $FILE_SIZE bytes"
echo ""

# Import schema
echo "Importing schema into database 'realv1'..."
mysql -u realv1_user -p'Tz@669933' realv1 < "$SCHEMA_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Schema imported successfully!"
    echo ""
    
    # Verify tables were created
    echo "Verifying tables..."
    TABLE_COUNT=$(mysql -u realv1_user -p'Tz@669933' -e "USE realv1; SHOW TABLES;" realv1 2>/dev/null | wc -l)
    TABLE_COUNT=$((TABLE_COUNT - 1))  # Subtract header line
    
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo "✓ Found $TABLE_COUNT tables in database"
        echo ""
        echo "Tables:"
        mysql -u realv1_user -p'Tz@669933' -e "USE realv1; SHOW TABLES;" realv1 2>/dev/null | tail -n +2
    else
        echo "⚠ No tables found after import"
    fi
else
    echo ""
    echo "✗ Import failed. Check the error messages above."
    exit 1
fi

echo ""
echo "=========================================="
echo "Database Setup Complete!"
echo "=========================================="
echo ""
echo "You can now access the application at:"
echo "  https://realestate.fmcqatar.com"
echo ""
echo "Default login credentials:"
echo "  Email: sidhykqatar@gmail.com"
echo "  Password: tz669933"
echo ""

