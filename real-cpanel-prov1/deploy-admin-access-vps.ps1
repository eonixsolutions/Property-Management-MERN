# PowerShell script to deploy admin access to VPS
# Run this from your local machine

$VPS_IP = "104.237.2.52"
$VPS_USER = "root"
$VPS_PATH = "/var/www/html/realestate"
$LOCAL_PATH = "C:\xampp\htdocs\real-cpanel-prov1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploying Admin Full Access to VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if files exist locally
$filesToCopy = @(
    "config\config.php",
    "auth\login.php",
    "database\make_admin_full_access.php",
    "database\make_admin_full_access.sql"
)

Write-Host "1. Checking local files..." -ForegroundColor Yellow
foreach ($file in $filesToCopy) {
    $fullPath = Join-Path $LOCAL_PATH $file
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file not found" -ForegroundColor Red
    }
}
Write-Host ""

# Copy files to VPS
Write-Host "2. Copying files to VPS..." -ForegroundColor Yellow
Write-Host "   You'll be prompted for the VPS password" -ForegroundColor Gray
Write-Host ""

# Copy config.php
Write-Host "   Copying config/config.php..." -ForegroundColor White
scp "$LOCAL_PATH\config\config.php" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/config/" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ config.php copied" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to copy config.php" -ForegroundColor Red
}

# Copy login.php
Write-Host "   Copying auth/login.php..." -ForegroundColor White
scp "$LOCAL_PATH\auth\login.php" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/auth/" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ login.php copied" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to copy login.php" -ForegroundColor Red
}

# Copy migration files
Write-Host "   Copying database migration files..." -ForegroundColor White
scp "$LOCAL_PATH\database\make_admin_full_access.php" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/database/" 2>&1 | Out-Null
scp "$LOCAL_PATH\database\make_admin_full_access.sql" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/database/" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Migration files copied" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to copy migration files" -ForegroundColor Red
}

Write-Host ""

# Copy deployment script
Write-Host "3. Copying deployment script..." -ForegroundColor Yellow
scp "$LOCAL_PATH\deploy-admin-access-vps.sh" "${VPS_USER}@${VPS_IP}:/root/" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Deployment script copied" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to copy deployment script" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SSH into your VPS:" -ForegroundColor Yellow
Write-Host "   ssh root@104.237.2.52" -ForegroundColor White
Write-Host ""
Write-Host "2. Run the deployment script:" -ForegroundColor Yellow
Write-Host "   bash /root/deploy-admin-access-vps.sh" -ForegroundColor White
Write-Host ""
Write-Host "3. OR run the PHP migration directly:" -ForegroundColor Yellow
Write-Host "   Visit: https://realestate.fmcqatar.com/database/make_admin_full_access.php" -ForegroundColor White
Write-Host ""
Write-Host "4. Verify admin access:" -ForegroundColor Yellow
Write-Host "   - Log out and log back in" -ForegroundColor White
Write-Host "   - Check if you can see all properties/tenants/transactions" -ForegroundColor White
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

