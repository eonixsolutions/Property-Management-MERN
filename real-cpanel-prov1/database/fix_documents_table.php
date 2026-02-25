<?php
/**
 * Fix Documents Table
 * Creates the documents table if it doesn't exist
 */

require_once __DIR__ . '/../config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Fix Documents Table</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .success { color: #28a745; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin: 10px 0; }
        .error { color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0; }
        .info { color: #004085; padding: 10px; background: #cce5ff; border: 1px solid #b3d7ff; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
<div class='container'>
<h1>Fix Documents Table</h1>";

try {
    $conn = getDBConnection();
    
    // Check if table exists
    echo "<div class='info'>Checking if documents table exists...</div>";
    $result = $conn->query("SHOW TABLES LIKE 'documents'");
    
    if ($result && $result->num_rows > 0) {
        echo "<div class='success'>✓ Documents table already exists</div>";
    } else {
        echo "<div class='info'>Documents table not found. Creating it now...</div>";
        
        // Create the documents table
        $sql = "CREATE TABLE IF NOT EXISTS documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            property_id INT,
            tenant_id INT,
            document_type ENUM('Lease Agreement', 'Invoice', 'Receipt', 'Contract', 'Other') NOT NULL,
            title VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_size INT,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
        )";
        
        if ($conn->query($sql)) {
            echo "<div class='success'>✓ Documents table created successfully!</div>";
        } else {
            throw new Exception("Error creating table: " . $conn->error);
        }
    }
    
    // Verify the table structure
    echo "<div class='info'>Verifying table structure...</div>";
    $result = $conn->query("DESCRIBE documents");
    if ($result) {
        echo "<div class='success'>✓ Table structure verified. Columns:</div>";
        echo "<table border='1' cellpadding='5' cellspacing='0' style='width:100%; border-collapse:collapse; margin-top:10px;'>";
        echo "<tr style='background:#f0f0f0;'><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr>";
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
    }
    
    $conn->close();
    echo "<div class='success'><strong>✓ All done! The documents table is ready to use.</strong></div>";
    
} catch (Exception $e) {
    echo "<div class='error'><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</div>";
    if (isset($conn)) {
        echo "<div class='error'>MySQL Error: " . htmlspecialchars($conn->error) . "</div>";
    }
}

echo "</div></body></html>";
?>

