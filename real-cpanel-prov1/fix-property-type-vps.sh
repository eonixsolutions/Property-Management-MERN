#!/bin/bash
# Fix property_type ENUM on VPS
# Run this on the VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Fixing Property Type ENUM"
echo "=========================================="
echo ""

echo "Current property_type ENUM:"
mysql -u sidhyk -p'Tz#669933' realestate -e "SHOW COLUMNS FROM properties LIKE 'property_type';" 2>/dev/null
echo ""

echo "Updating property_type ENUM to include all types..."
mysql -u sidhyk -p'Tz#669933' realestate << 'EOF'
ALTER TABLE properties MODIFY COLUMN property_type ENUM(
    'Apartment', 
    'Villa', 
    'House', 
    'Condo', 
    'Townhouse', 
    'Studio', 
    'Penthouse', 
    'Commercial', 
    'Office', 
    'Shop', 
    'Warehouse', 
    'Land', 
    'Other'
) NOT NULL;
EOF

if [ $? -eq 0 ]; then
    echo "✓ Property type ENUM updated successfully"
else
    echo "✗ Failed to update property_type ENUM"
    exit 1
fi

echo ""
echo "Updated property_type ENUM:"
mysql -u sidhyk -p'Tz#669933' realestate -e "SHOW COLUMNS FROM properties LIKE 'property_type';" 2>/dev/null
echo ""

echo "=========================================="
echo "Done! You can now add properties with type 'Studio'"
echo "=========================================="


