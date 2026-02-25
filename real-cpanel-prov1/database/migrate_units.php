<?php
/**
 * Database Migration Tool - Add Property Units Support
 * Allows properties to be split into multiple units (e.g., villa into apartments)
 * Access via: http://localhost/realestate/database/migrate_units.php
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
        $check_parent = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
        $has_unit_fields = $check_parent->num_rows > 0;
        
        if (!$has_unit_fields) {
            // Add unit fields to properties table
            $sql = "ALTER TABLE properties 
                ADD COLUMN parent_property_id INT DEFAULT NULL AFTER user_id,
                ADD COLUMN unit_name VARCHAR(100) DEFAULT NULL AFTER parent_property_id,
                ADD COLUMN is_unit BOOLEAN DEFAULT FALSE AFTER unit_name";
            
            if ($conn->query($sql)) {
                // Add foreign key constraint
                try {
                    $conn->query("ALTER TABLE properties 
                        ADD CONSTRAINT fk_parent_property 
                        FOREIGN KEY (parent_property_id) REFERENCES properties(id) ON DELETE CASCADE");
                    $message .= "✓ Successfully added unit fields and foreign key to properties table!<br>";
                } catch (Exception $e) {
                    // Foreign key might already exist or table has data conflicts
                    $message .= "✓ Successfully added unit fields. Note: Foreign key constraint may need manual setup.<br>";
                }
            } else {
                $error .= "Error adding unit fields: " . $conn->error . "<br>";
            }
        } else {
            $message .= "✓ Unit fields already exist in properties table.<br>";
        }
        
        closeDBConnection($conn);
        
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

// Check current status
$conn = getDBConnection();
$check_parent = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_parent->num_rows > 0;
closeDBConnection($conn);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Migration - Add Property Units</title>
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
        <h1>🔧 Database Migration - Property Units</h1>
        
        <div class="status <?php echo $has_unit_fields ? 'status-ok' : 'status-missing'; ?>">
            <strong>Properties Table:</strong> 
            <?php if ($has_unit_fields): ?>
                ✓ Unit fields exist
            <?php else: ?>
                ⚠ Unit fields missing
            <?php endif; ?>
        </div>
        
        <?php if ($message): ?>
            <div class="alert alert-success"><?php echo $message; ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <?php if (!$has_unit_fields): ?>
        <form method="POST" action="">
            <p>This migration will enable property units functionality:</p>
            <ul>
                <li>Link properties as units of a master property</li>
                <li>Support splitting properties (e.g., villa into apartments)</li>
                <li>Track individual unit rents vs master property owner rent</li>
            </ul>
            <button type="submit" name="run_migration" class="btn">Run Migration</button>
        </form>
        <?php else: ?>
            <div class="alert alert-info">
                ✓ Your database is up to date! Property units are ready.
            </div>
            <a href="../index.php" class="btn" style="text-decoration: none; display: inline-block;">← Back to Dashboard</a>
        <?php endif; ?>
        
        <hr style="margin: 30px 0;">
        <h3>How Property Units Work:</h3>
        <div class="example">
            <strong>Example:</strong> Villa rented from owner for 10,000/month<br><br>
            <strong>Master Property:</strong> Villa (Owner: John, Rent: 10,000/month)<br>
            <strong>Units:</strong><br>
            - Apartment 1 (Tenant: Alice, Rent: 2,500)<br>
            - Apartment 2 (Tenant: Bob, Rent: 3,000)<br>
            - Apartment 3 (Tenant: Charlie, Rent: 1,500)<br>
            - Apartment 4 (Tenant: Diana, Rent: 2,000)<br>
            - Apartment 5 (Tenant: Eve, Rent: 1,000)<br><br>
            <strong>Profit:</strong> (2,500 + 3,000 + 1,500 + 2,000 + 1,000) - 10,000 = 0
        </div>
    </div>
</body>
</html>
