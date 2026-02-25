<?php
/**
 * Database Migration Tool - Add Owner Rent Fields
 * Adds owner information and owner_payments table
 * Access via: http://localhost/realestate/database/migrate_owner.php
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
        
        // Check if columns already exist
        $check_owner_name = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
        $has_owner_fields = $check_owner_name->num_rows > 0;
        
        if (!$has_owner_fields) {
            // Add owner fields to properties table
            $sql1 = "ALTER TABLE properties 
                ADD COLUMN owner_name VARCHAR(255) DEFAULT NULL AFTER user_id,
                ADD COLUMN owner_contact VARCHAR(255) DEFAULT NULL AFTER owner_name,
                ADD COLUMN owner_email VARCHAR(255) DEFAULT NULL AFTER owner_contact,
                ADD COLUMN owner_phone VARCHAR(20) DEFAULT NULL AFTER owner_email,
                ADD COLUMN monthly_rent_to_owner DECIMAL(10,2) DEFAULT 0.00 AFTER owner_phone";
            
            if ($conn->query($sql1)) {
                $message .= "✓ Successfully added owner fields to properties table!<br>";
            } else {
                $error .= "Error adding owner fields: " . $conn->error . "<br>";
            }
        } else {
            $message .= "✓ Owner fields already exist in properties table.<br>";
        }
        
        // Check if owner_payments table exists
        $check_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
        $table_exists = $check_table->num_rows > 0;
        
        if (!$table_exists) {
            // Create owner_payments table
            $sql2 = "CREATE TABLE owner_payments (
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
            )";
            
            if ($conn->query($sql2)) {
                $message .= "✓ Successfully created owner_payments table!<br>";
            } else {
                $error .= "Error creating owner_payments table: " . $conn->error . "<br>";
            }
        } else {
            $message .= "✓ owner_payments table already exists.<br>";
        }
        
        closeDBConnection($conn);
        
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

// Check current status
$conn = getDBConnection();
$check_owner_name = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner_fields = $check_owner_name->num_rows > 0;
$check_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$table_exists = $check_table->num_rows > 0;
closeDBConnection($conn);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Migration - Add Owner Rent Fields</title>
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
    </style>
</head>
<body>
    <div class="card">
        <h1>🔧 Database Migration - Owner Rent Tracking</h1>
        
        <div class="status <?php echo $has_owner_fields ? 'status-ok' : 'status-missing'; ?>">
            <strong>Properties Table:</strong> 
            <?php if ($has_owner_fields): ?>
                ✓ Owner fields exist
            <?php else: ?>
                ⚠ Owner fields missing
            <?php endif; ?>
        </div>
        
        <div class="status <?php echo $table_exists ? 'status-ok' : 'status-missing'; ?>">
            <strong>Owner Payments Table:</strong> 
            <?php if ($table_exists): ?>
                ✓ Table exists
            <?php else: ?>
                ⚠ Table missing
            <?php endif; ?>
        </div>
        
        <?php if ($message): ?>
            <div class="alert alert-success"><?php echo $message; ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <?php if (!$has_owner_fields || !$table_exists): ?>
        <form method="POST" action="">
            <p>This migration will:</p>
            <ul>
                <li>Add owner information fields to properties table</li>
                <li>Create owner_payments table to track rent paid to owners</li>
            </ul>
            <button type="submit" name="run_migration" class="btn">Run Migration</button>
        </form>
        <?php else: ?>
            <div class="alert alert-info">
                ✓ Your database is up to date! Owner rent tracking is ready.
            </div>
            <a href="../index.php" class="btn" style="text-decoration: none; display: inline-block;">← Back to Dashboard</a>
        <?php endif; ?>
        
        <hr style="margin: 30px 0;">
        <h3>What This Enables:</h3>
        <ul>
            <li>Track properties owned by others (landlords)</li>
            <li>Record monthly rent paid to property owners</li>
            <li>Calculate net profit: (Rent Received) - (Owner Rent) - (Expenses)</li>
            <li>Generate monthly profit reports by property</li>
        </ul>
    </div>
</body>
</html>
