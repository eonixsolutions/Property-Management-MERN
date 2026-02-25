# Fresh VPS Deployment Guide

This guide will help you deploy a fresh copy of the application to your VPS at `realestate.fmcqatar.com`.

## Server Information
- **VPS IP:** 104.237.2.52
- **Domain:** realestate.fmcqatar.com
- **SSH User:** root
- **Password:** Tz@669933
- **Project Path:** /var/www/html/realestate

## Database Information
- **Database Name:** realestate
- **Database User:** sidhyk
- **Database Password:** Tz#669933

## Deployment Steps

### Step 1: Create Database and User

SSH into your VPS and run:

```bash
ssh root@104.237.2.52
```

Then create the database:

```bash
mysql -u root -p
```

Enter MySQL root password, then run:

```sql
CREATE DATABASE IF NOT EXISTS realestate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sidhyk'@'localhost' IDENTIFIED BY 'Tz#669933';
GRANT ALL PRIVILEGES ON realestate.* TO 'sidhyk'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 2: Backup Existing Folder (if exists)

```bash
cd /var/www/html
if [ -d "realestate" ]; then
    mv realestate realestate_backup_$(date +%Y%m%d_%H%M%S)
fi
```

### Step 3: Create New Directory

```bash
mkdir -p /var/www/html/realestate
chown -R www-data:www-data /var/www/html/realestate
chmod -R 755 /var/www/html/realestate
```

### Step 4: Copy Files to VPS

From your local Windows machine (PowerShell), run:

```powershell
# Navigate to project directory
cd C:\xampp\htdocs\real-cpanel-prov1

# Copy all files (excluding .sh, .ps1, .md, .git)
scp -r * root@104.237.2.52:/var/www/html/realestate/
```

Or use SFTP client like FileZilla or WinSCP to upload all files.

### Step 5: Update Configuration Files

On the VPS, update the config files:

```bash
cd /var/www/html/realestate

# Update database.php
sed -i "s/define('DB_NAME', '[^']*');/define('DB_NAME', 'realestate');/" config/database.php
sed -i "s/define('DB_USER', '[^']*');/define('DB_USER', 'sidhyk');/" config/database.php
sed -i "s/define('DB_PASS', '[^']*');/define('DB_PASS', 'Tz#669933');/" config/database.php

# Update config.php
sed -i "s|define('BASE_URL', '[^']*');|define('BASE_URL', 'https://realestate.fmcqatar.com');|" config/config.php
```

Or manually edit:
- `config/database.php`: Set DB_NAME, DB_USER, DB_PASS
- `config/config.php`: Set BASE_URL to `https://realestate.fmcqatar.com`

### Step 6: Import Database Schema

```bash
cd /var/www/html/realestate
mysql -u sidhyk -p'Tz#669933' realestate < database/schema.sql
```

Or if you have the complete schema:

```bash
mysql -u sidhyk -p'Tz#669933' realestate < database/complete_schema_xampp.sql
```

### Step 7: Set File Permissions

```bash
chown -R www-data:www-data /var/www/html/realestate
find /var/www/html/realestate -type f -exec chmod 644 {} \;
find /var/www/html/realestate -type d -exec chmod 755 {} \;
```

### Step 8: Verify Apache Configuration

Ensure Apache virtual host is configured correctly:

```bash
# Check if virtual host exists
cat /etc/apache2/sites-available/realestate-http.conf

# Should have:
# ServerName realestate.fmcqatar.com
# DocumentRoot /var/www/html/realestate

# Enable site if not already
a2ensite realestate-http
systemctl reload apache2
```

### Step 9: Test the Application

1. Visit: https://realestate.fmcqatar.com
2. Check if the site loads correctly
3. Try logging in
4. Verify database connection works

## Quick Deployment Script

You can also use the provided scripts:

**On VPS (bash):**
```bash
chmod +x deploy-fresh-vps.sh
./deploy-fresh-vps.sh
```

**From Windows (PowerShell):**
```powershell
.\deploy-fresh-vps.ps1
```

## Troubleshooting

### Database Connection Error
- Verify database credentials in `config/database.php`
- Check if MySQL user has correct privileges
- Test connection: `mysql -u sidhyk -p'Tz#669933' realestate`

### Permission Errors
- Ensure www-data owns the files: `chown -R www-data:www-data /var/www/html/realestate`
- Check file permissions: `ls -la /var/www/html/realestate`

### Site Not Loading
- Check Apache error logs: `tail -f /var/log/apache2/error.log`
- Verify virtual host is enabled: `a2ensite realestate-http`
- Check DocumentRoot in Apache config

### SSL Certificate Issues
- If using HTTPS, ensure SSL certificate is valid
- Check: `certbot certificates`
- Renew if needed: `certbot renew`

## Notes

- The old `realestate` folder will be backed up before replacement
- All existing data in the old database will be replaced
- Make sure to backup any important data before deployment
- The application will use the new database `realestate` with user `sidhyk`

