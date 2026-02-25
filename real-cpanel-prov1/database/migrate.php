<?php
/**
 * Database Migration Tool
 * Adds default_rent column to properties table
 * Access via: http://localhost/realestate/database/migrate.php
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
        
        // Check if column already exists
        $result = $conn->query("SHOW COLUMNS FROM properties LIKE 'default_rent'");
        
        if ($result->num_rows > 0) {
            $message = "Column 'default_rent' already exists. No migration needed.";
        } else {
            // Add the column
            $sql = "ALTER TABLE properties ADD COLUMN default_rent DECIMAL(10,2) DEFAULT 0.00 AFTER purchase_date";
            
            if ($conn->query($sql)) {
                $message = "Successfully added 'default_rent' column to properties table!";
            } else {
                $error = "Error: " . $conn->error;
            }
        }
        
        closeDBConnection($conn);
        
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

// Check current status
$conn = getDBConnection();
$result = $conn->query("SHOW COLUMNS FROM properties LIKE 'default_rent'");
$column_exists = $result->num_rows > 0;
closeDBConnection($conn);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Migration - Add default_rent</title>
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
    </style>
</head>
<body>
    <div class="card">
        <h1>🔧 Database Migration</h1>
        
        <div class="status <?php echo $column_exists ? 'status-ok' : 'status-missing'; ?>">
            <strong>Current Status:</strong> 
            <?php if ($column_exists): ?>
                ✓ Column 'default_rent' exists in properties table
            <?php else: ?>
                ⚠ Column 'default_rent' is missing in properties table
            <?php endif; ?>
        </div>
        
        <?php if ($message): ?>
            <div class="alert alert-success"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
        <?php if (!$column_exists): ?>
        <form method="POST" action="">
            <p>This migration will add the 'default_rent' column to your properties table.</p>
            <button type="submit" name="run_migration" class="btn">Run Migration</button>
        </form>
        <?php else: ?>
            <div class="alert alert-info">
                ✓ Your database is up to date! The 'default_rent' column already exists.
            </div>
            <a href="../index.php" class="btn" style="text-decoration: none; display: inline-block;">← Back to Dashboard</a>
        <?php endif; ?>
        
        <hr style="margin: 30px 0;">
        <h3>Alternative: Run SQL Manually</h3>
        <p>You can also run this SQL command directly in phpMyAdmin:</p>
        <pre style="background: #f3f4f6; padding: 15px; border-radius: 6px; overflow-x: auto;">
ALTER TABLE properties 
ADD COLUMN default_rent DECIMAL(10,2) DEFAULT 0.00 
AFTER purchase_date;</pre>
    </div>
</body>
</html>
