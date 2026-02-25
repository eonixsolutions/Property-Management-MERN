<?php
/**
 * Quick Fix Script: Kill idle MySQL connections
 * Run this if you're experiencing "Too many connections" errors
 * This will help free up connection slots
 */

require_once '../config/config.php';
requireLogin();

// Only allow Super Admin or Admin users
$conn = getDBConnection();
$user_id = getCurrentUserId();

$user_check = $conn->query("SELECT role FROM users WHERE id = $user_id");
if ($user_check && $user_check->num_rows > 0) {
    $user_role = $user_check->fetch_assoc()['role'];
    if (!in_array($user_role, ['Super Admin', 'Admin'])) {
        die('Access denied. Only administrators can run this script.');
    }
}

echo "<h2>MySQL Connection Management</h2>";
echo "<hr>";

// Get current connection info
$max_connections = $conn->query("SHOW VARIABLES LIKE 'max_connections'")->fetch_assoc()['Value'];
$current_connections = $conn->query("SHOW STATUS LIKE 'Threads_connected'")->fetch_assoc()['Value'];
$max_used = $conn->query("SHOW STATUS LIKE 'Max_used_connections'")->fetch_assoc()['Value'];

echo "<h3>Current Connection Status:</h3>";
echo "<ul>";
echo "<li><strong>Max Connections Allowed:</strong> {$max_connections}</li>";
echo "<li><strong>Current Connections:</strong> {$current_connections}</li>";
echo "<li><strong>Max Connections Used (Peak):</strong> {$max_used}</li>";
echo "<li><strong>Available Slots:</strong> " . ($max_connections - $current_connections) . "</li>";
echo "</ul>";

echo "<hr>";

// Show idle/sleeping connections
echo "<h3>Idle Connections (Sleeping):</h3>";
$sleep_connections = $conn->query("SHOW PROCESSLIST");
$sleep_count = 0;

echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>ID</th><th>User</th><th>Host</th><th>Database</th><th>Command</th><th>Time</th><th>State</th><th>Info</th></tr>";

while ($process = $sleep_connections->fetch_assoc()) {
    if ($process['Command'] == 'Sleep' && $process['Time'] > 10) {
        $sleep_count++;
        echo "<tr>";
        echo "<td>{$process['Id']}</td>";
        echo "<td>{$process['User']}</td>";
        echo "<td>{$process['Host']}</td>";
        echo "<td>{$process['db']}</td>";
        echo "<td>{$process['Command']}</td>";
        echo "<td>{$process['Time']}s</td>";
        echo "<td>{$process['State']}</td>";
        echo "<td>" . (strlen($process['Info']) > 50 ? substr($process['Info'], 0, 50) . '...' : $process['Info']) . "</td>";
        echo "</tr>";
    }
}

echo "</table>";

if ($sleep_count == 0) {
    echo "<p>No idle connections found.</p>";
} else {
    echo "<p><strong>Found {$sleep_count} idle connection(s).</strong></p>";
}

$sleep_connections->free();

echo "<hr>";
echo "<h3>Recommendations:</h3>";
echo "<ul>";
if ($current_connections > ($max_connections * 0.8)) {
    echo "<li style='color: red;'><strong>Warning:</strong> You're using more than 80% of available connections. Consider:</li>";
    echo "<ul>";
    echo "<li>Restarting MySQL server to clear idle connections</li>";
    echo "<li>Increasing max_connections in MySQL config (my.ini or my.cnf)</li>";
    echo "<li>Contacting your hosting provider if on shared hosting</li>";
    echo "</ul>";
} else {
    echo "<li style='color: green;'>Connection usage is healthy.</li>";
}
echo "</ul>";

closeAllDBConnections();
?>

