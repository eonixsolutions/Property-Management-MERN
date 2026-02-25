# XAMPP Setup Guide

## Quick Setup Checklist

### ✅ Step 1: Database Configuration
The database is already configured:
- **Database:** `property_db`
- **User:** `root`
- **Password:** `` (empty)
- **Host:** `localhost`

### ✅ Step 2: Import Database
1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Click on **"SQL"** tab
3. Copy and paste the contents of `database/complete_schema_xampp.sql`
4. Click **"Go"** to execute

**OR**

1. Click on **"Import"** tab
2. Choose file: `database/complete_schema_xampp.sql`
3. Click **"Go"**

### ✅ Step 3: Verify Configuration
- **BASE_URL:** `http://localhost/real-cpanel-prov1` ✓
- **Database:** `property_db` ✓
- **Session:** HTTP (not HTTPS) ✓

### ✅ Step 4: Access the Application
1. Open browser
2. Go to: `http://localhost/real-cpanel-prov1`
3. You should see the landing page or login page

### ✅ Step 5: Login
- **Email:** `sidhykqatar@gmail.com`
- **Password:** `tz669933`

## Troubleshooting

### Issue: Redirects to wrong URL
- Clear browser cache: `Ctrl + Shift + Delete`
- Clear PHP sessions: Delete files in `C:\xampp\tmp\` starting with `sess_`
- Restart XAMPP Apache

### Issue: Database connection error
- Make sure MySQL is running in XAMPP Control Panel
- Verify database `property_db` exists in phpMyAdmin
- Check `config/database.php` has correct credentials

### Issue: CSS/Images not loading
- Check BASE_URL in `config/config.php`
- Verify folder name matches: `real-cpanel-prov1`
- Clear browser cache

### Issue: 404 Not Found
- Make sure folder is in: `C:\xampp\htdocs\real-cpanel-prov1`
- Check Apache is running in XAMPP Control Panel
- Verify `.htaccess` file exists

## File Locations
- **Project Folder:** `C:\xampp\htdocs\real-cpanel-prov1`
- **Database Config:** `config/database.php`
- **App Config:** `config/config.php`
- **Database Schema:** `database/complete_schema_xampp.sql`

## Default Login Credentials
- **Email:** sidhykqatar@gmail.com
- **Password:** tz669933

---

**Ready to use!** 🚀

