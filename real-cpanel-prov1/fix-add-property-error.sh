#!/bin/bash
# Fix Add Property Error - Run this on VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Fixing Add Property Error"
echo "=========================================="
echo ""

# 1. Check Apache error log for specific error
echo "1. Checking Apache error log..."
tail -30 /var/log/apache2/error.log | grep -i "properties\|add.php\|fatal\|error\|undefined" | tail -10
echo ""

# 2. Check if properties table exists
echo "2. Checking properties table..."
mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SHOW TABLES LIKE 'properties';" 2>/dev/null
echo ""

# 3. Check properties table structure
echo "3. Checking properties table columns..."
mysql -u sidhyk -p'Tz#669933' -e "USE realestate; DESCRIBE properties;" 2>/dev/null
echo ""

# 4. Add missing columns if needed
echo "4. Adding missing columns..."
mysql -u sidhyk -p'Tz#669933' realestate <<EOF
-- Add owner_rent_start_date if it doesn't exist
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_rent_start_date DATE DEFAULT NULL AFTER monthly_rent_to_owner;

-- Add contact_number if it doesn't exist
ALTER TABLE properties ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20) DEFAULT NULL AFTER notes;

-- Add default_rent if it doesn't exist
ALTER TABLE properties ADD COLUMN IF NOT EXISTS default_rent DECIMAL(10,2) DEFAULT 0.00 AFTER purchase_date;

-- Add owner fields if they don't exist
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255) DEFAULT NULL AFTER is_unit;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_contact VARCHAR(255) DEFAULT NULL AFTER owner_name;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255) DEFAULT NULL AFTER owner_contact;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20) DEFAULT NULL AFTER owner_email;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS monthly_rent_to_owner DECIMAL(10,2) DEFAULT 0.00 AFTER owner_phone;

-- Add unit fields if they don't exist
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parent_property_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS unit_name VARCHAR(100) DEFAULT NULL AFTER parent_property_id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_unit TINYINT(1) DEFAULT 0 AFTER unit_name;

SELECT 'Columns check complete' as Status;
EOF

echo ""
echo "5. Verifying columns..."
mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SHOW COLUMNS FROM properties LIKE 'owner_rent_start_date';" 2>/dev/null
mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SHOW COLUMNS FROM properties LIKE 'contact_number';" 2>/dev/null
echo ""

# 6. Test PHP syntax
echo "6. Testing PHP syntax..."
php -l properties/add.php 2>&1 | head -5
echo ""

echo "=========================================="
echo "Fix Complete!"
echo "=========================================="
echo "Try adding a property again."
echo "If still errors, check: tail -f /var/log/apache2/error.log"
echo "=========================================="

