-- Migration: Add owner rent fields to properties table
-- Run this to track properties owned by others and rent paid to them

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255) DEFAULT NULL AFTER user_id,
ADD COLUMN IF NOT EXISTS owner_contact VARCHAR(255) DEFAULT NULL AFTER owner_name,
ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255) DEFAULT NULL AFTER owner_contact,
ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20) DEFAULT NULL AFTER owner_email,
ADD COLUMN IF NOT EXISTS monthly_rent_to_owner DECIMAL(10,2) DEFAULT 0.00 AFTER owner_phone;

-- Owner Payments Table - Track payments made to property owners
CREATE TABLE IF NOT EXISTS owner_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_month DATE NOT NULL,
    paid_date DATE,
    payment_method ENUM('Cash', 'Check', 'Bank Transfer', 'Credit Card', 'Other') DEFAULT 'Bank Transfer',
    reference_number VARCHAR(100),
    notes TEXT,
    status ENUM('Pending', 'Paid', 'Overdue') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_property_month (property_id, payment_month),
    INDEX idx_user_date (user_id, paid_date)
);
