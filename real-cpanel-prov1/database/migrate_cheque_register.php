<?php
/**
 * Database Migration Tool - Add Cheque Register System
 * Tracks cheques from tenants and to owners with notifications
 */

session_start();
require_once '../config/database.php';

// Simple security - only allow logged in users
if (!isset($_SESSION['user_id'])) {
    die('Access denied. Please login first.');
}

$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['run_migration'])) {
    try {
        $conn = getDBConnection();
        
        // Check if tenant_cheques table exists
        $check_tenant_cheques = $conn->query("SHOW TABLES LIKE 'tenant_cheques'");
        
        if ($check_tenant_cheques->num_rows == 0) {
            // Create tenant_cheques table
            $sql_tenant = "CREATE TABLE IF NOT EXISTS tenant_cheques (
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
                INDEX idx_deposit_date (deposit_date),
                INDEX idx_status (status)
            )";
            
            if ($conn->query($sql_tenant)) {
                $message .= "✓ Successfully created tenant_cheques table!<br>";
            } else {
                $error .= "Error creating tenant_cheques: " . $conn->error . "<br>";
            }
        } else {
            $message .= "✓ tenant_cheques table already exists.<br>";
        }
        
        // Check if owner_cheques table exists
        $check_owner_cheques = $conn->query("SHOW TABLES LIKE 'owner_cheques'");
        
        if ($check_owner_cheques->num_rows == 0) {
            // Create owner_cheques table
            $sql_owner = "CREATE TABLE IF NOT EXISTS owner_cheques (
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
                INDEX idx_cheque_date (cheque_date),
                INDEX idx_status (status)
            )";
            
            if ($conn->query($sql_owner)) {
                $message .= "✓ Successfully created owner_cheques table!<br>";
            } else {
                $error .= "Error creating owner_cheques: " . $conn->error . "<br>";
            }
        } else {
            $message .= "✓ owner_cheques table already exists.<br>";
        }
        
        // Add cheque columns to rent_payments
        $check_rent_cheque = $conn->query("SHOW COLUMNS FROM rent_payments LIKE 'cheque_number'");
        if ($check_rent_cheque->num_rows == 0) {
            $conn->query("ALTER TABLE rent_payments 
                ADD COLUMN cheque_number VARCHAR(50) DEFAULT NULL AFTER paid_date,
                ADD COLUMN payment_method ENUM('Cash', 'Cheque', 'Bank Transfer', 'Online', 'Other') DEFAULT 'Cash' AFTER cheque_number");
            $message .= "✓ Added cheque fields to rent_payments table!<br>";
        }
        
        // Add cheque columns to owner_payments
        $check_owner_cheque = $conn->query("SHOW COLUMNS FROM owner_payments LIKE 'cheque_number'");
        if ($check_owner_cheque->num_rows == 0) {
            $conn->query("ALTER TABLE owner_payments 
                ADD COLUMN cheque_number VARCHAR(50) DEFAULT NULL AFTER paid_date,
                ADD COLUMN payment_method ENUM('Cash', 'Cheque', 'Bank Transfer', 'Online', 'Other') DEFAULT 'Cash' AFTER cheque_number");
            $message .= "✓ Added cheque fields to owner_payments table!<br>";
        }
        
        closeDBConnection($conn);
        
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

// Check current status
$conn = getDBConnection();
$check_tenant_cheques = $conn->query("SHOW TABLES LIKE 'tenant_cheques'");
$check_owner_cheques = $conn->query("SHOW TABLES LIKE 'owner_cheques'");
$has_tenant_cheques = $check_tenant_cheques->num_rows > 0;
$has_owner_cheques = $check_owner_cheques->num_rows > 0;
closeDBConnection($conn);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Migration - Cheque Register</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .card {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-bottom: 20px; }
        .btn {
            background: #4f46e5;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        }
        .btn:hover { background: #4338ca; }
        .alert {
            padding: 12px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .alert-success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        .alert-error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }
        .alert-info {
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #93c5fd;
        }
        .status {
            padding: 10px;
            margin: 15px 0;
            border-radius: 6px;
        }
        .status-ok { background: #d1fae5; color: #065f46; }
        .status-missing { background: #fef3c7; color: #92400e; }
        ul { margin: 10px 0; padding-left: 20px; }
        .example {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>🔧 Database Migration - Cheque Register</h1>
        
        <div class="status <?php echo $has_tenant_cheques && $has_owner_cheques ? 'status-ok' : 'status-missing'; ?>">
            <strong>Cheque Register Tables:</strong><br>
            Tenant Cheques: <?php echo $has_tenant_cheques ? '✓' : '✗'; ?><br>
            Owner Cheques: <?php echo $has_owner_cheques ? '✓' : '✗'; ?>
        </div>
        
        <?php if ($message): ?>
            <div class="alert alert-success"><?php echo $message; ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <?php if (!$has_tenant_cheques || !$has_owner_cheques): ?>
        <form method="POST" action="">
            <p>This migration will enable cheque register functionality:</p>
            <ul>
                <li>Track cheques received from tenants</li>
                <li>Track cheques issued to owners</li>
                <li>Notifications for upcoming cheque deposit dates</li>
                <li>Manage multiple cheques (e.g., 12 cheques for a year)</li>
            </ul>
            <button type="submit" name="run_migration" class="btn">Run Migration</button>
        </form>
        <?php else: ?>
            <div class="alert alert-info">
                ✓ Your database is up to date! Cheque register system is ready.
            </div>
            <a href="../index.php" class="btn" style="text-decoration: none; display: inline-block;">← Back to Dashboard</a>
        <?php endif; ?>
        
        <hr style="margin: 30px 0;">
        <h3>How Cheque Register Works:</h3>
        <div class="example">
            <strong>Tenant Cheques:</strong> When tenants pay rent with cheques, you can:
            <ul>
                <li>Record multiple cheques (e.g., 12 post-dated cheques for the year)</li>
                <li>Set deposit dates for each cheque</li>
                <li>Get notifications before deposit dates</li>
                <li>Track cheque status (Pending, Deposited, Cleared, Bounced)</li>
            </ul>
            
            <strong>Owner Cheques:</strong> When paying owners with cheques:
            <ul>
                <li>Record cheques issued to owners</li>
                <li>Set cheque dates</li>
                <li>Track when cheques are cleared</li>
                <li>Handle bounced or cancelled cheques</li>
            </ul>
        </div>
    </div>
</body>
</html>
