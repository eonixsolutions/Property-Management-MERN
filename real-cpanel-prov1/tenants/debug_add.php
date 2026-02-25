<?php
/**
 * Debug Tenant Addition
 * This will show exactly what's happening when trying to add a tenant
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

echo "<h2>Debug: Tenant Addition</h2>";
echo "<hr>";

// Check 1: Database
echo "<h3>1. Database Check</h3>";
echo "Database: " . DB_NAME . "<br>";
echo "Connected: " . ($conn ? "Yes" : "No") . "<br>";
if ($conn) {
    echo "Connection error: " . ($conn->connect_error ? $conn->connect_error : "None") . "<br>";
}

// Check 2: Tenants table
echo "<h3>2. Tenants Table</h3>";
$result = $conn->query("SHOW TABLES LIKE 'tenants'");
if ($result && $result->num_rows > 0) {
    echo "✓ Table exists<br>";
    
    // Show structure
    $result = $conn->query("DESCRIBE tenants");
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr>";
    while ($row = $result->fetch_assoc()) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($row['Field']) . "</td>";
        echo "<td>" . htmlspecialchars($row['Type']) . "</td>";
        echo "<td>" . htmlspecialchars($row['Null']) . "</td>";
        echo "<td>" . htmlspecialchars($row['Key']) . "</td>";
        echo "<td>" . htmlspecialchars($row['Default'] ?? 'NULL') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "✗ Table does NOT exist!<br>";
    echo "Run: <a href='../database/create_new_database.php?db_name=" . DB_NAME . "'>Create Database</a><br>";
    exit;
}

// Check 3: Properties
echo "<h3>3. Available Properties</h3>";
$result = $conn->query("SELECT id, property_name FROM properties WHERE user_id = $user_id");
if ($result && $result->num_rows > 0) {
    echo "✓ Found " . $result->num_rows . " properties<br>";
    echo "<ul>";
    while ($row = $result->fetch_assoc()) {
        echo "<li>" . htmlspecialchars($row['property_name']) . " (ID: {$row['id']})</li>";
    }
    echo "</ul>";
} else {
    echo "✗ No properties found!<br>";
    echo "Add a property first: <a href='../properties/add.php'>Add Property</a><br>";
}

// Check 4: Test INSERT with sample data
echo "<h3>4. Test INSERT Statement</h3>";
if ($result && $result->num_rows > 0) {
    $test_property = $conn->query("SELECT id FROM properties WHERE user_id = $user_id LIMIT 1")->fetch_assoc();
    $test_property_id = $test_property['id'];
    
    // Check qatar_id column
    $check_qatar_id = $conn->query("SHOW COLUMNS FROM tenants LIKE 'qatar_id'");
    $has_qatar_id = $check_qatar_id->num_rows > 0;
    
    echo "Has qatar_id column: " . ($has_qatar_id ? "Yes" : "No") . "<br>";
    
    if ($has_qatar_id) {
        $sql = "INSERT INTO tenants (property_id, first_name, last_name, email, phone, alternate_phone, qatar_id, move_in_date, lease_start, lease_end, monthly_rent, security_deposit, status, emergency_contact_name, emergency_contact_phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        echo "SQL (with qatar_id): <code>" . htmlspecialchars($sql) . "</code><br>";
        echo "Parameters: 16<br>";
        echo "Type string: issssssssssssddsss<br>";
    } else {
        $sql = "INSERT INTO tenants (property_id, first_name, last_name, email, phone, alternate_phone, move_in_date, lease_start, lease_end, monthly_rent, security_deposit, status, emergency_contact_name, emergency_contact_phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        echo "SQL (without qatar_id): <code>" . htmlspecialchars($sql) . "</code><br>";
        echo "Parameters: 15<br>";
        echo "Type string: issssssssddssss<br>";
    }
    
    // Try to prepare
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        echo "✓ Statement prepared successfully<br>";
        
        // Test bind with sample data
        $test_data = [
            'property_id' => $test_property_id,
            'first_name' => 'Test',
            'last_name' => 'Tenant',
            'email' => 'test@test.com',
            'phone' => '1234567890',
            'alternate_phone' => '',
            'qatar_id' => '',
            'move_in_date' => null,
            'lease_start' => null,
            'lease_end' => null,
            'monthly_rent' => 1000.00,
            'security_deposit' => 500.00,
            'status' => 'Active',
            'emergency_contact_name' => '',
            'emergency_contact_phone' => '',
            'notes' => 'Test tenant'
        ];
        
        if ($has_qatar_id) {
            $bind_result = $stmt->bind_param("issssssssssssddsss",
                $test_data['property_id'],
                $test_data['first_name'],
                $test_data['last_name'],
                $test_data['email'],
                $test_data['phone'],
                $test_data['alternate_phone'],
                $test_data['qatar_id'],
                $test_data['move_in_date'],
                $test_data['lease_start'],
                $test_data['lease_end'],
                $test_data['monthly_rent'],
                $test_data['security_deposit'],
                $test_data['status'],
                $test_data['emergency_contact_name'],
                $test_data['emergency_contact_phone'],
                $test_data['notes']
            );
        } else {
            $bind_result = $stmt->bind_param("issssssssddssss",
                $test_data['property_id'],
                $test_data['first_name'],
                $test_data['last_name'],
                $test_data['email'],
                $test_data['phone'],
                $test_data['alternate_phone'],
                $test_data['move_in_date'],
                $test_data['lease_start'],
                $test_data['lease_end'],
                $test_data['monthly_rent'],
                $test_data['security_deposit'],
                $test_data['status'],
                $test_data['emergency_contact_name'],
                $test_data['emergency_contact_phone'],
                $test_data['notes']
            );
        }
        
        if ($bind_result) {
            echo "✓ Parameters bound successfully<br>";
            
            // Try to execute (but don't actually insert - just test)
            echo "⚠ Not executing (test only)<br>";
            // Uncomment next line to actually test insert:
            // if ($stmt->execute()) { echo "✓ Execute successful!<br>"; } else { echo "✗ Execute failed: " . $stmt->error . "<br>"; }
        } else {
            echo "✗ bind_param failed: " . $stmt->error . "<br>";
        }
        $stmt->close();
    } else {
        echo "✗ Prepare failed: " . $conn->error . "<br>";
    }
}

// Check 5: Form submission test
echo "<h3>5. Test Form Submission</h3>";
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    echo "<strong>POST data received:</strong><br>";
    echo "<pre>";
    print_r($_POST);
    echo "</pre>";
    
    // Try the actual insert
    $property_id = intval($_POST['property_id']);
    $first_name = sanitizeInput($_POST['first_name']);
    $last_name = sanitizeInput($_POST['last_name']);
    $email = sanitizeInput($_POST['email']);
    $phone = sanitizeInput($_POST['phone']);
    $alternate_phone = sanitizeInput($_POST['alternate_phone']);
    $qatar_id = isset($_POST['qatar_id']) ? sanitizeInput($_POST['qatar_id']) : '';
    $move_in_date = !empty($_POST['move_in_date']) ? $_POST['move_in_date'] : null;
    $lease_start = !empty($_POST['lease_start']) ? $_POST['lease_start'] : null;
    $lease_end = !empty($_POST['lease_end']) ? $_POST['lease_end'] : null;
    $monthly_rent = floatval($_POST['monthly_rent']);
    $security_deposit = !empty($_POST['security_deposit']) ? floatval($_POST['security_deposit']) : null;
    $status = $_POST['status'];
    $emergency_contact_name = sanitizeInput($_POST['emergency_contact_name']);
    $emergency_contact_phone = sanitizeInput($_POST['emergency_contact_phone']);
    $notes = sanitizeInput($_POST['notes']);
    
    echo "<strong>Processed values:</strong><br>";
    echo "Property ID: $property_id<br>";
    echo "First Name: $first_name<br>";
    echo "Last Name: $last_name<br>";
    echo "Monthly Rent: $monthly_rent<br>";
    echo "Status: $status<br>";
    
    // Check qatar_id
    $check_qatar_id = $conn->query("SHOW COLUMNS FROM tenants LIKE 'qatar_id'");
    $has_qatar_id = $check_qatar_id->num_rows > 0;
    
    if ($has_qatar_id) {
        $stmt = $conn->prepare("INSERT INTO tenants (property_id, first_name, last_name, email, phone, alternate_phone, qatar_id, move_in_date, lease_start, lease_end, monthly_rent, security_deposit, status, emergency_contact_name, emergency_contact_phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if ($stmt) {
            $bind_result = $stmt->bind_param("issssssssssssddsss", $property_id, $first_name, $last_name, $email, $phone, $alternate_phone, $qatar_id, $move_in_date, $lease_start, $lease_end, $monthly_rent, $security_deposit, $status, $emergency_contact_name, $emergency_contact_phone, $notes);
            if ($bind_result) {
                if ($stmt->execute()) {
                    echo "<strong style='color: green;'>✓ SUCCESS! Tenant added with ID: " . $conn->insert_id . "</strong><br>";
                } else {
                    echo "<strong style='color: red;'>✗ Execute failed: " . $stmt->error . "</strong><br>";
                }
            } else {
                echo "<strong style='color: red;'>✗ bind_param failed: " . $stmt->error . "</strong><br>";
            }
            $stmt->close();
        } else {
            echo "<strong style='color: red;'>✗ Prepare failed: " . $conn->error . "</strong><br>";
        }
    } else {
        $stmt = $conn->prepare("INSERT INTO tenants (property_id, first_name, last_name, email, phone, alternate_phone, move_in_date, lease_start, lease_end, monthly_rent, security_deposit, status, emergency_contact_name, emergency_contact_phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if ($stmt) {
            $bind_result = $stmt->bind_param("issssssssddssss", $property_id, $first_name, $last_name, $email, $phone, $alternate_phone, $move_in_date, $lease_start, $lease_end, $monthly_rent, $security_deposit, $status, $emergency_contact_name, $emergency_contact_phone, $notes);
            if ($bind_result) {
                if ($stmt->execute()) {
                    echo "<strong style='color: green;'>✓ SUCCESS! Tenant added with ID: " . $conn->insert_id . "</strong><br>";
                } else {
                    echo "<strong style='color: red;'>✗ Execute failed: " . $stmt->error . "</strong><br>";
                }
            } else {
                echo "<strong style='color: red;'>✗ bind_param failed: " . $stmt->error . "</strong><br>";
            }
            $stmt->close();
        } else {
            echo "<strong style='color: red;'>✗ Prepare failed: " . $conn->error . "</strong><br>";
        }
    }
} else {
    echo "No POST data. Submit the form from <a href='add.php'>Add Tenant</a> to test.<br>";
}

echo "<hr>";
echo "<a href='add.php'>Go to Add Tenant Form</a><br>";

closeAllDBConnections();
?>

