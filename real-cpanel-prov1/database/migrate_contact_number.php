<?php
/**
 * Migration: Add contact_number column to properties table
 * This column stores the contact number for units to display on landing page with WhatsApp and Call buttons
 */

require_once '../config/config.php';

$conn = getDBConnection();

echo "Checking if contact_number column exists...\n";

// Check if column exists
$check = $conn->query("SHOW COLUMNS FROM properties LIKE 'contact_number'");

if ($check->num_rows > 0) {
    echo "✓ contact_number column already exists in properties table.\n";
} else {
    echo "Adding contact_number column to properties table...\n";
    
    // Add the column
    $sql = "ALTER TABLE properties ADD COLUMN contact_number VARCHAR(20) DEFAULT NULL AFTER notes";
    
    if ($conn->query($sql)) {
        echo "✓ Successfully added contact_number column to properties table.\n";
        echo "  Column type: VARCHAR(20)\n";
        echo "  Default: NULL\n";
        echo "  Position: After 'notes' column\n";
    } else {
        echo "✗ Error adding contact_number column: " . $conn->error . "\n";
        exit(1);
    }
}

closeDBConnection($conn);
echo "\nMigration completed successfully!\n";
?>

