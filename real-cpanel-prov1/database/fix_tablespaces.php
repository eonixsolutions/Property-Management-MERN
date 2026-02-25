<?php
/**
 * Fix Tablespace Issues and Rebuild Tables
 * This script handles orphaned InnoDB tablespaces and recreates all tables
 */

require_once __DIR__ . '/../config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Fix Tablespaces and Rebuild Tables</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .success { color: #28a745; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin: 10px 0; }
        .error { color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0; }
        .info { color: #004085; padding: 10px; background: #cce5ff; border: 1px solid #b3d7ff; border-radius: 4px; margin: 10px 0; }
        .warning { color: #856404; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
<div class='container'>
<h1>Fix Tablespaces and Rebuild All Tables</h1>
<div class='warning'><strong>⚠ WARNING:</strong> This will DELETE ALL DATA and recreate all tables!</div>";

try {
    // Connect to MySQL
    echo "<div class='info'>Connecting to MySQL...</div>";
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    echo "<div class='success'>✓ Connected</div>";
    
    // Create/select database
    echo "<div class='info'>Setting up database...</div>";
    $conn->query("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci");
    $conn->select_db(DB_NAME);
    echo "<div class='success'>✓ Database ready</div>";
    
    // Disable foreign key checks
    $conn->query("SET FOREIGN_KEY_CHECKS = 0");
    
    // List of all tables
    $all_tables = [
        'owner_cheques',
        'tenant_cheques',
        'owner_payments',
        'rent_payments',
        'maintenance_requests',
        'documents',
        'transactions',
        'tenants',
        'properties',
        'settings',
        'users'
    ];
    
    echo "<div class='info'>Step 1: Fixing orphaned tablespaces...</div>";
    
    // For each table, try to handle orphaned tablespace
    foreach ($all_tables as $table) {
        // Check if table exists
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        $table_exists = $result && $result->num_rows > 0;
        
        if ($table_exists) {
            // Table exists, try to discard tablespace and drop
            $conn->query("ALTER TABLE `$table` DISCARD TABLESPACE");
            if ($conn->query("DROP TABLE `$table`")) {
                echo "<div class='success'>✓ Dropped: $table</div>";
            } else {
                echo "<div class='warning'>⚠ Could not drop $table: " . $conn->error . "</div>";
            }
        } else {
            // Table doesn't exist but might have orphaned tablespace
            // Create a minimal table structure to attach to the orphaned tablespace
            $conn->query("CREATE TABLE IF NOT EXISTS `$table` (id INT PRIMARY KEY) ENGINE=InnoDB");
            // Now discard the tablespace
            $conn->query("ALTER TABLE `$table` DISCARD TABLESPACE");
            // Drop the table
            $conn->query("DROP TABLE IF EXISTS `$table`");
            echo "<div class='info'>✓ Cleaned orphaned tablespace for: $table</div>";
        }
    }
    
    // Force drop any remaining tables
    echo "<div class='info'>Step 2: Force dropping any remaining tables...</div>";
    foreach ($all_tables as $table) {
        $conn->query("DROP TABLE IF EXISTS `$table`");
    }
    
    // Read schema file
    echo "<div class='info'>Step 3: Reading schema file...</div>";
    $schema_file = __DIR__ . '/schema.sql';
    if (!file_exists($schema_file)) {
        throw new Exception("Schema file not found");
    }
    
    $sql = file_get_contents($schema_file);
    
    // Remove comments
    $sql = preg_replace('/--.*$/m', '', $sql);
    $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);
    
    // Split into statements
    $statements = [];
    $current = '';
    $in_string = false;
    $string_char = '';
    
    for ($i = 0; $i < strlen($sql); $i++) {
        $char = $sql[$i];
        $current .= $char;
        
        if (($char == '"' || $char == "'") && ($i == 0 || $sql[$i-1] != '\\')) {
            if (!$in_string) {
                $in_string = true;
                $string_char = $char;
            } else if ($char == $string_char) {
                $in_string = false;
            }
        }
        
        if (!$in_string && $char == ';') {
            $stmt = trim($current);
            if (!empty($stmt) && strlen($stmt) > 1 && !preg_match('/^USE\s+/i', $stmt)) {
                $statements[] = $stmt;
            }
            $current = '';
        }
    }
    
    $stmt = trim($current);
    if (!empty($stmt) && strlen($stmt) > 1 && !preg_match('/^USE\s+/i', $stmt)) {
        $statements[] = $stmt;
    }
    
    echo "<div class='success'>✓ Schema loaded (" . count($statements) . " statements)</div>";
    
    // Execute statements
    echo "<div class='info'>Step 4: Creating tables...</div>";
    $created = [];
    $errors = [];
    
    foreach ($statements as $index => $statement) {
        $statement = trim($statement);
        if (empty($statement) || preg_match('/^USE\s+/i', $statement) || preg_match('/^CREATE\s+DATABASE/i', $statement)) {
            continue;
        }
        
        if ($conn->query($statement)) {
            if (preg_match('/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i', $statement, $matches)) {
                $table_name = $matches[1];
                $created[] = $table_name;
                echo "<div class='success'>✓ Created: $table_name</div>";
            } else if (preg_match('/INSERT\s+INTO/i', $statement)) {
                echo "<div class='success'>✓ Inserted default user</div>";
            }
        } else {
            $error_msg = $conn->error;
            if (!empty($error_msg) && $error_msg != 'Table already exists') {
                $errors[] = $error_msg;
                echo "<div class='error'>✗ Error: $error_msg</div>";
            }
        }
    }
    
    // Re-enable foreign key checks
    $conn->query("SET FOREIGN_KEY_CHECKS = 1");
    
    // Verify
    echo "<div class='info'>Step 5: Verifying tables...</div>";
    $result = $conn->query("SHOW TABLES");
    $final_tables = [];
    if ($result) {
        while ($row = $result->fetch_array()) {
            $final_tables[] = $row[0];
        }
    }
    
    echo "<div class='success'>✓ Found " . count($final_tables) . " tables: " . implode(', ', $final_tables) . "</div>";
    
    if (count($final_tables) >= 11 && count($errors) == 0) {
        echo "<div class='success'><strong>✓ SUCCESS! All tables recreated successfully!</strong></div>";
        echo "<div class='info'>Default admin user:<br>Email: sidhykqatar@gmail.com<br>Password: tz669933</div>";
    } else {
        echo "<div class='warning'><strong>⚠ " . count($final_tables) . " tables created. " . count($errors) . " error(s) occurred.</strong></div>";
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "<div class='error'><strong>Fatal Error:</strong> " . htmlspecialchars($e->getMessage()) . "</div>";
}

echo "</div></body></html>";
?>

