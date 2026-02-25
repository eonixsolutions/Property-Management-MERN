<?php
/**
 * Database Migration: Add Property Images Table
 * This script creates the property_images table for storing property images
 * Access via: http://localhost/real/database/migrate_property_images.php
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
        
        // Check if table already exists
        $check_table = $conn->query("SHOW TABLES LIKE 'property_images'");
        
        if ($check_table->num_rows > 0 && isset($_POST['recreate'])) {
            // Drop existing table if user wants to recreate
            $conn->query("DROP TABLE IF EXISTS property_images");
            $message .= "Existing table dropped. ";
        }
        
        if ($check_table->num_rows == 0 || isset($_POST['recreate'])) {
            // Create the table
            $create_table = "CREATE TABLE IF NOT EXISTS property_images (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id INT NOT NULL,
                image_path VARCHAR(500) NOT NULL,
                image_name VARCHAR(255) NOT NULL,
                is_primary TINYINT(1) DEFAULT 0,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
                KEY idx_property_images_property (property_id),
                KEY idx_property_images_primary (is_primary),
                KEY idx_property_images_order (display_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            if ($conn->query($create_table)) {
                $message .= "Successfully created 'property_images' table! ";
                
                // Create uploads/properties directory if it doesn't exist
                $upload_dir = __DIR__ . '/../uploads/properties/';
                if (!file_exists($upload_dir)) {
                    if (mkdir($upload_dir, 0755, true)) {
                        $message .= "Created uploads/properties directory. ";
                    } else {
                        $error .= "Warning: Could not create uploads/properties directory. Please create it manually. ";
                    }
                } else {
                    $message .= "Uploads directory already exists. ";
                }
            } else {
                $error = "Error creating table: " . $conn->error;
            }
        } else {
            $message = "Table 'property_images' already exists. Check 'Recreate table' if you want to drop and recreate it.";
        }
        
        closeDBConnection($conn);
        
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

// Check current status
$conn = getDBConnection();
$check_table = $conn->query("SHOW TABLES LIKE 'property_images'");
$table_exists = $check_table->num_rows > 0;

// Check if uploads directory exists
$upload_dir = __DIR__ . '/../uploads/properties/';
$upload_dir_exists = file_exists($upload_dir);

closeDBConnection($conn);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Migration - Property Images</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            max-width: 700px;
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
        h1 { 
            color: #333; 
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .btn {
            background: #4f46e5;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: background 0.2s;
        }
        .btn:hover { 
            background: #4338ca; 
        }
        .btn-secondary {
            background: #6b7280;
        }
        .btn-secondary:hover {
            background: #4b5563;
        }
        .alert {
            padding: 12px 16px;
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
        .alert-warning {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
        }
        .status {
            padding: 12px;
            margin: 15px 0;
            border-radius: 6px;
        }
        .status-ok { 
            background: #d1fae5; 
            color: #065f46; 
        }
        .status-missing { 
            background: #fef3c7; 
            color: #92400e; 
        }
        .checkbox-group {
            margin: 15px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .checkbox-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
        }
        pre {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 13px;
            line-height: 1.5;
        }
        .info-box {
            background: #f9fafb;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box ul {
            margin: 10px 0 0 20px;
            padding: 0;
        }
        .info-box li {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>📸 Database Migration: Property Images</h1>
        
        <div class="status <?php echo $table_exists ? 'status-ok' : 'status-missing'; ?>">
            <strong>Current Status:</strong><br>
            <?php if ($table_exists): ?>
                ✓ Table 'property_images' exists
            <?php else: ?>
                ⚠ Table 'property_images' is missing
            <?php endif; ?>
            <br>
            <?php if ($upload_dir_exists): ?>
                ✓ Uploads directory exists
            <?php else: ?>
                ⚠ Uploads directory missing (will be created)
            <?php endif; ?>
        </div>
        
        <?php if ($message): ?>
            <div class="alert alert-success"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
        <?php if (!$table_exists || (isset($_POST['recreate']) && $table_exists)): ?>
        <form method="POST" action="">
            <p>This migration will:</p>
            <ul>
                <li>Create the 'property_images' table</li>
                <li>Create the uploads/properties directory</li>
                <li>Enable image upload functionality for properties</li>
            </ul>
            
            <?php if ($table_exists): ?>
            <div class="checkbox-group">
                <input type="checkbox" id="recreate" name="recreate" value="1">
                <label for="recreate"><strong>Recreate table</strong> (This will delete all existing image data!)</label>
            </div>
            <?php endif; ?>
            
            <button type="submit" name="run_migration" class="btn">Run Migration</button>
        </form>
        <?php else: ?>
            <div class="alert alert-info">
                ✓ Your database is up to date! The 'property_images' table already exists.
            </div>
            
            <div class="info-box">
                <strong>Next Steps:</strong>
                <ul>
                    <li>Go to <strong>Properties</strong> → Edit a master property</li>
                    <li>Scroll to the <strong>"Property Images"</strong> section</li>
                    <li>Upload images for your properties</li>
                    <li>Images will automatically appear on the landing page</li>
                </ul>
            </div>
            
            <div style="margin-top: 20px;">
                <a href="../index.php" class="btn btn-secondary" style="text-decoration: none; display: inline-block; margin-right: 10px;">← Back to Dashboard</a>
                <a href="../properties/index.php" class="btn" style="text-decoration: none; display: inline-block;">Go to Properties</a>
            </div>
        <?php endif; ?>
        
        <hr style="margin: 30px 0;">
        <h3>Alternative: Run SQL Manually</h3>
        <p>You can also run this SQL command directly in phpMyAdmin:</p>
        <pre>
CREATE TABLE IF NOT EXISTS property_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    image_name VARCHAR(255) NOT NULL,
    is_primary TINYINT(1) DEFAULT 0,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    KEY idx_property_images_property (property_id),
    KEY idx_property_images_primary (is_primary),
    KEY idx_property_images_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;</pre>
    </div>
</body>
</html>
