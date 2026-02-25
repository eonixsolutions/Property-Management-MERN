-- Migration: Add Cheque Register System
-- Tracks cheques received from tenants and cheques issued to owners

-- Tenant Cheques Table (Cheques received from tenants)
CREATE TABLE IF NOT EXISTS tenant_cheques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tenant_id INT NOT NULL,
    property_id INT NOT NULL,
    rent_payment_id INT DEFAULT NULL, -- Link to rent_payments if applicable
    cheque_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255),
    cheque_amount DECIMAL(10,2) NOT NULL,
    cheque_date DATE NOT NULL, -- Date written on cheque
    deposit_date DATE, -- Date to deposit/actual deposit date
    status ENUM('Pending', 'Deposited', 'Bounced', 'Cleared') DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_deposit_date (deposit_date),
    INDEX idx_status (status)
);

-- Owner Cheques Table (Cheques issued to owners)
CREATE TABLE IF NOT EXISTS owner_cheques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    property_id INT NOT NULL,
    owner_payment_id INT DEFAULT NULL, -- Link to owner_payments if applicable
    cheque_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255),
    cheque_amount DECIMAL(10,2) NOT NULL,
    cheque_date DATE NOT NULL, -- Date written on cheque
    issue_date DATE, -- Date cheque was issued
    status ENUM('Issued', 'Cleared', 'Bounced', 'Cancelled') DEFAULT 'Issued',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_cheque_date (cheque_date),
    INDEX idx_status (status)
);

-- Add cheque tracking columns to rent_payments (optional, for linking)
ALTER TABLE rent_payments 
ADD COLUMN IF NOT EXISTS cheque_number VARCHAR(50) DEFAULT NULL AFTER paid_date,
ADD COLUMN IF NOT EXISTS payment_method ENUM('Cash', 'Cheque', 'Bank Transfer', 'Online', 'Other') DEFAULT 'Cash' AFTER cheque_number;

-- Add cheque tracking columns to owner_payments (optional, for linking)
ALTER TABLE owner_payments 
ADD COLUMN IF NOT EXISTS cheque_number VARCHAR(50) DEFAULT NULL AFTER paid_date,
ADD COLUMN IF NOT EXISTS payment_method ENUM('Cash', 'Cheque', 'Bank Transfer', 'Online', 'Other') DEFAULT 'Cash' AFTER cheque_number;

