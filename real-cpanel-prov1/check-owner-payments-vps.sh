#!/bin/bash
# Check owner payments for test property on VPS

cd /var/www/html/realestate

echo "=========================================="
echo "Checking Owner Payments"
echo "=========================================="

mysql -u sidhyk -p'Tz#669933' realestate << 'EOF'
-- Check if owner_payments table exists
SELECT 'Checking owner_payments table...' as Status;
SHOW TABLES LIKE 'owner_payments';

-- Check properties with owner rent
SELECT 'Properties with owner rent:' as Status;
SELECT id, property_name, owner_name, monthly_rent_to_owner, owner_rent_start_date 
FROM properties 
WHERE monthly_rent_to_owner IS NOT NULL AND monthly_rent_to_owner > 0
LIMIT 10;

-- Check owner payments for all properties
SELECT 'Owner payments count:' as Status;
SELECT COUNT(*) as total_payments FROM owner_payments;

-- Check owner payments by property
SELECT 'Owner payments by property:' as Status;
SELECT op.property_id, p.property_name, COUNT(*) as payment_count, SUM(op.amount) as total_amount
FROM owner_payments op
LEFT JOIN properties p ON op.property_id = p.id
GROUP BY op.property_id, p.property_name
LIMIT 10;

-- Check owner payments for test property (if exists)
SELECT 'Owner payments for Test Property:' as Status;
SELECT op.*, p.property_name
FROM owner_payments op
LEFT JOIN properties p ON op.property_id = p.id
WHERE p.property_name LIKE '%Test%'
ORDER BY op.payment_month DESC
LIMIT 12;
EOF

echo ""
echo "=========================================="
echo "If no payments exist, they need to be generated"
echo "=========================================="

