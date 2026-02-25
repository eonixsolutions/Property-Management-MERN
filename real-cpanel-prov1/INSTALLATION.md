# Installation Guide

## Quick Setup Instructions

### Step 1: Database Setup
1. Open phpMyAdmin or MySQL command line
2. Create a new database named `property_db` (or import the schema.sql file)
3. Import the SQL file: `database/schema.sql`

### Step 2: Configuration
1. Edit `config/database.php` and update your database credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_USER', 'root');
   define('DB_PASS', '');
   define('DB_NAME', 'property_db');
   ```

2. Edit `config/config.php` and update the BASE_URL:
   ```php
   define('BASE_URL', 'http://localhost/realestate');
   ```

### Step 3: Directory Permissions
Ensure the `uploads/` directory exists and is writable:
```bash
mkdir uploads
chmod 755 uploads
```

### Step 4: Access the System
1. Navigate to: `http://localhost/realestate/auth/login.php`
2. Login with:
   - Email: `sidhykqatar@gmail.com`
   - Password: `tz669933`

### Optional: Run Setup Script
You can also run `setup.php` once to automatically set up the database:
```bash
php setup.php
```
(Then delete setup.php for security)

## System Features

✅ **Dashboard** - Overview with statistics  
✅ **Properties Management** - Add, edit, view properties  
✅ **Tenants Management** - Manage tenant information  
✅ **Rent Collection** - Track rent payments  
✅ **Income & Expenses** - Record all financial transactions  
✅ **Maintenance Requests** - Track maintenance and repairs  
✅ **Reports & Analytics** - Financial reports and property performance  
✅ **Documents** - Upload and manage documents  
✅ **Settings** - Customize system preferences  

## Troubleshooting

**Issue: Can't login**
- Make sure the database is properly set up
- Check that the user exists in the `users` table
- The demo account accepts plain text password: `tz669933`

**Issue: Database connection error**
- Verify database credentials in `config/database.php`
- Ensure MySQL service is running
- Check that the database exists

**Issue: File uploads not working**
- Ensure `uploads/` directory exists and is writable
- Check PHP upload_max_filesize and post_max_size settings

## Security Notes

⚠️ **Important**: 
- Change the default admin password after first login
- Delete `setup.php` after installation
- Use HTTPS in production
- Regularly backup your database
- Keep database credentials secure
