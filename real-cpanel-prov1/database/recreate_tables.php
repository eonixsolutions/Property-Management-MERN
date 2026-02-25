<?php
/**
 * Database Table Recreation Script
 * This script will recreate all tables in the database from schema.sql
 */

// Include database configuration
require_once __DIR__ . '/../config/database.php';

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Database Recreation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .success { color: #28a745; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin: 10px 0; }
        .error { color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0; }
        .info { color: #004085; padding: 10px; background: #cce5ff; border: 1px solid #b3d7ff; border-radius: 4px; margin: 10px 0; }
        .warning { color: #856404; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin: 10px 0; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
<div class='container'>
<h1>Database Table Recreation</h1>";

try {
    // Connect to MySQL server (without selecting database)
    echo "<div class='info'>Connecting to MySQL server...</div>";
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    echo "<div class='success'>✓ Connected to MySQL server</div>";
    
    // Read schema.sql file
    $schema_file = __DIR__ . '/schema.sql';
    if (!file_exists($schema_file)) {
        throw new Exception("Schema file not found: $schema_file");
    }
    
    echo "<div class='info'>Reading schema file...</div>";
    $sql = file_get_contents($schema_file);
    
    if (empty($sql)) {
        throw new Exception("Schema file is empty");
    }
    echo "<div class='success'>✓ Schema file loaded (" . number_format(strlen($sql)) . " bytes)</div>";
    
    // Disable foreign key checks temporarily
    echo "<div class='info'>Executing schema...</div>";
    $conn->query("SET FOREIGN_KEY_CHECKS = 0");
    
    // Split SQL into individual statements
    // Remove comments and split by semicolon
    $sql = preg_replace('/--.*$/m', '', $sql); // Remove single-line comments
    $sql = preg_replace('/\/\*.*?\*\//s', '', $sql); // Remove multi-line comments
    
    // Split by semicolon, but keep in mind that semicolons inside strings should be preserved
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        function($stmt) {
            return !empty($stmt) && strlen(trim($stmt)) > 0;
        }
    );
    
    $success_count = 0;
    $error_count = 0;
    $errors = [];
    
    foreach ($statements as $index => $statement) {
        $statement = trim($statement);
        if (empty($statement)) {
            continue;
        }
        
        // Skip USE statements as we'll handle database selection separately
        if (preg_match('/^USE\s+/i', $statement)) {
            continue;
        }
        
        // Handle CREATE DATABASE separately
        if (preg_match('/^CREATE\s+DATABASE/i', $statement)) {
            if ($conn->query($statement)) {
                $success_count++;
                echo "<div class='success'>✓ Database created/verified</div>";
            } else {
                $error_count++;
                $error_msg = $conn->error;
                $errors[] = "Database creation: $error_msg";
                echo "<div class='warning'>⚠ Database creation: $error_msg (may already exist)</div>";
            }
            continue;
        }
        
        // Execute the statement
        if ($conn->query($statement)) {
            $success_count++;
            // Only show first few successes to avoid clutter
            if ($success_count <= 5) {
                $preview = substr($statement, 0, 60) . '...';
                echo "<div class='success'>✓ Executed: $preview</div>";
            }
        } else {
            $error_count++;
            $error_msg = $conn->error;
            $errors[] = "Statement " . ($index + 1) . ": $error_msg";
            echo "<div class='error'>✗ Error in statement " . ($index + 1) . ": $error_msg</div>";
            // Show the problematic statement
            $preview = substr($statement, 0, 100) . '...';
            echo "<div class='info'><pre>$preview</pre></div>";
        }
    }
    
    // Re-enable foreign key checks
    $conn->query("SET FOREIGN_KEY_CHECKS = 1");
    
    // Select the database
    $conn->select_db(DB_NAME);
    
    // Verify tables were created
    echo "<div class='info'>Verifying tables...</div>";
    $result = $conn->query("SHOW TABLES");
    $tables = [];
    if ($result) {
        while ($row = $result->fetch_array()) {
            $tables[] = $row[0];
        }
    }
    
    echo "<div class='success'>✓ Found " . count($tables) . " tables in database</div>";
    echo "<div class='info'><strong>Tables created:</strong><br>" . implode(', ', $tables) . "</div>";
    
    // Summary
    echo "<div class='info'><strong>Summary:</strong><br>";
    echo "✓ Successful statements: $success_count<br>";
    if ($error_count > 0) {
        echo "✗ Errors: $error_count<br>";
        echo "<details><summary>View Errors</summary><pre>" . implode("\n", $errors) . "</pre></details>";
    } else {
        echo "✓ No errors encountered<br>";
    }
    echo "</div>";
    
    if (count($tables) > 0 && $error_count == 0) {
        echo "<div class='success'><strong>✓ Database recreation completed successfully!</strong></div>";
    } else if (count($tables) > 0) {
        echo "<div class='warning'><strong>⚠ Database recreation completed with some errors. Please review above.</strong></div>";
    } else {
        echo "<div class='error'><strong>✗ Database recreation failed. No tables were created.</strong></div>";
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "<div class='error'><strong>Fatal Error:</strong> " . htmlspecialchars($e->getMessage()) . "</div>";
}

echo "</div></body></html>";
?>

