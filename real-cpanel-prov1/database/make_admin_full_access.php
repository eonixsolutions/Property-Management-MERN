<?php
/**
 * Make Admin Full Access
 * Ensures admin users have full access to all features
 */

require_once '../config/config.php';
requireLogin();

// Only allow admins to run this
$conn = getDBConnection();
$user_id = getCurrentUserId();
$current_user = $conn->query("SELECT role FROM users WHERE id = $user_id")->fetch_assoc();
$is_admin = in_array($current_user['role'] ?? 'User', ['Super Admin', 'Admin', 'Manager']);

if (!$is_admin) {
    die('Access denied. Only admins can run this script.');
}

echo "<h1>Making Admin Full Access</h1>";
echo "<pre>";

// Check if role column exists
$check_role = $conn->query("SHOW COLUMNS FROM users LIKE 'role'");
$has_role = $check_role->num_rows > 0;

if (!$has_role) {
    echo "Adding role column...\n";
    $conn->query("ALTER TABLE users ADD COLUMN role ENUM('Super Admin', 'Admin', 'Manager', 'User', 'Viewer') DEFAULT 'User' AFTER last_name");
    echo "✓ Role column added\n\n";
} else {
    echo "✓ Role column exists\n\n";
}

// Check if status column exists
$check_status = $conn->query("SHOW COLUMNS FROM users LIKE 'status'");
$has_status = $check_status->num_rows > 0;

if (!$has_status) {
    echo "Adding status column...\n";
    $conn->query("ALTER TABLE users ADD COLUMN status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active' AFTER role");
    echo "✓ Status column added\n\n";
} else {
    echo "✓ Status column exists\n\n";
}

// Update admin user to Super Admin
echo "Updating admin user...\n";
$result = $conn->query("UPDATE users SET role = 'Super Admin', status = 'Active' WHERE email = 'sidhykqatar@gmail.com'");
if ($result) {
    echo "✓ Admin user updated to Super Admin\n\n";
} else {
    echo "✗ Error updating admin user: " . $conn->error . "\n\n";
}

// Show all users and their roles
echo "Current users and roles:\n";
echo str_repeat("-", 60) . "\n";
$users = $conn->query("SELECT id, email, first_name, last_name, role, status FROM users ORDER BY role, email");
while ($user = $users->fetch_assoc()) {
    printf("%-5s %-30s %-20s %-15s %-10s\n", 
        $user['id'], 
        $user['email'], 
        ($user['first_name'] . ' ' . $user['last_name']),
        $user['role'] ?? 'User',
        $user['status'] ?? 'Active'
    );
}

closeDBConnection($conn);

echo "\n" . str_repeat("=", 60) . "\n";
echo "Done! Admin users now have full access.\n";
echo "</pre>";
?>

