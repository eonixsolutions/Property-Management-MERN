#!/bin/bash
# Script to deploy owner rent start date feature to VPS
# Run this on the VPS server

set -e

VPS_PATH="/var/www/html/realestate"
DB_USER="realv1_user"
DB_PASS="Tz@669933"
DB_NAME="realv1"

echo "=========================================="
echo "Deploying Owner Rent Start Date Feature"
echo "=========================================="

# Check if we're in the right directory or if files exist
if [ ! -d "$VPS_PATH" ]; then
    echo "Error: Directory $VPS_PATH does not exist"
    echo "Please update VPS_PATH in this script"
    exit 1
fi

cd "$VPS_PATH"

echo ""
echo "Step 1: Adding database column if it doesn't exist..."
mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
-- Add owner_rent_start_date column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'properties';
SET @columnname = 'owner_rent_start_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " DATE DEFAULT NULL AFTER monthly_rent_to_owner")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
SELECT 'Database column check completed.';
EOF

echo ""
echo "Step 2: Verifying files exist..."
if [ ! -f "properties/add.php" ]; then
    echo "Error: properties/add.php not found"
    exit 1
fi

if [ ! -f "includes/recurring_owner_payments.php" ]; then
    echo "Error: includes/recurring_owner_payments.php not found"
    exit 1
fi

echo ""
echo "Step 3: Files are ready. Please manually update the following files on VPS:"
echo "  - properties/add.php"
echo "  - includes/recurring_owner_payments.php"
echo ""
echo "Or use SCP/SFTP to copy files from local machine:"
echo "  scp properties/add.php root@104.237.2.52:$VPS_PATH/properties/"
echo "  scp includes/recurring_owner_payments.php root@104.237.2.52:$VPS_PATH/includes/"
echo ""
echo "=========================================="
echo "Deployment instructions completed!"
echo "=========================================="

