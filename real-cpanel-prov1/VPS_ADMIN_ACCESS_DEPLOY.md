# Deploy Admin Full Access to VPS

## Quick Deployment

### Option 1: Using PowerShell Script (Recommended)

From your local machine, run:
```powershell
.\deploy-admin-access-vps.ps1
```

This will:
- Copy updated `config/config.php` with admin functions
- Copy updated `auth/login.php` with role storage
- Copy database migration files
- Copy deployment script to VPS

Then SSH to VPS and run:
```bash
bash /root/deploy-admin-access-vps.sh
```

### Option 2: Manual Copy

1. **Copy files to VPS:**
```bash
# From local machine
scp config/config.php root@104.237.2.52:/var/www/html/realestate/config/
scp auth/login.php root@104.237.2.52:/var/www/html/realestate/auth/
scp database/make_admin_full_access.php root@104.237.2.52:/var/www/html/realestate/database/
scp database/make_admin_full_access.sql root@104.237.2.52:/var/www/html/realestate/database/
```

2. **SSH into VPS:**
```bash
ssh root@104.237.2.52
```

3. **Run database migration:**
```bash
cd /var/www/html/realestate

# Option A: Via PHP script (in browser)
# Visit: https://realestate.fmcqatar.com/database/make_admin_full_access.php

# Option B: Via SQL
mysql -u sidhyk -p'Tz#669933' realestate < database/make_admin_full_access.sql

# Option C: Via MySQL command line
mysql -u sidhyk -p'Tz#669933' realestate << 'EOF'
UPDATE users SET role = 'Super Admin', status = 'Active' WHERE email = 'sidhykqatar@gmail.com';
SELECT id, email, role, status FROM users;
EOF
```

4. **Verify:**
```bash
# Check if admin functions exist in config.php
grep -q "function isAdmin" /var/www/html/realestate/config/config.php && echo "✓ Admin functions found" || echo "✗ Admin functions missing"

# Check if role is stored in login.php
grep -q "user_role" /var/www/html/realestate/auth/login.php && echo "✓ Role storage found" || echo "✗ Role storage missing"

# Check database
mysql -u sidhyk -p'Tz#669933' -e "USE realestate; SELECT id, email, role, status FROM users WHERE email = 'sidhykqatar@gmail.com';"
```

## What Gets Updated

1. **config/config.php**
   - Added `isAdmin()` function
   - Added `isSuperAdmin()` function
   - Added `requireAdmin()` function
   - Added `getQueryUserId()` function
   - Added `getUserWhereClause()` function
   - Added `getCurrentUserRole()` function

2. **auth/login.php**
   - Stores user role in session during login
   - Loads role from database and caches in `$_SESSION['user_role']`

3. **Database**
   - Adds `role` column to `users` table (if not exists)
   - Adds `status` column to `users` table (if not exists)
   - Sets admin user (`sidhykqatar@gmail.com`) to `Super Admin` role

## Testing

After deployment:

1. **Log out and log back in** to refresh session
2. **Check if you can see all data:**
   - Properties (should see all, not just yours)
   - Tenants (should see all)
   - Transactions (should see all)
   - Reports (should show all data)

3. **Verify admin functions work:**
   - Try accessing `/users/index.php` - should work
   - Try viewing other users' data - should work
   - Check dashboard - should show all properties/tenants

## Troubleshooting

### Admin functions not working
- Make sure `config/config.php` was copied correctly
- Check file permissions: `chmod 644 /var/www/html/realestate/config/config.php`
- Clear browser cache and log out/in again

### Role not being stored
- Make sure `auth/login.php` was copied correctly
- Check if `role` column exists in database
- Log out and log back in to refresh session

### Database migration failed
- Check database credentials in `config/database.php`
- Verify user `sidhyk` has privileges on `realestate` database
- Run migration manually via MySQL command line

## Files Changed

- `config/config.php` - Added admin helper functions
- `auth/login.php` - Store role in session
- `database/make_admin_full_access.php` - Migration script
- `database/make_admin_full_access.sql` - SQL migration

## Notes

- Admin users can now see ALL data (properties, tenants, transactions, etc.)
- Regular users still see only their own data
- Admin role is cached in session for performance
- Role is checked on each page load via helper functions

