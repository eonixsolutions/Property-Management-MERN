# cPanel Deployment Guide

## Quick Deployment to cPanel

### Prerequisites
- cPanel hosting account at fmcqatar.com
- FTP/SFTP access or cPanel File Manager
- MySQL database credentials
- PHP 7.4 or higher

### Database Configuration
```
Database Name: fmcqatar_realpro
Username: fmcqatar_sidhyk
Password: Tz@669933@
Host: localhost
```

### Deployment Steps

#### 1. Database Setup
1. Log into cPanel
2. Navigate to **MySQL Databases**
3. Create a new database named `fmcqatar_realpro` (if not already created)
4. Create a database user `fmcqatar_sidhyk` with password `Tz@669933@`
5. Grant ALL PRIVILEGES to the user on the database
6. Go to **phpMyAdmin**
7. Select the `fmcqatar_realpro` database
8. Import `database/schema.sql` file

#### 2. Upload Files
1. Open **File Manager** in cPanel
2. Navigate to `public_html` directory
3. Create folder `realpro` if it doesn't exist
4. Upload all project files to `public_html/realpro/`
5. Ensure file structure is:
   ```
   public_html/
   └── realpro/
       ├── assets/
       ├── auth/
       ├── cheques/
       ├── config/
       ├── database/
       ├── documents/
       ├── includes/
       ├── maintenance/
       ├── notifications/
       ├── owners/
       ├── properties/
       ├── rent/
       ├── reports/
       ├── settings/
       ├── tenants/
       ├── transactions/
       ├── uploads/
       ├── .htaccess
       ├── index.php
       └── [other files]
   ```

#### 3. Configure Permissions
Set proper file permissions:
- Files: `644` or `755`
- Directories: `755`
- Uploads folder: `755` (must be writable)

In cPanel File Manager:
1. Right-click on `uploads` folder
2. Select "Change Permissions"
3. Set to `755`
4. Check "Recurse into subdirectories"

#### 4. Verify Configuration
Configuration files are already set:
- `config/database.php` - Database credentials configured for `fmcqatar_realpro`
- `config/config.php` - Base URL set to `https://fmcqatar.com/realpro`
- `.htaccess` - Security and HTTPS redirect configured

#### 5. Test Installation
1. Visit: `https://fmcqatar.com/realpro`
2. You should see the login page
3. Login credentials:
   - Email: `sidhykqatar@gmail.com`
   - Password: `tz669933`

#### 6. Security Checklist
- [ ] Delete or protect `setup.php` file
- [ ] Verify `.htaccess` is working (check HTTPS redirect)
- [ ] Confirm `uploads` folder has write permissions
- [ ] Test file uploads
- [ ] Disable error display in production (already done in config)
- [ ] Enable error logging

### Troubleshooting

#### Database Connection Error
- Verify database credentials in `config/database.php`
- Check if MySQL user has proper permissions
- Ensure database exists in phpMyAdmin

#### 500 Internal Server Error
- Check `.htaccess` syntax
- Verify PHP version compatibility (requires PHP 7.4+)
- Check file permissions
- Review error logs in cPanel

#### Can't Login
- Ensure database schema is properly imported
- Check if user exists in database
- Verify password hash in users table

#### File Upload Issues
- Check `uploads` folder permissions (should be 755)
- Verify PHP upload settings in cPanel
- Check available disk space

#### Session Issues
- Ensure PHP sessions are enabled
- Check `tmp` directory permissions
- Verify `session.cookie_secure` setting for HTTPS

### File Permissions Reference
```
Directories: 755
Files: 644
Config files: 600 (more secure)
Uploads folder: 755
```

### PHP Requirements
- PHP 7.4 or higher
- MySQLi extension
- GD library (for image handling)
- Session support
- File upload enabled

### cPanel Settings
Recommended settings in cPanel:
- PHP Version: 7.4 or higher
- Error Display: Off
- Memory Limit: 256M
- Upload Max Size: 50M
- Max Execution Time: 300

### Backup Strategy
Regular backups should include:
1. Database export (via phpMyAdmin)
2. All application files
3. `uploads` folder contents

Use cPanel backup tool or a third-party backup service.

### Support
For issues, check:
- Error logs in cPanel
- PHP error logs
- Browser console for JavaScript errors
- Database connection status

### Post-Deployment
1. Remove or restrict access to `setup.php`
2. Create an admin user via the web interface
3. Configure email settings (if available)
4. Set up automatic backups
5. Monitor performance and error logs

### Cron Jobs (Optional)
For automated tasks, set up cron jobs in cPanel:
- Invoice generation: Run `cron/generate_invoices.php` daily
- Notification checks: As needed

Path format: `/usr/bin/php /home/username/public_html/realpro/cron/generate_invoices.php`

---

**Production URL:** https://fmcqatar.com/realpro

**Database:** fmcqatar_realpro

**Ready for deployment!** ✅

