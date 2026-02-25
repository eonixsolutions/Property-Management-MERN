<?php
/**
 * Setup Script
 * Run this once to set up the database and create the admin user
 */

require_once 'config/database.php';

echo "Real Estate Management System Setup\n";
echo "===================================\n\n";

// Create database if it doesn't exist
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error . "\n");
}

echo "Creating database...\n";
$conn->query("CREATE DATABASE IF NOT EXISTS " . DB_NAME);
$conn->close();

// Import schema
echo "Importing database schema...\n";
$conn = getDBConnection();

// Read and execute schema file
$schema = file_get_contents('database/schema.sql');
$schema = str_replace('USE property_db;', '', $schema); // Remove USE statement as we're already connected

// Split by semicolons and execute
$statements = array_filter(array_map('trim', explode(';', $schema)));
foreach ($statements as $statement) {
    if (!empty($statement) && strpos($statement, '--') !== 0) {
        $conn->query($statement);
    }
}

echo "Generating password hash for admin user...\n";
$password = 'tz669933';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "Updating admin user password...\n";
$stmt = $conn->prepare("UPDATE users SET password = ? WHERE email = 'sidhykqatar@gmail.com'");
$stmt->bind_param("s", $hash);
$stmt->execute();

// Create uploads directory if it doesn't exist
if (!file_exists('uploads')) {
    mkdir('uploads', 0755, true);
    echo "Created uploads directory...\n";
}

echo "\nSetup completed successfully!\n";
echo "You can now login with:\n";
echo "Email: sidhykqatar@gmail.com\n";
echo "Password: tz669933\n";
echo "\nPlease delete this setup.php file after setup!\n";

closeDBConnection($conn);
?>
