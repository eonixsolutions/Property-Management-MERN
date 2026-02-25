# VPS Update: Owner Rent Start Date Feature

This guide explains how to deploy the owner rent start date feature to your VPS.

## Files Changed
1. `properties/add.php` - Added owner rent start date field
2. `includes/recurring_owner_payments.php` - Updated to use start date

## Deployment Steps

### Option 1: Using SCP (from Windows PowerShell)

```powershell
# Set variables
$VPS_HOST = "104.237.2.52"
$VPS_USER = "root"
$VPS_PATH = "/var/www/html/realestate"

# Copy files
scp properties/add.php ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/properties/
scp includes/recurring_owner_payments.php ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/includes/
```

### Option 2: Manual Copy via SSH

1. SSH into your VPS:
   ```bash
   ssh root@104.237.2.52
   ```

2. Navigate to the project directory:
   ```bash
   cd /var/www/html/realestate
   ```

3. Create backup of existing files:
   ```bash
   cp properties/add.php properties/add.php.backup.$(date +%Y%m%d_%H%M%S)
   cp includes/recurring_owner_payments.php includes/recurring_owner_payments.php.backup.$(date +%Y%m%d_%H%M%S)
   ```

4. Copy the updated files from your local machine or edit them directly on VPS.

### Step 3: Update Database

Add the new column to the properties table:

```bash
mysql -u realv1_user -p'Tz@669933' realv1 <<EOF
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
```

Or use a simpler approach (if column doesn't exist, it will show an error but won't break anything):

```bash
mysql -u realv1_user -p'Tz@669933' realv1 -e "ALTER TABLE properties ADD COLUMN owner_rent_start_date DATE DEFAULT NULL AFTER monthly_rent_to_owner;" 2>/dev/null || echo "Column may already exist"
```

### Step 4: Verify Permissions

Ensure files have correct permissions:

```bash
chown -R www-data:www-data /var/www/html/realestate
chmod -R 755 /var/www/html/realestate
find /var/www/html/realestate -type f -exec chmod 644 {} \;
find /var/www/html/realestate -type d -exec chmod 755 {} \;
```

### Step 5: Test

1. Access your application: `https://realestate.fmcqatar.com`
2. Navigate to Properties > Add Property
3. Check if "Owner Rent Start Date" field appears in the Rental Property Information section
4. Add a property with owner rent and start date
5. Verify that recurring owner payments are generated from the start date

## Quick One-Liner (if you have SSH access)

```bash
# On VPS, run:
cd /var/www/html/realestate && \
mysql -u realv1_user -p'Tz@669933' realv1 -e "ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_rent_start_date DATE DEFAULT NULL AFTER monthly_rent_to_owner;" 2>/dev/null && \
echo "Database updated. Now copy the PHP files manually."
```

## Troubleshooting

1. **Column already exists error**: This is fine, the column was already added
2. **Permission denied**: Run `chown` and `chmod` commands as shown above
3. **File not found**: Verify the VPS path is correct (`/var/www/html/realestate`)
4. **Database connection error**: Check database credentials in the script

## Notes

- The database column will be automatically added by the PHP code if it doesn't exist (when adding a property)
- However, it's better to add it manually first to avoid any issues
- Always backup files before updating on production

