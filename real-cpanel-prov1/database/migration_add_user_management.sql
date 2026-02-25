-- Migration: Add user management fields to users table
-- Adds role-based access control and user status management

-- Add role column
ALTER TABLE users ADD COLUMN role ENUM('Super Admin', 'Admin', 'Manager', 'User', 'Viewer') DEFAULT 'User' AFTER last_name;

-- Add status column
ALTER TABLE users ADD COLUMN status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active' AFTER role;

-- Add last_login column
ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL AFTER status;

-- Add email_verified column
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER last_login;

-- Create indexes for faster user lookups
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_status ON users(status);
CREATE INDEX idx_user_role ON users(role);

-- Update existing users to have role
UPDATE users SET role = 'Super Admin', status = 'Active' WHERE email = 'sidhykqatar@gmail.com';

