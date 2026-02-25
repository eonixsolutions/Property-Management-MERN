<?php
/**
 * Migration Script: Add default_rent column to properties table
 * Run this script once to update your existing database
 */

// Allow running from web browser or CLI
$is_cli = php_sapi_name() === 'cli';

if (!$is_cli) {
    // Check if user is logged in for web access
    session_start();
    if (!isset($_SESSION['user_id'])) {
        die('Access denied. Please login first or run this from command line.');
    }
}

require_once __DIR__ . '/../config/database.php';

echo "Adding default_rent column to properties table...\n\n";

try {
    $conn = getDBConnection();
    
    // Check if column already exists
    $result = $conn->query("SHOW COLUMNS FROM properties LIKE 'default_rent'");
    
    if ($result->num_rows > 0) {
        echo "✓ Column 'default_rent' already exists. No migration needed.\n";
    } else {
        // Add the column
        $sql = "ALTER TABLE properties ADD COLUMN default_rent DECIMAL(10,2) DEFAULT 0.00 AFTER purchase_date";
        
        if ($conn->query($sql)) {
            echo "✓ Successfully added 'default_rent' column to properties table!\n";
        } else {
            echo "✗ Error: " . $conn->error . "\n";
        }
    }
    
    closeDBConnection($conn);
    echo "\nMigration completed!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
