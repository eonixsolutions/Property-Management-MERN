<?php
// Generate owner payments for all properties with owner rent
// Run this on VPS: php generate-owner-payments-vps.php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/config.php';
require_once 'includes/recurring_owner_payments.php';

$conn = getDBConnection();

echo "==========================================\n";
echo "Generating Owner Payments\n";
echo "==========================================\n\n";

// Get all properties with owner rent configured
$properties = $conn->query("
    SELECT id, property_name, owner_name, monthly_rent_to_owner, owner_rent_start_date 
    FROM properties 
    WHERE monthly_rent_to_owner IS NOT NULL 
    AND monthly_rent_to_owner > 0
    AND user_id = 1
");

if ($properties && $properties->num_rows > 0) {
    echo "Found " . $properties->num_rows . " properties with owner rent:\n\n";
    
    while ($property = $properties->fetch_assoc()) {
        echo "Processing: " . $property['property_name'] . " (ID: " . $property['id'] . ")\n";
        echo "  Owner: " . ($property['owner_name'] ?? 'N/A') . "\n";
        echo "  Monthly Rent: " . ($property['monthly_rent_to_owner'] ?? 0) . "\n";
        echo "  Start Date: " . ($property['owner_rent_start_date'] ?? 'Not set') . "\n";
        
        // Check if payments already exist
        $existing = $conn->query("
            SELECT COUNT(*) as count 
            FROM owner_payments 
            WHERE property_id = " . $property['id']
        )->fetch_assoc()['count'];
        
        if ($existing > 0) {
            echo "  ⚠ Already has $existing payments. Skipping...\n\n";
            continue;
        }
        
        // Generate payments
        $payments_created = generateRecurringOwnerPayments($property['id'], $conn, $property['owner_rent_start_date']);
        
        if ($payments_created > 0) {
            echo "  ✓ Generated $payments_created payments\n\n";
        } else {
            echo "  ✗ Failed to generate payments\n\n";
        }
    }
} else {
    echo "No properties with owner rent found.\n";
}

closeDBConnection($conn);
echo "==========================================\n";
echo "Done!\n";
echo "==========================================\n";
?>

