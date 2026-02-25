#!/bin/bash

# Fix schema import by replacing database name

echo "=========================================="
echo "Fixing Schema Import"
echo "=========================================="
echo ""

SCHEMA_FILE="/var/www/html/realestate/database/schema.sql"
TEMP_SCHEMA="/tmp/schema_realv1.sql"

# Create a modified version of schema.sql that uses realv1 instead of property_db
echo "Creating modified schema file..."
sed 's/property_db/realv1/g' "$SCHEMA_FILE" > "$TEMP_SCHEMA"

# Remove CREATE DATABASE and USE statements since we're already in the right database
sed -i '/^CREATE DATABASE/d' "$TEMP_SCHEMA"
sed -i '/^USE /d' "$TEMP_SCHEMA"

echo "✓ Modified schema created"
echo ""

# Import the modified schema
echo "Importing schema into database 'realv1'..."
mysql -u realv1_user -p'Tz@669933' realv1 < "$TEMP_SCHEMA" 2>&1

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
        echo ""
        echo "Checking for errors..."
        mysql -u realv1_user -p'Tz@669933' realv1 < "$TEMP_SCHEMA" 2>&1 | grep -i error
    fi
    
    # Clean up temp file
    rm -f "$TEMP_SCHEMA"
else
    echo ""
    echo "✗ Import failed. Check the error messages above."
    echo ""
    echo "Trying alternative method..."
    
    # Alternative: Import directly and ignore database switching
    mysql -u realv1_user -p'Tz@669933' realv1 <<EOF
$(sed 's/property_db/realv1/g' "$SCHEMA_FILE" | grep -v '^CREATE DATABASE' | grep -v '^USE ')
EOF
fi

echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="

