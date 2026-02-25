<?php
/**
 * Rebuild All Tables - Force Recreate
 * This script will DROP all existing tables (even if corrupted) and recreate them
 * WARNING: This will DELETE ALL DATA in the database!
 */

require_once __DIR__ . '/../config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Rebuild All Tables</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .success { color: #28a745; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin: 10px 0; }
        .error { color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0; }
        .info { color: #004085; padding: 10px; background: #cce5ff; border: 1px solid #b3d7ff; border-radius: 4px; margin: 10px 0; }
        .warning { color: #856404; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
        th { background: #f0f0f0; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
    </style>
</head>
<body>
<div class='container'>
<h1>Rebuild All Database Tables</h1>
<div class='warning'><strong>⚠ WARNING:</strong> This will DELETE ALL DATA in all tables and recreate them from scratch!</div>";

try {
    // Connect to MySQL server (without selecting database first)
    echo "<div class='info'>Step 1: Connecting to MySQL server...</div>";
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    echo "<div class='success'>✓ Connected to MySQL server</div>";
    
    // Create database if it doesn't exist
    echo "<div class='info'>Step 2: Creating/verifying database...</div>";
    $conn->query("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci");
    $conn->select_db(DB_NAME);
    echo "<div class='success'>✓ Database '" . DB_NAME . "' ready</div>";
    
    // Disable foreign key checks
    echo "<div class='info'>Step 3: Disabling foreign key checks...</div>";
    $conn->query("SET FOREIGN_KEY_CHECKS = 0");
    echo "<div class='success'>✓ Foreign key checks disabled</div>";
    
    // Get list of all existing tables
    echo "<div class='info'>Step 4: Finding existing tables...</div>";
    $result = $conn->query("SHOW TABLES");
    $existing_tables = [];
    if ($result) {
        while ($row = $result->fetch_array()) {
            $existing_tables[] = $row[0];
        }
    }
    
    if (count($existing_tables) > 0) {
        echo "<div class='info'>Found " . count($existing_tables) . " existing tables: " . implode(', ', $existing_tables) . "</div>";
        
        // Drop all tables (in reverse dependency order to avoid foreign key issues)
        echo "<div class='info'>Step 5: Discarding tablespaces and dropping tables...</div>";
        $drop_order = [
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
        
        $dropped = [];
        $drop_errors = [];
        
        // First, try to discard tablespaces for all potential tables (even if they don't show in SHOW TABLES)
        echo "<div class='info'>Discarding orphaned tablespaces...</div>";
        foreach ($drop_order as $table) {
            // Try to discard tablespace (this will work even if table doesn't exist in SHOW TABLES)
            $conn->query("ALTER TABLE `$table` DISCARD TABLESPACE");
            // Ignore errors - table might not exist or might not have tablespace
        }
        
        foreach ($drop_order as $table) {
            if (in_array($table, $existing_tables)) {
                // Method 1: Try to discard tablespace first (for InnoDB tables)
                $conn->query("ALTER TABLE `$table` DISCARD TABLESPACE");
                
                // Method 2: Standard DROP
                if ($conn->query("DROP TABLE IF EXISTS `$table`")) {
                    $dropped[] = $table;
                    echo "<div class='success'>✓ Dropped table: $table</div>";
                } else {
                    // Method 3: Try DROP without IF EXISTS
                    if ($conn->query("DROP TABLE `$table`")) {
                        $dropped[] = $table;
                        echo "<div class='success'>✓ Dropped table: $table</div>";
                    } else {
                        $error_msg = $conn->error;
                        // If error is about tablespace, try to create a dummy table first, then drop
                        if (strpos($error_msg, 'tablespace') !== false || strpos($error_msg, 'Tablespace') !== false) {
                            // Try to import and then drop
                            $conn->query("CREATE TABLE IF NOT EXISTS `$table` (id INT) ENGINE=InnoDB");
                            $conn->query("ALTER TABLE `$table` DISCARD TABLESPACE");
                            if ($conn->query("DROP TABLE `$table`")) {
                                $dropped[] = $table;
                                echo "<div class='success'>✓ Dropped table (after tablespace fix): $table</div>";
                            } else {
                                $drop_errors[] = "$table: " . $conn->error;
                                echo "<div class='warning'>⚠ Could not drop table: $table - " . $conn->error . "</div>";
                            }
                        } else {
                            $drop_errors[] = "$table: $error_msg";
                            echo "<div class='warning'>⚠ Could not drop table: $table - $error_msg</div>";
                        }
                    }
                }
            } else {
                // Table not in SHOW TABLES, but might have orphaned tablespace
                // Try to create a dummy table, discard tablespace, then drop
                $conn->query("CREATE TABLE IF NOT EXISTS `$table` (id INT) ENGINE=InnoDB");
                $conn->query("ALTER TABLE `$table` DISCARD TABLESPACE");
                $conn->query("DROP TABLE IF EXISTS `$table`");
            }
        }
        
        // Try to drop any remaining tables
        $remaining = array_diff($existing_tables, $dropped);
        if (count($remaining) > 0) {
            echo "<div class='info'>Attempting to drop remaining tables...</div>";
            foreach ($remaining as $table) {
                // Discard tablespace first
                $conn->query("ALTER TABLE `$table` DISCARD TABLESPACE");
                if ($conn->query("DROP TABLE IF EXISTS `$table`")) {
                    $dropped[] = $table;
                    echo "<div class='success'>✓ Dropped table: $table</div>";
                } else {
                    $drop_errors[] = "$table: " . $conn->error;
                    echo "<div class='warning'>⚠ Could not drop: $table</div>";
                }
            }
        }
        
        echo "<div class='info'>Dropped " . count($dropped) . " table(s)</div>";
    } else {
        echo "<div class='info'>No existing tables found</div>";
    }
    
    // Read and execute schema.sql
    echo "<div class='info'>Step 6: Reading schema file...</div>";
    $schema_file = __DIR__ . '/schema.sql';
    if (!file_exists($schema_file)) {
        throw new Exception("Schema file not found: $schema_file");
    }
    
    $sql = file_get_contents($schema_file);
    if (empty($sql)) {
        throw new Exception("Schema file is empty");
    }
    echo "<div class='success'>✓ Schema file loaded</div>";
    
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
            if (!empty($stmt) && strlen($stmt) > 1) {
                $statements[] = $stmt;
            }
            $current = '';
        }
    }
    
    // Add any remaining statement
    $stmt = trim($current);
    if (!empty($stmt) && strlen($stmt) > 1) {
        $statements[] = $stmt;
    }
    
    echo "<div class='info'>Step 7: Executing " . count($statements) . " SQL statements...</div>";
    
    $created = [];
    $errors = [];
    
    foreach ($statements as $index => $statement) {
        $statement = trim($statement);
        if (empty($statement)) {
            continue;
        }
        
        // Skip USE statements (we already selected the database)
        if (preg_match('/^USE\s+/i', $statement)) {
            continue;
        }
        
        // Handle CREATE DATABASE
        if (preg_match('/^CREATE\s+DATABASE/i', $statement)) {
            if ($conn->query($statement)) {
                echo "<div class='success'>✓ Database created/verified</div>";
            }
            continue;
        }
        
        // Execute the statement
        if ($conn->query($statement)) {
            // Try to detect which table was created
            if (preg_match('/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i', $statement, $matches)) {
                $table_name = $matches[1];
                $created[] = $table_name;
                echo "<div class='success'>✓ Created table: $table_name</div>";
            } else if (preg_match('/INSERT\s+INTO/i', $statement)) {
                echo "<div class='success'>✓ Inserted default user</div>";
            }
        } else {
            $error_msg = $conn->error;
            if (!empty($error_msg) && $error_msg != 'Table already exists') {
                $errors[] = "Statement " . ($index + 1) . ": $error_msg";
                $preview = substr($statement, 0, 100);
                echo "<div class='error'>✗ Error in statement " . ($index + 1) . ": $error_msg</div>";
                echo "<div class='info'><pre>" . htmlspecialchars($preview) . "...</pre></div>";
            }
        }
    }
    
    // Re-enable foreign key checks
    $conn->query("SET FOREIGN_KEY_CHECKS = 1");
    
    // Verify tables
    echo "<div class='info'>Step 8: Verifying created tables...</div>";
    $result = $conn->query("SHOW TABLES");
    $final_tables = [];
    if ($result) {
        while ($row = $result->fetch_array()) {
            $final_tables[] = $row[0];
        }
    }
    
    echo "<div class='success'>✓ Found " . count($final_tables) . " tables in database</div>";
    
    // Summary
    echo "<div class='info'><h2>Summary</h2>";
    echo "<table>";
    echo "<tr><th>Status</th><th>Count</th><th>Details</th></tr>";
    echo "<tr><td><strong>Tables Created</strong></td><td>" . count($final_tables) . "</td><td>" . implode(', ', $final_tables) . "</td></tr>";
    if (count($dropped) > 0) {
        echo "<tr><td><strong>Tables Dropped</strong></td><td>" . count($dropped) . "</td><td>" . implode(', ', $dropped) . "</td></tr>";
    }
    if (count($errors) > 0) {
        echo "<tr><td><strong>Errors</strong></td><td>" . count($errors) . "</td><td>" . implode('; ', array_slice($errors, 0, 5)) . (count($errors) > 5 ? '...' : '') . "</td></tr>";
    }
    echo "</table></div>";
    
    if (count($final_tables) >= 11 && count($errors) == 0) {
        echo "<div class='success'><strong>✓ SUCCESS! All tables have been recreated successfully!</strong></div>";
        echo "<div class='info'>You can now use your application. The default admin user has been created:<br>";
        echo "Email: sidhykqatar@gmail.com<br>Password: tz669933</div>";
    } else if (count($final_tables) > 0) {
        echo "<div class='warning'><strong>⚠ Partial success. " . count($final_tables) . " table(s) created. Please review errors above.</strong></div>";
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

