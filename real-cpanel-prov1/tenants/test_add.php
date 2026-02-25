<?php
/**
 * Test Tenant Addition - Diagnostic Script
 * This will help identify why tenants can't be added
 */

require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

echo "<h2>Tenant Addition Diagnostic</h2>";
echo "<hr>";

// Check 1: Database connection
echo "<h3>1. Database Connection</h3>";
if ($conn) {
    echo "✓ Connected to database: " . DB_NAME . "<br>";
} else {
    echo "✗ Database connection failed<br>";
    exit;
}

// Check 2: Tenants table exists
echo "<h3>2. Tenants Table</h3>";
$result = $conn->query("SHOW TABLES LIKE 'tenants'");
if ($result && $result->num_rows > 0) {
    echo "✓ Tenants table exists<br>";
} else {
    echo "✗ Tenants table does NOT exist!<br>";
    echo "Please run: <a href='../database/create_new_database.php?db_name=" . DB_NAME . "'>Create Database</a><br>";
    exit;
}

// Check 3: Table structure
echo "<h3>3. Table Structure</h3>";
$result = $conn->query("SHOW COLUMNS FROM tenants");
$columns = [];
while ($row = $result->fetch_assoc()) {
    $columns[] = $row['Field'];
}
echo "Columns found: " . implode(', ', $columns) . "<br>";

$required_columns = ['id', 'property_id', 'first_name', 'last_name', 'monthly_rent'];
foreach ($required_columns as $col) {
    if (in_array($col, $columns)) {
        echo "✓ Column '$col' exists<br>";
    } else {
        echo "✗ Column '$col' is MISSING!<br>";
    }
}

// Check 4: Qatar ID column
if (in_array('qatar_id', $columns)) {
    echo "✓ Column 'qatar_id' exists<br>";
} else {
    echo "⚠ Column 'qatar_id' does not exist (optional)<br>";
}

// Check 5: Properties available
echo "<h3>4. Available Properties</h3>";
$result = $conn->query("SELECT COUNT(*) as count FROM properties WHERE user_id = $user_id");
$property_count = $result->fetch_assoc()['count'];
echo "Properties available: $property_count<br>";

if ($property_count == 0) {
    echo "⚠ No properties found! You need to add a property first.<br>";
    echo "<a href='../properties/add.php'>Add Property</a><br>";
} else {
    echo "✓ Properties available<br>";
    $properties = $conn->query("SELECT id, property_name FROM properties WHERE user_id = $user_id LIMIT 5");
    echo "Sample properties:<br>";
    while ($prop = $properties->fetch_assoc()) {
        echo "- " . htmlspecialchars($prop['property_name']) . " (ID: {$prop['id']})<br>";
    }
}

// Check 6: Test INSERT (dry run)
echo "<h3>5. Test INSERT Statement</h3>";
$check_qatar_id = $conn->query("SHOW COLUMNS FROM tenants LIKE 'qatar_id'");
$has_qatar_id = $check_qatar_id->num_rows > 0;

if ($has_qatar_id) {
    echo "Using INSERT with qatar_id column<br>";
    $test_sql = "INSERT INTO tenants (property_id, first_name, last_name, email, phone, alternate_phone, qatar_id, move_in_date, lease_start, lease_end, monthly_rent, security_deposit, status, emergency_contact_name, emergency_contact_phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
} else {
    echo "Using INSERT without qatar_id column<br>";
    $test_sql = "INSERT INTO tenants (property_id, first_name, last_name, email, phone, alternate_phone, move_in_date, lease_start, lease_end, monthly_rent, security_deposit, status, emergency_contact_name, emergency_contact_phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
}

echo "SQL: <code>" . htmlspecialchars($test_sql) . "</code><br>";

// Check 7: Test with sample data
echo "<h3>6. Test with Sample Data</h3>";
if ($property_count > 0) {
    $test_property = $conn->query("SELECT id FROM properties WHERE user_id = $user_id LIMIT 1")->fetch_assoc();
    $test_property_id = $test_property['id'];
    
    // Test prepare
    $stmt = $conn->prepare($test_sql);
    if ($stmt) {
        echo "✓ Statement prepared successfully<br>";
        
        // Test bind_param
        $test_first_name = "Test";
        $test_last_name = "Tenant";
        $test_email = "test@test.com";
        $test_phone = "1234567890";
        $test_alt_phone = "";
        $test_qatar_id = "";
        $test_move_in = null;
        $test_lease_start = null;
        $test_lease_end = null;
        $test_rent = 1000.00;
        $test_deposit = 500.00;
        $test_status = "Active";
        $test_emergency_name = "";
        $test_emergency_phone = "";
        $test_notes = "Test tenant";
        
        if ($has_qatar_id) {
            $bind_result = $stmt->bind_param("issssssssssssddsss", 
                $test_property_id, $test_first_name, $test_last_name, $test_email, 
                $test_phone, $test_alt_phone, $test_qatar_id, $test_move_in, 
                $test_lease_start, $test_lease_end, $test_rent, $test_deposit, 
                $test_status, $test_emergency_name, $test_emergency_phone, $test_notes);
        } else {
            $bind_result = $stmt->bind_param("isssssssssdssss", 
                $test_property_id, $test_first_name, $test_last_name, $test_email, 
                $test_phone, $test_alt_phone, $test_move_in, $test_lease_start, 
                $test_lease_end, $test_rent, $test_deposit, $test_status, 
                $test_emergency_name, $test_emergency_phone, $test_notes);
        }
        
        if ($bind_result) {
            echo "✓ Parameters bound successfully<br>";
            // Don't actually execute - just test
            echo "⚠ Test only - not executing INSERT<br>";
        } else {
            echo "✗ bind_param failed: " . $stmt->error . "<br>";
        }
        $stmt->close();
    } else {
        echo "✗ Prepare failed: " . $conn->error . "<br>";
    }
} else {
    echo "⚠ Cannot test - no properties available<br>";
}

// Check 8: Error reporting
echo "<h3>7. Error Reporting</h3>";
echo "Error reporting: " . (ini_get('display_errors') ? 'ON' : 'OFF') . "<br>";
echo "Error level: " . error_reporting() . "<br>";

echo "<hr>";
echo "<h3>Summary</h3>";
echo "If all checks pass, try adding a tenant again.<br>";
echo "If there are errors, fix them and try again.<br>";
echo "<br>";
echo "<a href='add.php'>Go to Add Tenant Form</a><br>";

closeAllDBConnections();
?>

