<?php
/**
 * Create New Database - Without Dropping Existing
 * This script creates a NEW database with a different name
 */

require_once __DIR__ . '/../config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Allow custom database name via GET parameter, or use default with timestamp
$new_db_name = isset($_GET['db_name']) ? $_GET['db_name'] : DB_NAME . '_new_' . date('Ymd_His');

echo "<!DOCTYPE html>
<html>
<head>
    <title>Create New Database</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .success { color: #28a745; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin: 10px 0; }
        .error { color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0; }
        .info { color: #004085; padding: 10px; background: #cce5ff; border: 1px solid #b3d7ff; border-radius: 4px; margin: 10px 0; }
        .warning { color: #856404; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin: 10px 0; }
        input[type='text'] { padding: 8px; width: 300px; margin: 10px 0; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
    </style>
</head>
<body>
<div class='container'>
<h1>Create New Database</h1>";

// Show form if no database name provided or if user wants to customize
if (!isset($_GET['db_name']) || isset($_GET['change'])) {
    echo "<div class='info'>
        <form method='GET' action=''>
            <label><strong>New Database Name:</strong></label><br>
            <input type='text' name='db_name' value='$new_db_name' placeholder='Enter database name' required><br>
            <button type='submit'>Create New Database</button>
        </form>
        <p><small>Leave empty to use default: <strong>$new_db_name</strong></small></p>
    </div>";
    
    if (isset($_GET['change'])) {
        echo "</div></body></html>";
        exit;
    }
}

try {
    // Step 1: Connect to MySQL (without database)
    echo "<div class='info'><strong>Step 1:</strong> Connecting to MySQL server...</div>";
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    echo "<div class='success'>✓ Connected to MySQL server</div>";
    
    // Step 2: Check if database already exists
    echo "<div class='info'><strong>Step 2:</strong> Checking if database '$new_db_name' exists...</div>";
    $result = $conn->query("SHOW DATABASES LIKE '$new_db_name'");
    if ($result && $result->num_rows > 0) {
        echo "<div class='warning'>⚠ Database '$new_db_name' already exists. Creating with timestamp...</div>";
        $new_db_name = $new_db_name . '_' . time();
    }
    
    // Step 3: Create new database
    echo "<div class='info'><strong>Step 3:</strong> Creating new database '$new_db_name'...</div>";
    $create_db_sql = "CREATE DATABASE `$new_db_name` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci";
    if ($conn->query($create_db_sql)) {
        echo "<div class='success'>✓ Database '$new_db_name' created successfully</div>";
    } else {
        throw new Exception("Failed to create database: " . $conn->error);
    }
    
    // Step 4: Select the new database
    $conn->select_db($new_db_name);
    echo "<div class='success'>✓ Database selected</div>";
    
    // Step 5: Read schema file
    echo "<div class='info'><strong>Step 4:</strong> Reading schema file...</div>";
    $schema_file = __DIR__ . '/schema.sql';
    if (!file_exists($schema_file)) {
        throw new Exception("Schema file not found: $schema_file");
    }
    
    $sql = file_get_contents($schema_file);
    if (empty($sql)) {
        throw new Exception("Schema file is empty");
    }
    echo "<div class='success'>✓ Schema file loaded (" . number_format(strlen($sql)) . " bytes)</div>";
    
    // Step 6: Execute schema
    echo "<div class='info'><strong>Step 5:</strong> Executing schema...</div>";
    
    // Disable foreign key checks
    $conn->query("SET FOREIGN_KEY_CHECKS = 0");
    
    // Remove comments and clean up
    $sql = preg_replace('/--.*$/m', '', $sql);
    $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);
    
    // Remove CREATE DATABASE and USE statements (we already handled those)
    $sql = preg_replace('/CREATE\s+DATABASE[^;]+;/i', '', $sql);
    $sql = preg_replace('/USE\s+[^;]+;/i', '', $sql);
    
    // Split into individual statements
    $statements = [];
    $current = '';
    $in_string = false;
    $string_char = '';
    
    for ($i = 0; $i < strlen($sql); $i++) {
        $char = $sql[$i];
        $next_char = ($i < strlen($sql) - 1) ? $sql[$i + 1] : '';
        
        // Handle string literals
        if (($char == '"' || $char == "'" || $char == '`') && ($i == 0 || $sql[$i-1] != '\\')) {
            if (!$in_string) {
                $in_string = true;
                $string_char = $char;
            } else if ($char == $string_char) {
                $in_string = false;
            }
        }
        
        // Handle semicolons (statement terminators)
        if (!$in_string && $char == ';') {
            $stmt = trim($current);
            if (!empty($stmt) && strlen($stmt) > 1) {
                $statements[] = $stmt;
            }
            $current = '';
        } else {
            $current .= $char;
        }
    }
    
    // Add any remaining statement
    $stmt = trim($current);
    if (!empty($stmt) && strlen($stmt) > 1) {
        $statements[] = $stmt;
    }
    
    echo "<div class='info'>Found " . count($statements) . " SQL statements to execute</div>";
    
    $created_tables = [];
    $errors = [];
    $success_count = 0;
    
    foreach ($statements as $index => $statement) {
        $statement = trim($statement);
        if (empty($statement)) {
            continue;
        }
        
        // Skip empty or comment-only statements
        if (strlen($statement) < 10) {
            continue;
        }
        
        // Execute the statement
        if ($conn->query($statement)) {
            $success_count++;
            
            // Detect table creation
            if (preg_match('/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i', $statement, $matches)) {
                $table_name = $matches[1];
                $created_tables[] = $table_name;
                echo "<div class='success'>✓ Created table: <strong>$table_name</strong></div>";
            } else if (preg_match('/INSERT\s+INTO\s+users/i', $statement)) {
                echo "<div class='success'>✓ Inserted default admin user</div>";
            }
        } else {
            $error_msg = $conn->error;
            // Ignore "Table already exists" errors
            if (!empty($error_msg) && strpos($error_msg, 'already exists') === false) {
                $errors[] = "Statement " . ($index + 1) . ": $error_msg";
                $preview = substr($statement, 0, 80);
                echo "<div class='error'>✗ Error in statement " . ($index + 1) . ": $error_msg</div>";
                echo "<div class='info'><pre>" . htmlspecialchars($preview) . "...</pre></div>";
            }
        }
    }
    
    // Re-enable foreign key checks
    $conn->query("SET FOREIGN_KEY_CHECKS = 1");
    
    // Step 7: Verify
    echo "<div class='info'><strong>Step 6:</strong> Verifying tables...</div>";
    $result = $conn->query("SHOW TABLES");
    $final_tables = [];
    if ($result) {
        while ($row = $result->fetch_array()) {
            $final_tables[] = $row[0];
        }
    }
    
    echo "<div class='success'>✓ Found " . count($final_tables) . " tables in database</div>";
    
    if (count($final_tables) > 0) {
        echo "<div class='info'><strong>Tables created:</strong><br>";
        foreach ($final_tables as $table) {
            echo "• $table<br>";
        }
        echo "</div>";
    }
    
    // Summary
    echo "<div class='info'><h2>Summary</h2>";
    echo "<table border='1' cellpadding='8' cellspacing='0' style='width:100%; border-collapse:collapse;'>";
    echo "<tr style='background:#f0f0f0;'><th>Item</th><th>Details</th></tr>";
    echo "<tr><td><strong>New Database Name</strong></td><td><strong>$new_db_name</strong></td></tr>";
    echo "<tr><td><strong>Tables Created</strong></td><td>" . count($final_tables) . "</td></tr>";
    echo "<tr><td><strong>Successful Statements</strong></td><td>$success_count</td></tr>";
    echo "<tr><td><strong>Errors</strong></td><td>" . count($errors) . "</td></tr>";
    echo "</table></div>";
    
    if (count($final_tables) >= 11 && count($errors) == 0) {
        echo "<div class='success'><strong>✓ SUCCESS! New database created successfully!</strong></div>";
        echo "<div class='info'><strong>Default Admin User:</strong><br>";
        echo "Email: <strong>sidhykqatar@gmail.com</strong><br>";
        echo "Password: <strong>tz669933</strong></div>";
        echo "<div class='warning'><strong>⚠ Important:</strong> To use this new database, update <code>config/database.php</code> and change:<br>";
        echo "<code>define('DB_NAME', '$new_db_name');</code></div>";
    } else if (count($final_tables) > 0) {
        echo "<div class='warning'><strong>⚠ Partial success. " . count($final_tables) . " table(s) created. " . count($errors) . " error(s) occurred.</strong></div>";
        if (count($errors) > 0) {
            echo "<div class='error'><strong>Errors:</strong><br><pre>" . implode("\n", array_slice($errors, 0, 10)) . "</pre></div>";
        }
    } else {
        echo "<div class='error'><strong>✗ FAILED! No tables were created. Please check the errors above.</strong></div>";
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "<div class='error'><strong>Fatal Error:</strong> " . htmlspecialchars($e->getMessage()) . "</div>";
    if (isset($conn)) {
        echo "<div class='error'>MySQL Error: " . htmlspecialchars($conn->error) . "</div>";
    }
}

echo "</div></body></html>";
?>

