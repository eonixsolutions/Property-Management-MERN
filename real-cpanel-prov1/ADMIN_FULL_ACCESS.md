# Admin Full Access Implementation

## Overview
Admin users (Super Admin, Admin, Manager) now have full access to all features and can view/manage all data in the system.

## New Helper Functions (in config.php)

### 1. `isAdmin()`
Returns `true` if the current user is an admin (Super Admin, Admin, or Manager).

### 2. `isSuperAdmin()`
Returns `true` if the current user is a Super Admin.

### 3. `requireAdmin()`
Requires the user to be logged in and have admin privileges. Redirects to dashboard if not admin.

### 4. `getQueryUserId()`
Returns `null` for admins (to see all data) or the current user ID for regular users.

### 5. `getUserWhereClause($table_alias = '')`
Builds a WHERE clause for user-specific queries. Returns empty string for admins.

### 6. `getCurrentUserRole()`
Gets the current user's role from session or database.

## Usage Examples

### In PHP files:

```php
// Check if user is admin
if (isAdmin()) {
    // Admin can see all data
    $query = "SELECT * FROM properties";
} else {
    // Regular user sees only their data
    $query = "SELECT * FROM properties WHERE user_id = " . getCurrentUserId();
}

// Or use the helper function
$where = getUserWhereClause('p');
$query = "SELECT * FROM properties p $where";

// Require admin access
requireAdmin(); // Redirects if not admin
```

## Pages Updated

The following pages should be updated to use admin functions:

1. **properties/index.php** - Allow admins to see all properties
2. **tenants/index.php** - Allow admins to see all tenants
3. **transactions/index.php** - Allow admins to see all transactions
4. **index.php** (Dashboard) - Show all data for admins
5. **reports/index.php** - Show all data for admins
6. **rent/index.php** - Show all rent payments for admins

## Database Setup

Run one of these to ensure admin user has Super Admin role:

1. **Via PHP script:**
   ```
   http://localhost/real-cpanel-prov1/database/make_admin_full_access.php
   ```

2. **Via SQL:**
   ```sql
   mysql -u root -p < database/make_admin_full_access.sql
   ```

3. **Direct SQL:**
   ```sql
   UPDATE users SET role = 'Super Admin', status = 'Active' 
   WHERE email = 'sidhykqatar@gmail.com';
   ```

## Admin Roles

- **Super Admin**: Full access to everything, can manage all users
- **Admin**: Full access to all data, can manage users (except Super Admins)
- **Manager**: Full access to view all data, limited user management
- **User**: Can only see/manage their own data
- **Viewer**: Read-only access to their own data

## Notes

- Admin users bypass all `user_id` restrictions in queries
- Admin users can access all properties, tenants, transactions, etc.
- Admin users can manage other users (depending on role)
- Regular users continue to see only their own data

