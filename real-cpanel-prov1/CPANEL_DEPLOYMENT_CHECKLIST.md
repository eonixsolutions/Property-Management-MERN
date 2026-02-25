# cPanel Deployment Checklist

## Configuration Updated ✅

Your application has been configured for cPanel hosting:

### Database Settings
- **Database Name:** `fmcqatar_realpro`
- **Database User:** `fmcqatar_sidhyk`
- **Database Password:** `Tz@669933@`
- **Database Host:** `localhost`

### Application URL
- **Base URL:** `https://fmcqatar.com/realpro`

### Files Updated
1. ✅ `config/database.php` - Database credentials updated
2. ✅ `config/config.php` - Base URL and production settings updated
3. ✅ `.htaccess` - HTTPS redirect enabled, security headers configured
4. ✅ `DEPLOYMENT.md` - Updated with correct information

## Deployment Steps

### 1. Database Setup in cPanel
1. Log into cPanel
2. Go to **MySQL Databases**
3. Create database: `fmcqatar_realpro`
4. Create user: `fmcqatar_sidhyk` with password `Tz@669933@`
5. Add user to database with **ALL PRIVILEGES**
6. Open **phpMyAdmin**
7. Select database `fmcqatar_realpro`
8. Import `database/schema.sql` (remove CREATE DATABASE and USE statements first, or select the database before importing)

### 2. Upload Files
1. Open **File Manager** in cPanel
2. Navigate to `public_html`
3. Create folder `realpro` (if not exists)
4. Upload ALL project files to `public_html/realpro/`
5. Maintain the exact folder structure

### 3. Set Permissions
Set these permissions in cPanel File Manager:
- **Files:** `644`
- **Directories:** `755`
- **uploads folder:** `755` (must be writable)
  - Right-click `uploads` → Change Permissions → Set to `755`
  - Check "Recurse into subdirectories"

### 4. Database Import Notes
When importing `database/schema.sql` in phpMyAdmin:
- **Option 1:** Select the `fmcqatar_realpro` database first, then import
- **Option 2:** Edit `schema.sql` and remove these lines before importing:
  ```sql
  CREATE DATABASE IF NOT EXISTS property_db...
  USE property_db;
  ```

### 5. Test Your Installation
1. Visit: `https://fmcqatar.com/realpro`
2. You should see the login page
3. Default login (if admin user exists):
   - Email: `sidhykqatar@gmail.com`
   - Password: `tz669933`

### 6. Security Checklist
- [ ] Delete or protect `setup.php` file (already protected in .htaccess)
- [ ] Verify HTTPS is working (should redirect from HTTP to HTTPS)
- [ ] Confirm `uploads` folder has write permissions (755)
- [ ] Test file uploads
- [ ] Error display is disabled (already configured)
- [ ] Check error logs in cPanel if issues occur

### 7. PHP Requirements
Ensure your cPanel PHP version is:
- PHP 7.4 or higher
- MySQLi extension enabled
- GD library enabled (for image handling)
- Session support enabled
- File upload enabled

### 8. Optional: Cron Jobs
If you need automated tasks, set up cron jobs in cPanel:
- Invoice generation: `cron/generate_invoices.php` (daily)
- Path: `/usr/bin/php /home/username/public_html/realpro/cron/generate_invoices.php`

## Troubleshooting

### Database Connection Error
- Verify credentials in `config/database.php`
- Check MySQL user has proper permissions
- Ensure database exists in phpMyAdmin
- Test connection with `database/test_connection.php`

### 500 Internal Server Error
- Check `.htaccess` syntax
- Verify PHP version (7.4+)
- Check file permissions
- Review error logs in cPanel

### Can't Login
- Ensure database schema is imported
- Check if admin user exists in database
- Verify password hash in users table
- Run `database/fix_admin_user.php` if needed

### File Upload Issues
- Check `uploads` folder permissions (755)
- Verify PHP upload settings in cPanel
- Check available disk space
- Review PHP error logs

## Production URL
🌐 **https://fmcqatar.com/realpro**

## Database
💾 **fmcqatar_realpro**

---
**Ready for cPanel deployment!** ✅

