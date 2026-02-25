# PowerShell script to update VPS with owner rent start date feature
# Run this from your local machine (Windows) with SSH access to VPS

$VPS_HOST = "104.237.2.52"
$VPS_USER = "root"
$VPS_PATH = "/var/www/html/realestate"
$LOCAL_PATH = "C:\xampp\htdocs\real-cpanel-prov1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploying Owner Rent Start Date Feature" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if files exist locally
$filesToUpdate = @(
    "properties\add.php",
    "includes\recurring_owner_payments.php"
)

Write-Host "Step 1: Checking local files..." -ForegroundColor Yellow
foreach ($file in $filesToUpdate) {
    $fullPath = Join-Path $LOCAL_PATH $file
    if (-not (Test-Path $fullPath)) {
        Write-Host "Error: File not found: $fullPath" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Found: $file" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Copying files to VPS..." -ForegroundColor Yellow

# Use SCP to copy files (requires SSH/SCP client like OpenSSH or WinSCP)
# If using OpenSSH (Windows 10+), you can use scp command
foreach ($file in $filesToUpdate) {
    $localFile = Join-Path $LOCAL_PATH $file
    $remoteFile = "$VPS_PATH/$($file.Replace('\', '/'))"
    
    Write-Host "  Copying: $file" -ForegroundColor Cyan
    Write-Host "    scp `"$localFile`" ${VPS_USER}@${VPS_HOST}:`"$remoteFile`"" -ForegroundColor Gray
    
    # Uncomment the line below to actually copy (requires SSH key or password)
    # scp "$localFile" "${VPS_USER}@${VPS_HOST}:$remoteFile"
}

Write-Host ""
Write-Host "Step 3: Adding database column on VPS..." -ForegroundColor Yellow
Write-Host "  Run the following SQL on VPS:" -ForegroundColor Gray
Write-Host ""
Write-Host "  mysql -u realv1_user -p'Tz@669933' realv1 -e `"ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_rent_start_date DATE DEFAULT NULL AFTER monthly_rent_to_owner;`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  Or use the deploy-owner-rent-start-date.sh script on VPS" -ForegroundColor Gray

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Manual Steps Required:" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "1. Copy files to VPS using SCP or SFTP" -ForegroundColor White
Write-Host "2. Run database migration (add column)" -ForegroundColor White
Write-Host "3. Verify files have correct permissions" -ForegroundColor White
Write-Host ""
Write-Host "To copy files manually, use:" -ForegroundColor Yellow
Write-Host "  scp properties/add.php root@104.237.2.52:/var/www/html/realestate/properties/" -ForegroundColor Cyan
Write-Host "  scp includes/recurring_owner_payments.php root@104.237.2.52:/var/www/html/realestate/includes/" -ForegroundColor Cyan
Write-Host ""

