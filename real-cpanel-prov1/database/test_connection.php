<?php
/**
 * Test Database Connection
 * Quick test to verify database and tables exist
 */

require_once __DIR__ . '/../config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Database Connection Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .success { color: #28a745; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin: 10px 0; }
        .error { color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0; }
        .info { color: #004085; padding: 10px; background: #cce5ff; border: 1px solid #b3d7ff; border-radius: 4px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
        th { background: #f0f0f0; }
    </style>
</head>
<body>
<div class='container'>
<h1>Database Connection Test</h1>";

try {
    echo "<div class='info'>Testing database connection...</div>";
    $conn = getDBConnection();
    echo "<div class='success'>✓ Connected to database: " . DB_NAME . "</div>";
    
    // Check tables
    echo "<div class='info'>Checking tables...</div>";
    $result = $conn->query("SHOW TABLES");
    $tables = [];
    if ($result) {
        while ($row = $result->fetch_array()) {
            $tables[] = $row[0];
        }
    }
    
    echo "<div class='success'>✓ Found " . count($tables) . " tables</div>";
    
    if (count($tables) > 0) {
        echo "<table>";
        echo "<tr><th>Table Name</th><th>Rows</th><th>Status</th></tr>";
        foreach ($tables as $table) {
            $count_result = $conn->query("SELECT COUNT(*) as count FROM `$table`");
            $count = $count_result ? $count_result->fetch_assoc()['count'] : 'N/A';
            echo "<tr><td>$table</td><td>$count</td><td>✓ OK</td></tr>";
        }
        echo "</table>";
    }
    
    // Check for admin user
    echo "<div class='info'>Checking admin user...</div>";
    $result = $conn->query("SELECT email, first_name, last_name, role FROM users WHERE email = 'sidhykqatar@gmail.com'");
    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();
        echo "<div class='success'>✓ Admin user found:</div>";
        echo "<div class='info'>";
        echo "Email: " . htmlspecialchars($user['email']) . "<br>";
        echo "Name: " . htmlspecialchars($user['first_name'] . ' ' . $user['last_name']) . "<br>";
        echo "Role: " . htmlspecialchars($user['role']) . "<br>";
        echo "Password: tz669933";
        echo "</div>";
    } else {
        echo "<div class='error'>✗ Admin user not found. Please run create_fresh_database.php</div>";
    }
    
    $conn->close();
    
    echo "<div class='success'><strong>✓ Database is ready to use!</strong></div>";
    echo "<div class='info'><a href='../auth/login.php'>Go to Login Page</a></div>";
    
} catch (Exception $e) {
    echo "<div class='error'><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</div>";
    echo "<div class='info'>Please run <a href='create_fresh_database.php'>create_fresh_database.php</a> to set up the database.</div>";
}

echo "</div></body></html>";
?>

