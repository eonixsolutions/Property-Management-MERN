# Quick VPS Deployment Script for Owner Rent Start Date Feature
# Run this in PowerShell from: C:\xampp\htdocs\real-cpanel-prov1

$VPS_HOST = "104.237.2.52"
$VPS_USER = "root"
$VPS_PATH = "/var/www/html/realestate"
$LOCAL_PATH = Get-Location

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploying to VPS: Owner Rent Start Date" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy files to VPS
Write-Host "Step 1: Copying files to VPS..." -ForegroundColor Yellow

$files = @(
    @{Local = "properties\add.php"; Remote = "properties/add.php"},
    @{Local = "includes\recurring_owner_payments.php"; Remote = "includes/recurring_owner_payments.php"}
)

foreach ($file in $files) {
    $localFile = Join-Path $LOCAL_PATH $file.Local
    if (Test-Path $localFile) {
        Write-Host "  Copying: $($file.Local)" -ForegroundColor Cyan
        $remotePath = "$VPS_PATH/$($file.Remote)"
        
        # Use scp command (requires OpenSSH client)
        $scpCommand = "scp `"$localFile`" ${VPS_USER}@${VPS_HOST}:`"$remotePath`""
        Write-Host "  Command: $scpCommand" -ForegroundColor Gray
        
        # Execute SCP
        try {
            & scp $localFile "${VPS_USER}@${VPS_HOST}:$remotePath"
            Write-Host "  ✓ Successfully copied" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Error: $_" -ForegroundColor Red
            Write-Host "  Please copy manually or check SSH connection" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ File not found: $localFile" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 2: Updating database on VPS..." -ForegroundColor Yellow
Write-Host "  Connecting to VPS to add database column..." -ForegroundColor Cyan

# SSH command to update database
$sshCommand = @"
mysql -u realv1_user -p'Tz@669933' realv1 <<'EOF'
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
"@

Write-Host "  Running database update..." -ForegroundColor Cyan
try {
    $result = ssh "${VPS_USER}@${VPS_HOST}" $sshCommand
    Write-Host "  Database update result:" -ForegroundColor Green
    Write-Host $result -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Error running database update: $_" -ForegroundColor Red
    Write-Host "  Please run manually on VPS:" -ForegroundColor Yellow
    Write-Host "  ssh ${VPS_USER}@${VPS_HOST}" -ForegroundColor Cyan
    Write-Host "  Then run the MySQL command above" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify files are updated on VPS" -ForegroundColor White
Write-Host "2. Test adding a property with owner rent start date" -ForegroundColor White
Write-Host "3. Check that recurring payments use the start date" -ForegroundColor White
Write-Host ""
