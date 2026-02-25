<?php
/**
 * Verify All Features - Check if all features are properly set up
 */

require_once __DIR__ . '/../config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Verify Features</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .success { color: #28a745; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin: 10px 0; }
        .error { color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0; }
        .info { color: #004085; padding: 10px; background: #cce5ff; border: 1px solid #b3d7ff; border-radius: 4px; margin: 10px 0; }
        .warning { color: #856404; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
        th { background: #f0f0f0; }
        .feature-group { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
<div class='container'>
<h1>Feature Verification</h1>";

try {
    $conn = getDBConnection();
    echo "<div class='success'>✓ Connected to database: " . DB_NAME . "</div>";
    
    $all_ok = true;
    $issues = [];
    
    // Check 1: Database Tables
    echo "<div class='feature-group'>";
    echo "<h2>1. Database Tables</h2>";
    $required_tables = ['users', 'properties', 'tenants', 'transactions', 'rent_payments', 'owner_payments', 'tenant_cheques', 'owner_cheques', 'maintenance_requests', 'documents', 'settings'];
    $existing_tables = [];
    $result = $conn->query("SHOW TABLES");
    while ($row = $result->fetch_array()) {
        $existing_tables[] = $row[0];
    }
    
    foreach ($required_tables as $table) {
        if (in_array($table, $existing_tables)) {
            echo "<div class='success'>✓ Table '$table' exists</div>";
        } else {
            echo "<div class='error'>✗ Table '$table' is missing</div>";
            $all_ok = false;
            $issues[] = "Missing table: $table";
        }
    }
    echo "</div>";
    
    // Check 2: Properties Table Columns
    echo "<div class='feature-group'>";
    echo "<h2>2. Properties Table - Unit Features</h2>";
    $unit_columns = ['parent_property_id', 'unit_name', 'is_unit'];
    $owner_columns = ['owner_name', 'owner_contact', 'owner_email', 'owner_phone', 'monthly_rent_to_owner'];
    $other_columns = ['default_rent'];
    
    $result = $conn->query("SHOW COLUMNS FROM properties");
    $existing_columns = [];
    while ($row = $result->fetch_assoc()) {
        $existing_columns[] = $row['Field'];
    }
    
    foreach ($unit_columns as $col) {
        if (in_array($col, $existing_columns)) {
            echo "<div class='success'>✓ Column 'properties.$col' exists (Unit feature)</div>";
        } else {
            echo "<div class='error'>✗ Column 'properties.$col' is missing (Unit feature)</div>";
            $all_ok = false;
            $issues[] = "Missing column: properties.$col";
        }
    }
    
    foreach ($owner_columns as $col) {
        if (in_array($col, $existing_columns)) {
            echo "<div class='success'>✓ Column 'properties.$col' exists (Owner feature)</div>";
        } else {
            echo "<div class='error'>✗ Column 'properties.$col' is missing (Owner feature)</div>";
            $all_ok = false;
            $issues[] = "Missing column: properties.$col";
        }
    }
    
    if (in_array('default_rent', $existing_columns)) {
        echo "<div class='success'>✓ Column 'properties.default_rent' exists</div>";
    } else {
        echo "<div class='warning'>⚠ Column 'properties.default_rent' is missing (optional feature)</div>";
    }
    echo "</div>";
    
    // Check 3: Tenants Table - Qatar ID
    echo "<div class='feature-group'>";
    echo "<h2>3. Tenants Table - Qatar ID Feature</h2>";
    $result = $conn->query("SHOW COLUMNS FROM tenants");
    $tenant_columns = [];
    while ($row = $result->fetch_assoc()) {
        $tenant_columns[] = $row['Field'];
    }
    
    if (in_array('qatar_id', $tenant_columns)) {
        echo "<div class='success'>✓ Column 'tenants.qatar_id' exists</div>";
    } else {
        echo "<div class='warning'>⚠ Column 'tenants.qatar_id' is missing</div>";
    }
    echo "</div>";
    
    // Check 4: File Existence
    echo "<div class='feature-group'>";
    echo "<h2>4. Feature Files</h2>";
    $required_files = [
        'properties/add.php' => 'Property/Unit Creation',
        'properties/edit.php' => 'Property/Unit Editing',
        'properties/index.php' => 'Property/Unit Listing',
        'tenants/add.php' => 'Tenant Creation',
        'tenants/edit.php' => 'Tenant Editing',
        'auto_contract.php' => 'Lease Agreement Generator',
        'cheques/index.php' => 'Cheque Register',
        'owners/index.php' => 'Owner Payments',
    ];
    
    foreach ($required_files as $file => $feature) {
        $full_path = __DIR__ . '/../' . $file;
        if (file_exists($full_path)) {
            echo "<div class='success'>✓ File '$file' exists ($feature)</div>";
        } else {
            echo "<div class='error'>✗ File '$file' is missing ($feature)</div>";
            $all_ok = false;
            $issues[] = "Missing file: $file";
        }
    }
    echo "</div>";
    
    // Check 5: Admin User
    echo "<div class='feature-group'>";
    echo "<h2>5. Admin User</h2>";
    $result = $conn->query("SELECT id, email, first_name, last_name, role FROM users WHERE email = 'sidhykqatar@gmail.com'");
    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();
        echo "<div class='success'>✓ Admin user exists</div>";
        echo "<div class='info'>Email: " . htmlspecialchars($user['email']) . "<br>";
        echo "Name: " . htmlspecialchars($user['first_name'] . ' ' . $user['last_name']) . "<br>";
        echo "Role: " . htmlspecialchars($user['role']) . "</div>";
    } else {
        echo "<div class='error'>✗ Admin user not found</div>";
        echo "<div class='info'>Run <a href='fix_admin_user.php'>fix_admin_user.php</a> to create it</div>";
        $all_ok = false;
        $issues[] = "Missing admin user";
    }
    echo "</div>";
    
    // Summary
    echo "<div class='feature-group'>";
    echo "<h2>Summary</h2>";
    if ($all_ok) {
        echo "<div class='success'><strong>✓ All features are properly set up!</strong></div>";
        echo "<div class='info'>You can now use all features including:<br>";
        echo "• Unit creation under properties<br>";
        echo "• Owner management<br>";
        echo "• Qatar ID for tenants<br>";
        echo "• Lease agreement generation<br>";
        echo "• Cheque register<br>";
        echo "• And all other features</div>";
    } else {
        echo "<div class='error'><strong>✗ Some issues found:</strong></div>";
        echo "<ul>";
        foreach ($issues as $issue) {
            echo "<li>$issue</li>";
        }
        echo "</ul>";
        echo "<div class='info'>Please fix the issues above. You may need to:<br>";
        echo "• Run <a href='create_new_database.php?db_name=" . DB_NAME . "'>create_new_database.php</a> to recreate the database<br>";
        echo "• Run <a href='fix_admin_user.php'>fix_admin_user.php</a> to create admin user<br>";
        echo "• Check file permissions</div>";
    }
    echo "</div>";
    
    $conn->close();
    
} catch (Exception $e) {
    echo "<div class='error'><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</div>";
}

echo "</div></body></html>";
?>

