-- Make admin users have full access
-- This ensures admin users can see and manage all data

-- Update existing admin users to have Super Admin role if they don't have a role set
UPDATE users SET role = 'Super Admin' WHERE email = 'sidhykqatar@gmail.com' AND (role IS NULL OR role = '' OR role = 'User');

-- Ensure role column exists (if migration hasn't been run)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('Super Admin', 'Admin', 'Manager', 'User', 'Viewer') DEFAULT 'User' AFTER last_name;

-- Ensure status column exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active' AFTER role;

-- Set default admin user to Super Admin
UPDATE users SET role = 'Super Admin', status = 'Active' WHERE email = 'sidhykqatar@gmail.com';

