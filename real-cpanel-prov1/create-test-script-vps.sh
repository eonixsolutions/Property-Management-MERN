#!/bin/bash
# Run this on VPS to create test script

cat > /var/www/html/realestate/properties/test-add-property.php << 'EOF'
<?php
// Test script to debug add property
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

echo "<h1>Add Property Test</h1>";
echo "<p>User ID: $user_id</p>";

// Test database connection
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}
echo "<p>✓ Database connected</p>";

// Test if we can query properties table
$result = $conn->query("SELECT COUNT(*) as count FROM properties");
if ($result) {
    $row = $result->fetch_assoc();
    echo "<p>✓ Properties table accessible. Current count: " . $row['count'] . "</p>";
} else {
    echo "<p>✗ Error querying properties: " . $conn->error . "</p>";
}

// Check which columns exist
echo "<h2>Checking Columns:</h2>";
$columns_to_check = ['owner_rent_start_date', 'contact_number', 'default_rent', 'owner_name', 'parent_property_id', 'is_unit'];
foreach ($columns_to_check as $col) {
    $check = $conn->query("SHOW COLUMNS FROM properties LIKE '$col'");
    $exists = $check->num_rows > 0;
    echo "<p>" . ($exists ? "✓" : "✗") . " Column '$col': " . ($exists ? "EXISTS" : "MISSING") . "</p>";
}

// Test a simple INSERT
echo "<h2>Testing INSERT:</h2>";
$test_name = "Test Property " . time();
$test_address = "Test Address";
$test_city = "Test City";

$stmt = $conn->prepare("INSERT INTO properties (user_id, property_name, address, city, property_type, status) VALUES (?, ?, ?, ?, ?, ?)");
if ($stmt) {
    $property_type = 'House';
    $status = 'Vacant';
    $stmt->bind_param("isssss", $user_id, $test_name, $test_address, $test_city, $property_type, $status);
    
    if ($stmt->execute()) {
        $test_id = $conn->insert_id;
        echo "<p>✓ Test INSERT successful! ID: $test_id</p>";
        
        // Clean up
        $conn->query("DELETE FROM properties WHERE id = $test_id");
        echo "<p>✓ Test record deleted</p>";
    } else {
        echo "<p>✗ INSERT failed: " . $stmt->error . "</p>";
    }
    $stmt->close();
} else {
    echo "<p>✗ Prepare failed: " . $conn->error . "</p>";
}

// Test with all columns
echo "<h2>Testing INSERT with all columns:</h2>";
$check_owner = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner = $check_owner->num_rows > 0;

if ($has_owner) {
    $stmt = $conn->prepare("INSERT INTO properties (user_id, owner_name, monthly_rent_to_owner, owner_rent_start_date, property_name, address, city, property_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if ($stmt) {
        $owner_name = "Test Owner";
        $monthly_rent = 1000.00;
        $start_date = "2025-01-01";
        $test_name2 = "Test Property 2 " . time();
        $stmt->bind_param("isdssssss", $user_id, $owner_name, $monthly_rent, $start_date, $test_name2, $test_address, $test_city, $property_type, $status);
        
        if ($stmt->execute()) {
            $test_id2 = $conn->insert_id;
            echo "<p>✓ INSERT with owner fields successful! ID: $test_id2</p>";
            $conn->query("DELETE FROM properties WHERE id = $test_id2");
        } else {
            echo "<p>✗ INSERT with owner fields failed: " . $stmt->error . "</p>";
        }
        $stmt->close();
    }
}

closeDBConnection($conn);
?>
EOF

chmod 644 /var/www/html/realestate/properties/test-add-property.php
echo "Test script created! Access it at: https://realestate.fmcqatar.com/properties/test-add-property.php"

