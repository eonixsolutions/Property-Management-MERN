<?php
/**
 * Create Missing Tables
 * Checks which tables exist and creates any that are missing
 */

require_once __DIR__ . '/../config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Create Missing Tables</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .success { color: #28a745; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin: 10px 0; }
        .error { color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0; }
        .info { color: #004085; padding: 10px; background: #cce5ff; border: 1px solid #b3d7ff; border-radius: 4px; margin: 10px 0; }
        .warning { color: #856404; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
        th { background: #f0f0f0; }
    </style>
</head>
<body>
<div class='container'>
<h1>Create Missing Tables</h1>";

try {
    $conn = getDBConnection();
    
    // Get list of existing tables
    echo "<div class='info'>Checking existing tables...</div>";
    $result = $conn->query("SHOW TABLES");
    $existing_tables = [];
    if ($result) {
        while ($row = $result->fetch_array()) {
            $existing_tables[] = $row[0];
        }
    }
    echo "<div class='info'>Found " . count($existing_tables) . " existing tables: " . implode(', ', $existing_tables) . "</div>";
    
    // Define all required tables with their CREATE statements
    $tables = [
        'users' => "CREATE TABLE IF NOT EXISTS users (
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
        )",
        
        'properties' => "CREATE TABLE IF NOT EXISTS properties (
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
        )",
        
        'tenants' => "CREATE TABLE IF NOT EXISTS tenants (
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
        )",
        
        'transactions' => "CREATE TABLE IF NOT EXISTS transactions (
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
        )",
        
        'rent_payments' => "CREATE TABLE IF NOT EXISTS rent_payments (
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
        )",
        
        'owner_payments' => "CREATE TABLE IF NOT EXISTS owner_payments (
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
        )",
        
        'tenant_cheques' => "CREATE TABLE IF NOT EXISTS tenant_cheques (
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
        )",
        
        'owner_cheques' => "CREATE TABLE IF NOT EXISTS owner_cheques (
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
        )",
        
        'maintenance_requests' => "CREATE TABLE IF NOT EXISTS maintenance_requests (
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
        )",
        
        'documents' => "CREATE TABLE IF NOT EXISTS documents (
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
        )",
        
        'settings' => "CREATE TABLE IF NOT EXISTS settings (
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
        )"
    ];
    
    // Disable foreign key checks temporarily
    $conn->query("SET FOREIGN_KEY_CHECKS = 0");
    
    $created = [];
    $skipped = [];
    $errors = [];
    
    // Create tables in dependency order
    $table_order = ['users', 'properties', 'tenants', 'transactions', 'rent_payments', 'owner_payments', 'tenant_cheques', 'owner_cheques', 'maintenance_requests', 'documents', 'settings'];
    
    foreach ($table_order as $table_name) {
        if (!isset($tables[$table_name])) {
            continue;
        }
        
        if (in_array($table_name, $existing_tables)) {
            $skipped[] = $table_name;
            echo "<div class='info'>✓ Table '$table_name' already exists, skipping...</div>";
        } else {
            echo "<div class='info'>Creating table '$table_name'...</div>";
            if ($conn->query($tables[$table_name])) {
                $created[] = $table_name;
                echo "<div class='success'>✓ Table '$table_name' created successfully!</div>";
            } else {
                $error_msg = $conn->error;
                $errors[] = "$table_name: $error_msg";
                echo "<div class='error'>✗ Error creating '$table_name': $error_msg</div>";
            }
        }
    }
    
    // Re-enable foreign key checks
    $conn->query("SET FOREIGN_KEY_CHECKS = 1");
    
    // Summary
    echo "<div class='info'><h2>Summary</h2>";
    echo "<table>";
    echo "<tr><th>Status</th><th>Count</th><th>Tables</th></tr>";
    echo "<tr><td><strong>Created</strong></td><td>" . count($created) . "</td><td>" . (count($created) > 0 ? implode(', ', $created) : 'None') . "</td></tr>";
    echo "<tr><td><strong>Already Existed</strong></td><td>" . count($skipped) . "</td><td>" . (count($skipped) > 0 ? implode(', ', $skipped) : 'None') . "</td></tr>";
    if (count($errors) > 0) {
        echo "<tr><td><strong>Errors</strong></td><td>" . count($errors) . "</td><td>" . implode('; ', $errors) . "</td></tr>";
    }
    echo "</table></div>";
    
    if (count($created) > 0) {
        echo "<div class='success'><strong>✓ Successfully created " . count($created) . " table(s)!</strong></div>";
    }
    if (count($errors) > 0) {
        echo "<div class='error'><strong>✗ Encountered " . count($errors) . " error(s). Please review above.</strong></div>";
    }
    if (count($created) == 0 && count($errors) == 0) {
        echo "<div class='success'><strong>✓ All tables already exist. Database is up to date!</strong></div>";
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "<div class='error'><strong>Fatal Error:</strong> " . htmlspecialchars($e->getMessage()) . "</div>";
}

echo "</div></body></html>";
?>

