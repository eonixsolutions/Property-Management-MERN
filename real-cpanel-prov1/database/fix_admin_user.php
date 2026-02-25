<?php
/**
 * Fix Admin User - Create admin user if it doesn't exist
 */

require_once __DIR__ . '/../config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Fix Admin User</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .success { color: #28a745; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin: 10px 0; }
        .error { color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0; }
        .info { color: #004085; padding: 10px; background: #cce5ff; border: 1px solid #b3d7ff; border-radius: 4px; margin: 10px 0; }
        .warning { color: #856404; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
<div class='container'>
<h1>Fix Admin User</h1>";

try {
    echo "<div class='info'>Connecting to database: " . DB_NAME . "</div>";
    $conn = getDBConnection();
    echo "<div class='success'>✓ Connected</div>";
    
    // Check if users table exists
    echo "<div class='info'>Checking if users table exists...</div>";
    $result = $conn->query("SHOW TABLES LIKE 'users'");
    if (!$result || $result->num_rows == 0) {
        echo "<div class='error'>✗ Users table does not exist!</div>";
        echo "<div class='info'>Please run <a href='create_new_database.php?db_name=" . DB_NAME . "'>create_new_database.php</a> first to create all tables.</div>";
        exit;
    }
    echo "<div class='success'>✓ Users table exists</div>";
    
    // Check if admin user exists
    echo "<div class='info'>Checking for admin user...</div>";
    $email = 'sidhykqatar@gmail.com';
    $stmt = $conn->prepare("SELECT id, email, first_name, last_name, role FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        echo "<div class='success'>✓ Admin user already exists:</div>";
        echo "<div class='info'>";
        echo "ID: " . $user['id'] . "<br>";
        echo "Email: " . htmlspecialchars($user['email']) . "<br>";
        echo "Name: " . htmlspecialchars($user['first_name'] . ' ' . $user['last_name']) . "<br>";
        echo "Role: " . htmlspecialchars($user['role']) . "<br>";
        echo "Password: <strong>tz669933</strong>";
        echo "</div>";
        echo "<div class='success'><strong>✓ You can now log in with these credentials!</strong></div>";
    } else {
        echo "<div class='warning'>⚠ Admin user not found. Creating it now...</div>";
        
        // Create admin user with bcrypt hash
        $password_hash = '$2y$10$Ke3qKv3pA7gFQf5IzxUMJua/pTmCwYTQS0IhC.hYGvt5lrOZbCLje'; // Hash for 'tz669933'
        
        $stmt = $conn->prepare("INSERT INTO users (email, password, first_name, last_name, role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $first_name = 'Admin';
        $last_name = 'User';
        $role = 'Super Admin';
        $status = 'Active';
        $email_verified = 1;
        
        $stmt->bind_param("ssssssi", $email, $password_hash, $first_name, $last_name, $role, $status, $email_verified);
        
        if ($stmt->execute()) {
            echo "<div class='success'>✓ Admin user created successfully!</div>";
            echo "<div class='info'><strong>Login Credentials:</strong><br>";
            echo "Email: <strong>sidhykqatar@gmail.com</strong><br>";
            echo "Password: <strong>tz669933</strong></div>";
            echo "<div class='success'><strong>✓ You can now log in!</strong></div>";
        } else {
            throw new Exception("Failed to create admin user: " . $conn->error);
        }
    }
    
    $stmt->close();
    $conn->close();
    
    echo "<div class='info'><a href='../auth/login.php'>Go to Login Page</a></div>";
    
} catch (Exception $e) {
    echo "<div class='error'><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</div>";
    if (isset($conn)) {
        echo "<div class='error'>MySQL Error: " . htmlspecialchars($conn->error) . "</div>";
    }
}

echo "</div></body></html>";
?>

