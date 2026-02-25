<?php
/**
 * Diagnose Add User Issue on VPS
 * Access via: https://realestate.fmcqatar.com/diagnose-add-user-vps.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

echo "<h1>Diagnose Add User Issue</h1>";
echo "<pre>";

echo "==========================================\n";
echo "1. User Information\n";
echo "==========================================\n";
echo "User ID: $user_id\n";
echo "Session User ID: " . ($_SESSION['user_id'] ?? 'Not set') . "\n";
echo "Session User Role: " . ($_SESSION['user_role'] ?? 'Not set') . "\n";
echo "\n";

echo "==========================================\n";
echo "2. Database User Info\n";
echo "==========================================\n";
$current_user = $conn->query("SELECT id, email, first_name, last_name, role, status FROM users WHERE id = $user_id")->fetch_assoc();
if ($current_user) {
    echo "Email: " . $current_user['email'] . "\n";
    echo "Name: " . $current_user['first_name'] . " " . $current_user['last_name'] . "\n";
    echo "Role: " . ($current_user['role'] ?? 'NULL') . "\n";
    echo "Status: " . ($current_user['status'] ?? 'NULL') . "\n";
    
    $is_admin = in_array($current_user['role'] ?? 'User', ['Super Admin', 'Admin', 'Manager']);
    echo "Is Admin: " . ($is_admin ? 'YES' : 'NO') . "\n";
} else {
    echo "ERROR: User not found!\n";
}
echo "\n";

echo "==========================================\n";
echo "3. Database Columns Check\n";
echo "==========================================\n";
$columns = $conn->query("SHOW COLUMNS FROM users");
$column_names = [];
while ($col = $columns->fetch_assoc()) {
    $column_names[] = $col['Field'];
    echo "  - " . $col['Field'] . " (" . $col['Type'] . ")\n";
}

$has_role = in_array('role', $column_names);
$has_status = in_array('status', $column_names);
$has_phone = in_array('phone', $column_names);

echo "\n";
echo "Role column exists: " . ($has_role ? 'YES' : 'NO') . "\n";
echo "Status column exists: " . ($has_status ? 'YES' : 'NO') . "\n";
echo "Phone column exists: " . ($has_phone ? 'YES' : 'NO') . "\n";
echo "\n";

echo "==========================================\n";
echo "4. Admin Functions Check\n";
echo "==========================================\n";
if (function_exists('isAdmin')) {
    echo "isAdmin() function: EXISTS\n";
    echo "isAdmin() returns: " . (isAdmin() ? 'TRUE' : 'FALSE') . "\n";
} else {
    echo "isAdmin() function: NOT FOUND\n";
}

if (function_exists('getCurrentUserRole')) {
    echo "getCurrentUserRole() function: EXISTS\n";
    echo "getCurrentUserRole() returns: " . (getCurrentUserRole() ?? 'NULL') . "\n";
} else {
    echo "getCurrentUserRole() function: NOT FOUND\n";
}
echo "\n";

echo "==========================================\n";
echo "5. Test INSERT Query\n";
echo "==========================================\n";
// Test if we can prepare the INSERT statement
$test_email = 'test_' . time() . '@example.com';
$test_password = password_hash('test123', PASSWORD_DEFAULT);
$test_first = 'Test';
$test_last = 'User';
$test_phone = '1234567890';
$test_role = 'User';
$test_status = 'Active';

try {
    $stmt = $conn->prepare("INSERT INTO users (email, password, first_name, last_name, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
    if ($stmt) {
        echo "✓ INSERT statement prepared successfully\n";
        $stmt->bind_param("sssssss", $test_email, $test_password, $test_first, $test_last, $test_phone, $test_role, $test_status);
        
        if ($stmt->execute()) {
            $test_id = $conn->insert_id;
            echo "✓ Test INSERT executed successfully (ID: $test_id)\n";
            // Delete test user
            $conn->query("DELETE FROM users WHERE id = $test_id");
            echo "✓ Test user deleted\n";
        } else {
            echo "✗ INSERT execution failed: " . $stmt->error . "\n";
        }
        $stmt->close();
    } else {
        echo "✗ Failed to prepare INSERT: " . $conn->error . "\n";
    }
} catch (Exception $e) {
    echo "✗ Exception: " . $e->getMessage() . "\n";
}
echo "\n";

echo "==========================================\n";
echo "6. File Checks\n";
echo "==========================================\n";
$files_to_check = [
    'config/config.php',
    'auth/login.php',
    'users/add.php'
];

foreach ($files_to_check as $file) {
    $full_path = __DIR__ . '/' . $file;
    if (file_exists($full_path)) {
        echo "✓ $file exists\n";
        $size = filesize($full_path);
        echo "  Size: " . number_format($size) . " bytes\n";
        $modified = date('Y-m-d H:i:s', filemtime($full_path));
        echo "  Modified: $modified\n";
    } else {
        echo "✗ $file NOT FOUND\n";
    }
}
echo "\n";

echo "==========================================\n";
echo "7. Recommendations\n";
echo "==========================================\n";
if (!$has_role) {
    echo "⚠ MISSING: role column - Run database migration\n";
}
if (!$has_status) {
    echo "⚠ MISSING: status column - Run database migration\n";
}
if (!$has_phone) {
    echo "⚠ MISSING: phone column - Run database migration\n";
}
if (!function_exists('isAdmin')) {
    echo "⚠ MISSING: isAdmin() function - Update config/config.php\n";
}
if (empty($current_user['role'])) {
    echo "⚠ WARNING: Your user role is not set - Update your user in database\n";
}
if (!$is_admin) {
    echo "⚠ WARNING: You are not an admin - Cannot add users\n";
}

echo "\n";
echo "==========================================\n";
echo "Done!\n";
echo "==========================================\n";

closeDBConnection($conn);
echo "</pre>";
?>


