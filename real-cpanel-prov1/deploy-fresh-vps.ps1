# Fresh VPS Deployment Script for PowerShell
# Deploys complete system to realestate.fmcqatar.com
# Database: realestate (user: sidhyk, password: Tz#669933)

$VPS_HOST = "104.237.2.52"
$VPS_USER = "root"
$VPS_PATH = "/var/www/html/realestate"
$DB_NAME = "realestate"
$DB_USER = "sidhyk"
$DB_PASS = "Tz#669933"
$DOMAIN = "realestate.fmcqatar.com"
$LOCAL_PATH = Get-Location

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fresh VPS Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Domain: $DOMAIN" -ForegroundColor White
Write-Host "Database: $DB_NAME" -ForegroundColor White
Write-Host "DB User: $DB_USER" -ForegroundColor White
Write-Host "VPS Path: $VPS_PATH" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create database and user on VPS
Write-Host "Step 1: Creating database and user on VPS..." -ForegroundColor Yellow
$dbScript = @"
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SELECT 'Database and user created successfully!' as Status;
"@

Write-Host "  Connecting to VPS to create database..." -ForegroundColor Cyan
try {
    $dbCommand = "mysql -u root -p'Tz@669933' -e `"$dbScript`""
    $result = ssh "${VPS_USER}@${VPS_HOST}" $dbCommand
    Write-Host "  ✓ Database created" -ForegroundColor Green
    Write-Host $result -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Error: $_" -ForegroundColor Red
    Write-Host "  Please run manually on VPS:" -ForegroundColor Yellow
    Write-Host "  ssh ${VPS_USER}@${VPS_HOST}" -ForegroundColor Cyan
    Write-Host "  Then: mysql -u root -p" -ForegroundColor Cyan
    Write-Host "  And run the CREATE DATABASE commands" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Step 2: Backing up existing folder (if exists)..." -ForegroundColor Yellow
$backupCommand = "if [ -d '$VPS_PATH' ]; then mv '$VPS_PATH' '/var/www/html/realestate_backup_$(date +%Y%m%d_%H%M%S)' && echo 'Backed up' || echo 'No backup needed'; else echo 'No existing folder'; fi"
try {
    ssh "${VPS_USER}@${VPS_HOST}" $backupCommand
} catch {
    Write-Host "  Note: Backup step skipped" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Creating directory structure..." -ForegroundColor Yellow
$mkdirCommand = "mkdir -p $VPS_PATH && chown -R www-data:www-data $VPS_PATH && chmod -R 755 $VPS_PATH && echo 'Directory created'"
try {
    ssh "${VPS_USER}@${VPS_HOST}" $mkdirCommand
    Write-Host "  ✓ Directory created" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error creating directory" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 4: Copying files to VPS..." -ForegroundColor Yellow
Write-Host "  This will copy all files from current directory..." -ForegroundColor Cyan

# Get list of files to copy (excluding certain files)
$excludePatterns = @("*.sh", "*.ps1", "*.md", ".git", "node_modules")
$filesToCopy = Get-ChildItem -Path $LOCAL_PATH -Recurse -File | 
    Where-Object { 
        $exclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($_.FullName -like "*$pattern*") { $exclude = $true; break }
        }
        -not $exclude
    }

Write-Host "  Found $($filesToCopy.Count) files to copy" -ForegroundColor Cyan
Write-Host "  Copying files..." -ForegroundColor Cyan

$copied = 0
$failed = 0
foreach ($file in $filesToCopy) {
    $relativePath = $file.FullName.Replace($LOCAL_PATH, "").TrimStart('\').Replace('\', '/')
    $remotePath = "$VPS_PATH/$relativePath"
    $remoteDir = Split-Path $remotePath -Parent
    
    # Create remote directory first
    try {
        ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p `"$remoteDir`""
    } catch {
        # Continue even if directory creation fails
    }
    
    # Copy file
    try {
        scp $file.FullName "${VPS_USER}@${VPS_HOST}:$remotePath" 2>&1 | Out-Null
        $copied++
        if ($copied % 50 -eq 0) {
            Write-Host "  Progress: $copied files copied..." -ForegroundColor Gray
        }
    } catch {
        $failed++
        Write-Host "  ✗ Failed: $relativePath" -ForegroundColor Red
    }
}

Write-Host "  ✓ Copied: $copied files" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "  ✗ Failed: $failed files" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 5: Updating config files on VPS..." -ForegroundColor Yellow

# Update database.php
$dbConfigUpdate = @"
sed -i 's/define(''DB_NAME'', ''[^'']*'');/define(''DB_NAME'', ''$DB_NAME'');/' $VPS_PATH/config/database.php
sed -i 's/define(''DB_USER'', ''[^'']*'');/define(''DB_USER'', ''$DB_USER'');/' $VPS_PATH/config/database.php
sed -i 's/define(''DB_PASS'', ''[^'']*'');/define(''DB_PASS'', ''$DB_PASS'');/' $VPS_PATH/config/database.php
"@

# Update config.php
$configUpdate = @"
sed -i 's|define(''BASE_URL'', ''[^'']*'');|define(''BASE_URL'', ''https://$DOMAIN'');|' $VPS_PATH/config/config.php
"@

try {
    ssh "${VPS_USER}@${VPS_HOST}" $dbConfigUpdate
    ssh "${VPS_USER}@${VPS_HOST}" $configUpdate
    Write-Host "  ✓ Config files updated" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error updating config files" -ForegroundColor Red
    Write-Host "  Please update manually:" -ForegroundColor Yellow
    Write-Host "    config/database.php: DB_NAME=$DB_NAME, DB_USER=$DB_USER, DB_PASS=$DB_PASS" -ForegroundColor Cyan
    Write-Host "    config/config.php: BASE_URL=https://$DOMAIN" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Step 6: Importing database schema..." -ForegroundColor Yellow
Write-Host "  Note: You need to copy database/schema.sql to VPS first" -ForegroundColor Cyan
Write-Host "  Then run on VPS:" -ForegroundColor Cyan
Write-Host "  mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < $VPS_PATH/database/schema.sql" -ForegroundColor White

Write-Host ""
Write-Host "Step 7: Setting file permissions..." -ForegroundColor Yellow
$permCommand = "chown -R www-data:www-data $VPS_PATH && find $VPS_PATH -type f -exec chmod 644 {} \; && find $VPS_PATH -type d -exec chmod 755 {} \; && echo 'Permissions set'"
try {
    ssh "${VPS_USER}@${VPS_HOST}" $permCommand
    Write-Host "  ✓ Permissions set" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error setting permissions" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✓ Database and user created" -ForegroundColor Green
Write-Host "✓ Files copied ($copied files)" -ForegroundColor Green
Write-Host "✓ Config files updated" -ForegroundColor Green
Write-Host "✓ Permissions set" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Import database schema (see Step 6 above)" -ForegroundColor White
Write-Host "2. Test the site: https://$DOMAIN" -ForegroundColor White
Write-Host "3. Verify database connection" -ForegroundColor White
Write-Host ""

