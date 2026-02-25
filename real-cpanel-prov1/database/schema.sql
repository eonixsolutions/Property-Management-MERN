-- Real Estate Management System Database Schema (Consolidated)

-- Create the database (update the name if you prefer a different one)
CREATE DATABASE IF NOT EXISTS property_db
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;
USE property_db;

-- Clean existing tables (safe to run on fresh install)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS owner_cheques;
DROP TABLE IF EXISTS tenant_cheques;
DROP TABLE IF EXISTS owner_payments;
DROP TABLE IF EXISTS rent_payments;
DROP TABLE IF EXISTS maintenance_requests;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------
-- Users
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('Super Admin', 'Admin', 'Manager', 'User', 'Viewer') DEFAULT 'User',
    status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    last_login TIMESTAMP NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_users_email (email),
    KEY idx_users_status (status),
    KEY idx_users_role (role)
);

-- ------------------------------------------------------------------
-- Properties (includes owner and unit support)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    parent_property_id INT DEFAULT NULL,
    unit_name VARCHAR(100) DEFAULT NULL,
    is_unit TINYINT(1) DEFAULT 0,
    owner_name VARCHAR(255) DEFAULT NULL,
    owner_contact VARCHAR(255) DEFAULT NULL,
    owner_email VARCHAR(255) DEFAULT NULL,
    owner_phone VARCHAR(20) DEFAULT NULL,
    monthly_rent_to_owner DECIMAL(10,2) DEFAULT 0.00,
    property_name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Qatar',
    property_type ENUM('Apartment', 'Villa', 'House', 'Condo', 'Townhouse', 'Studio', 'Penthouse', 'Commercial', 'Office', 'Shop', 'Warehouse', 'Land', 'Other') NOT NULL,
    bedrooms INT,
    bathrooms DECIMAL(3,1),
    square_feet INT,
    purchase_price DECIMAL(12,2),
    current_value DECIMAL(12,2),
    purchase_date DATE,
    default_rent DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('Vacant', 'Occupied', 'Under Maintenance') DEFAULT 'Vacant',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_property_id) REFERENCES properties(id) ON DELETE CASCADE,
    KEY idx_properties_user (user_id),
    KEY idx_properties_parent (parent_property_id),
    KEY idx_properties_status (status)
);

-- ------------------------------------------------------------------
-- Tenants (includes Qatar ID support)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    qatar_id VARCHAR(20),
    move_in_date DATE,
    move_out_date DATE,
    lease_start DATE,
    lease_end DATE,
    monthly_rent DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2),
    status ENUM('Active', 'Past', 'Pending') DEFAULT 'Active',
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    KEY idx_tenants_status (status)
);

-- ------------------------------------------------------------------
-- Transactions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    property_id INT,
    tenant_id INT,
    type ENUM('Income', 'Expense') NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    payment_method ENUM('Cash', 'Check', 'Cheque', 'Bank Transfer', 'Credit Card', 'Online', 'Other') DEFAULT 'Bank Transfer',
    reference_number VARCHAR(100),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency ENUM('Monthly', 'Weekly', 'Yearly') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    KEY idx_transactions_user_date (user_id, transaction_date),
    KEY idx_transactions_type (type)
);

-- ------------------------------------------------------------------
-- Rent Payments (includes cheque tracking)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rent_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    property_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    cheque_number VARCHAR(50),
    payment_method ENUM('Cash', 'Check', 'Cheque', 'Bank Transfer', 'Credit Card', 'Online', 'Other') DEFAULT 'Cash',
    status ENUM('Pending', 'Paid', 'Overdue', 'Partial') DEFAULT 'Pending',
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    KEY idx_rent_payments_status (status),
    KEY idx_rent_payments_due_date (due_date),
    KEY idx_rent_payments_paid_date (paid_date)
);

-- ------------------------------------------------------------------
-- Owner Payments
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS owner_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_month DATE NOT NULL,
    paid_date DATE,
    cheque_number VARCHAR(50),
    payment_method ENUM('Cash', 'Check', 'Cheque', 'Bank Transfer', 'Credit Card', 'Online', 'Other') DEFAULT 'Bank Transfer',
    reference_number VARCHAR(100),
    notes TEXT,
    status ENUM('Pending', 'Paid', 'Overdue') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_owner_payments_month (payment_month),
    KEY idx_owner_payments_status (status)
);

-- ------------------------------------------------------------------
-- Tenant Cheques
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_cheques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tenant_id INT NOT NULL,
    property_id INT NOT NULL,
    rent_payment_id INT DEFAULT NULL,
    cheque_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255),
    cheque_amount DECIMAL(10,2) NOT NULL,
    cheque_date DATE NOT NULL,
    deposit_date DATE,
    status ENUM('Pending', 'Deposited', 'Bounced', 'Cleared') DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (rent_payment_id) REFERENCES rent_payments(id) ON DELETE SET NULL,
    KEY idx_tenant_cheques_deposit (deposit_date),
    KEY idx_tenant_cheques_status (status)
);

-- ------------------------------------------------------------------
-- Owner Cheques
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS owner_cheques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    property_id INT NOT NULL,
    owner_payment_id INT DEFAULT NULL,
    cheque_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255),
    cheque_amount DECIMAL(10,2) NOT NULL,
    cheque_date DATE NOT NULL,
    issue_date DATE,
    status ENUM('Issued', 'Cleared', 'Bounced', 'Cancelled') DEFAULT 'Issued',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_payment_id) REFERENCES owner_payments(id) ON DELETE SET NULL,
    KEY idx_owner_cheques_date (cheque_date),
    KEY idx_owner_cheques_status (status)
);

-- ------------------------------------------------------------------
-- Maintenance Requests
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    tenant_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('Low', 'Medium', 'High', 'Emergency') DEFAULT 'Medium',
    status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending',
    cost DECIMAL(10,2),
    completed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------
-- Documents
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    property_id INT,
    tenant_id INT,
    document_type ENUM('Lease Agreement', 'Invoice', 'Receipt', 'Contract', 'Other') NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------
-- Settings
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    currency VARCHAR(10) DEFAULT 'QAR',
    date_format VARCHAR(20) DEFAULT 'Y-m-d',
    timezone VARCHAR(50) DEFAULT 'UTC',
    notification_email BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_settings_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Seed Demo Admin User (email: sidhykqatar@gmail.com, password: tz669933)
-- ------------------------------------------------------------------
INSERT INTO users (email, password, first_name, last_name, role, status, email_verified)
VALUES (
    'sidhykqatar@gmail.com',
    '$2y$10$Ke3qKv3pA7gFQf5IzxUMJua/pTmCwYTQS0IhC.hYGvt5lrOZbCLje',
    'Admin',
    'User',
    'Super Admin',
    'Active',
    TRUE
)
ON DUPLICATE KEY UPDATE email = VALUES(email);
