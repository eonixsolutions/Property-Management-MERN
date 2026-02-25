<?php
/**
 * Database Migration Tool - Add User Management Features
 * Adds roles, status, and improved user tracking
 */

session_start();
require_once '../config/config.php';

// Simple security - only allow logged in users
if (!isset($_SESSION['user_id'])) {
    die('Access denied. Please login first.');
}

$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['run_migration'])) {
    try {
        $conn = getDBConnection();
        
        // Check if columns already exist and add them if they don't
        $existing_columns = $conn->query("SHOW COLUMNS FROM users")->fetch_all(MYSQLI_ASSOC);
        $column_names = array_column($existing_columns, 'Field');
        
        // Add role column if it doesn't exist
        if (!in_array('role', $column_names)) {
            $conn->query("ALTER TABLE users ADD COLUMN role ENUM('Super Admin', 'Admin', 'Manager', 'User', 'Viewer') DEFAULT 'User' AFTER last_name");
        }
        
        // Add status column if it doesn't exist
        if (!in_array('status', $column_names)) {
            $conn->query("ALTER TABLE users ADD COLUMN status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active' AFTER role");
        }
        
        // Add last_login column if it doesn't exist
        if (!in_array('last_login', $column_names)) {
            $conn->query("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL AFTER status");
        }
        
        // Add email_verified column if it doesn't exist
        if (!in_array('email_verified', $column_names)) {
            $conn->query("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER last_login");
        }
        
        // Check if indexes exist and create them if they don't
        $existing_indexes = $conn->query("SHOW INDEXES FROM users")->fetch_all(MYSQLI_ASSOC);
        $index_names = array_column($existing_indexes, 'Key_name');
        
        // Create indexes if they don't exist
        if (!in_array('idx_user_email', $index_names)) {
            $conn->query("CREATE INDEX idx_user_email ON users(email)");
        }
        if (!in_array('idx_user_status', $index_names)) {
            $conn->query("CREATE INDEX idx_user_status ON users(status)");
        }
        if (!in_array('idx_user_role', $index_names)) {
            $conn->query("CREATE INDEX idx_user_role ON users(role)");
        }
        
        // Update existing admin user
        $conn->query("UPDATE users SET role = 'Super Admin', status = 'Active' WHERE email = 'sidhykqatar@gmail.com'");
        
        $message = "User management migration completed successfully!";
        $error = '';
        
        closeDBConnection($conn);
        
    } catch (Exception $e) {
        $error = "Migration failed: " . $e->getMessage();
    }
}

$page_title = 'User Management Migration';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($page_title); ?></title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <div class="container" style="max-width: 800px; margin: 50px auto;">
        <div class="content-card">
            <div class="card-header">
                <h1>🔧 User Management Migration</h1>
            </div>
            <div class="card-body">
                <?php if ($message): ?>
                    <div class="alert alert-success">
                        <?php echo htmlspecialchars($message); ?>
                        <br><br>
                        <a href="../users/index.php" class="btn btn-primary">Go to User Management</a>
                    </div>
                <?php endif; ?>
                
                <?php if ($error): ?>
                    <div class="alert alert-error">
                        <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php endif; ?>
                
                <?php if (!$message): ?>
                    <h2>What this migration will do:</h2>
                    <ul style="margin-left: 20px; line-height: 1.8;">
                        <li>Add <strong>role</strong> field: Super Admin, Admin, Manager, User, Viewer</li>
                        <li>Add <strong>status</strong> field: Active, Inactive, Suspended</li>
                        <li>Add <strong>last_login</strong> timestamp tracking</li>
                        <li>Add <strong>email_verified</strong> flag</li>
                        <li>Create performance indexes</li>
                        <li>Set default admin user to Super Admin role</li>
                    </ul>
                    
                    <form method="POST" action="">
                        <button type="submit" name="run_migration" class="btn btn-primary" style="margin-top: 20px;">
                            Run Migration
                        </button>
                    </form>
                <?php endif; ?>
            </div>
        </div>
    </div>
</body>
</html>

