# VPS Deployment Guide

## Server Information
- **IP Address:** 104.237.2.52
- **Domain:** realestate.fmcqatar.com
- **Username:** root
- **Password:** Tz@669933
- **Web Root:** /var/www/html
- **Project Directory:** /var/www/html/realestate

## Prerequisites
- PHP 7.4 or higher
- MySQL/MariaDB
- Apache/Nginx web server
- SSH access to the server

## Quick Deployment Steps

### Step 1: Transfer Files to VPS

From your local machine, run:

```bash
# Navigate to your project directory
cd C:\xampp\htdocs\real-cpanel-prov1

# Transfer files to VPS (using SCP)
scp -r * root@104.237.2.52:/var/www/html/realestate/

# Or using SFTP client like FileZilla, WinSCP, etc.
```

**Alternative using rsync (if available on Windows):**
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' ./ root@104.237.2.52:/var/www/html/realestate/
```

### Step 2: SSH into VPS and Set Up

```bash
ssh root@104.237.2.52
```

### Step 3: Create Directory and Set Permissions

```bash
cd /var/www/html
mkdir -p realestate
cd realestate

# Set proper permissions
chown -R www-data:www-data /var/www/html/realestate
chmod -R 755 /var/www/html/realestate
chmod -R 775 uploads/
```

### Step 4: Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE realv1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'realv1_user'@'localhost' IDENTIFIED BY 'Tz@669933';
GRANT ALL PRIVILEGES ON realv1.* TO 'realv1_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import database schema
mysql -u realv1_user -p realv1 < /var/www/html/realestate/database/schema.sql
```

### Step 5: Configure Application

Edit the configuration files:

```bash
cd /var/www/html/realestate

# Edit database config
nano config/database.php
```

Update `config/database.php`:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'realv1_user');
define('DB_PASS', 'Tz@669933');
define('DB_NAME', 'realv1');
```

Edit `config/config.php`:
```bash
nano config/config.php
```

Update BASE_URL:
```php
define('BASE_URL', 'https://realestate.fmcqatar.com');
```

### Step 6: Configure Apache Virtual Host (if using Apache)

```bash
# Create virtual host
nano /etc/apache2/sites-available/real-cpanel-prov1.conf
```

Add this configuration:
```apache
<VirtualHost *:80>
    ServerName realestate.fmcqatar.com
    ServerAlias www.realestate.fmcqatar.com
    DocumentRoot /var/www/html/realestate
    
    <Directory /var/www/html/realestate>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/realestate_error.log
    CustomLog ${APACHE_LOG_DIR}/realestate_access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName realestate.fmcqatar.com
    ServerAlias www.realestate.fmcqatar.com
    DocumentRoot /var/www/html/realestate
    
    <Directory /var/www/html/realestate>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # SSL Configuration (update paths to your SSL certificates)
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/realestate.fmcqatar.com.crt
    SSLCertificateKeyFile /etc/ssl/private/realestate.fmcqatar.com.key
    SSLCertificateChainFile /etc/ssl/certs/realestate.fmcqatar.com.chain.crt
    
    ErrorLog ${APACHE_LOG_DIR}/realestate_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/realestate_ssl_access.log combined
</VirtualHost>
```

Enable the site:
```bash
a2ensite realestate.conf
a2enmod rewrite
a2enmod ssl
systemctl restart apache2
```

### Step 7: Configure Nginx (if using Nginx)

```bash
nano /etc/nginx/sites-available/real-cpanel-prov1
```

Add this configuration:
```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name realestate.fmcqatar.com www.realestate.fmcqatar.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name realestate.fmcqatar.com www.realestate.fmcqatar.com;
    root /var/www/html/realestate;
    index index.php index.html;

    # SSL Configuration (update paths to your SSL certificates)
    ssl_certificate /etc/ssl/certs/realestate.fmcqatar.com.crt;
    ssl_certificate_key /etc/ssl/private/realestate.fmcqatar.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/realestate /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 8: Create Uploads Directory

```bash
mkdir -p /var/www/html/realestate/uploads/properties
chmod -R 775 /var/www/html/realestate/uploads
chown -R www-data:www-data /var/www/html/realestate/uploads
```

### Step 9: Security Settings

```bash
# Secure config files
chmod 600 config/database.php
chmod 600 config/config.php

# Remove setup.php after installation (optional)
# rm setup.php
```

### Step 10: Configure SSL Certificate

For HTTPS to work, you need to set up SSL:

**Using Let's Encrypt (Free):**
```bash
apt-get install certbot python3-certbot-apache
certbot --apache -d realestate.fmcqatar.com -d www.realestate.fmcqatar.com
```

**Or using Let's Encrypt with Nginx:**
```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d realestate.fmcqatar.com -d www.realestate.fmcqatar.com
```

### Step 11: Test Installation

1. Open browser and visit: `https://realestate.fmcqatar.com`
2. You should see the login page
3. Login with:
   - Email: `sidhykqatar@gmail.com`
   - Password: `tz669933`

## Automated Deployment Script

Run the `deploy-to-vps.sh` script on the VPS after transferring files.

## Troubleshooting

### Database Connection Error
- Verify MySQL service is running: `systemctl status mysql`
- Check database credentials in `config/database.php`
- Test connection: `mysql -u realv1_user -p realv1`

### Permission Errors
- Ensure www-data owns files: `chown -R www-data:www-data /var/www/html/realestate`
- Check uploads folder: `chmod -R 775 uploads/`

### 500 Internal Server Error
- Check Apache/Nginx error logs
- Verify PHP version: `php -v`
- Check file permissions
- Ensure mod_rewrite is enabled (Apache)

### Can't Access Site
- Check firewall: `ufw status`
- Verify web server is running: `systemctl status apache2` or `systemctl status nginx`
- Check if port 80 is open

## Post-Deployment Checklist

- [ ] Database imported successfully
- [ ] Configuration files updated
- [ ] File permissions set correctly
- [ ] Web server configured
- [ ] Can access login page
- [ ] Can login with default credentials
- [ ] File uploads working
- [ ] Setup.php removed or secured
- [ ] Error logging enabled
- [ ] Firewall configured

## Default Login Credentials

- **Email:** sidhykqatar@gmail.com
- **Password:** tz669933

**⚠️ IMPORTANT:** Change the default password after first login!

## Backup Strategy

Regular backups should include:
1. Database: `mysqldump -u realv1_user -p realv1 > backup.sql`
2. Files: `tar -czf backup.tar.gz /var/www/html/realestate`

## Production URL

**Live Site:** https://realestate.fmcqatar.com

---

**Ready for deployment!** ✅

