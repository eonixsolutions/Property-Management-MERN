# Quick VPS Setup Guide

## Option 1: Manual Setup (Recommended)

### Step 1: Transfer Files
Use WinSCP, FileZilla, or any SFTP client:
- **Host:** 104.237.2.52
- **Username:** root
- **Password:** Tz@669933
- **Remote Path:** /var/www/html/realestate

Upload all files from `C:\xampp\htdocs\real-cpanel-prov1` to the VPS.

### Step 2: SSH into VPS
```bash
ssh root@104.237.2.52
```

### Step 3: Run Deployment Script
```bash
cd /var/www/html/realestate
chmod +x deploy-to-vps.sh
bash deploy-to-vps.sh
```

The script will:
- ✅ Set file permissions
- ✅ Create database and user
- ✅ Import database schema
- ✅ Update configuration files
- ✅ Configure web server

### Step 4: Configure SSL (for HTTPS)
```bash
apt-get install certbot python3-certbot-apache
certbot --apache -d realestate.fmcqatar.com -d www.realestate.fmcqatar.com
```

### Step 5: Access Your Application
Visit: `https://realestate.fmcqatar.com`

Login with:
- Email: `sidhykqatar@gmail.com`
- Password: `tz669933`

---

## Option 2: Automated PowerShell Script (Windows)

From your local Windows machine:
```powershell
.\deploy-to-vps.ps1
```

This will transfer files and run the deployment script automatically.

---

## Manual Steps (If Script Fails)

### 1. Create Database
```bash
mysql -u root -p
```
```sql
CREATE DATABASE realv1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'realv1_user'@'localhost' IDENTIFIED BY 'Tz@669933';
GRANT ALL PRIVILEGES ON realv1.* TO 'realv1_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Import Database
```bash
cd /var/www/html/realestate
mysql -u realv1_user -p realv1 < database/schema.sql
```

### 3. Update Config Files
```bash
nano config/database.php
```
Change to:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'realv1_user');
define('DB_PASS', 'Tz@669933');
define('DB_NAME', 'realv1');
```

```bash
nano config/config.php
```
Change BASE_URL to:
```php
define('BASE_URL', 'https://realestate.fmcqatar.com');
```

### 4. Set Permissions
```bash
chown -R www-data:www-data /var/www/html/realestate
chmod -R 755 /var/www/html/realestate
chmod -R 775 uploads/
```

### 5. Restart Web Server
```bash
# For Apache
systemctl restart apache2

# For Nginx
systemctl restart nginx
```

---

## Troubleshooting

**Can't connect via SSH?**
- Check if SSH is enabled: `systemctl status ssh`
- Check firewall: `ufw status`

**Database connection error?**
- Verify MySQL is running: `systemctl status mysql`
- Check credentials in `config/database.php`

**Permission denied?**
- Run: `chown -R www-data:www-data /var/www/html/realestate`

**500 Error?**
- Check web server logs: `tail -f /var/log/apache2/error.log`
- Verify PHP version: `php -v` (needs 7.4+)

---

**Need Help?** Check `VPS_DEPLOYMENT.md` for detailed instructions.

