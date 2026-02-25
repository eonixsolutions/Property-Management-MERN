<?php
/**
 * Backfill Script: Create income transactions for existing paid rent payments
 * This script will create transaction records for all rent payments that are marked as 'Paid'
 * but don't have corresponding transaction records.
 */

require_once '../config/config.php';
requireLogin();

// Only allow Super Admin or Admin users to run this
$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if user has admin privileges (you can adjust this check based on your user roles)
$user_check = $conn->query("SELECT role FROM users WHERE id = $user_id");
if ($user_check && $user_check->num_rows > 0) {
    $user_role = $user_check->fetch_assoc()['role'];
    if (!in_array($user_role, ['Super Admin', 'Admin'])) {
        die('Access denied. Only administrators can run this script.');
    }
}

echo "<h2>Backfilling Rent Payments to Transactions</h2>";
echo "<p>This script will create income transactions for all paid rent payments that don't have corresponding transactions.</p>";
echo "<hr>";

// Get all paid rent payments that don't have corresponding transactions
$query = "SELECT rp.*, p.user_id 
    FROM rent_payments rp
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE rp.status = 'Paid' 
    AND rp.paid_date IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.property_id = rp.property_id
        AND t.tenant_id = rp.tenant_id
        AND t.type = 'Income'
        AND t.category = 'Rent Payment'
        AND t.amount = rp.amount
        AND t.transaction_date = rp.paid_date
    )
    ORDER BY rp.paid_date DESC";

$result = $conn->query($query);

if (!$result) {
    die("Error executing query: " . $conn->error);
}

$total_found = $result->num_rows;
$created = 0;
$errors = 0;

echo "<p><strong>Found {$total_found} paid rent payments without transactions.</strong></p>";
echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>ID</th><th>Tenant</th><th>Amount</th><th>Paid Date</th><th>Status</th></tr>";

while ($rent_payment = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>{$rent_payment['id']}</td>";
    
    // Get tenant name (with proper result cleanup)
    $tenant_result = $conn->query("SELECT first_name, last_name FROM tenants WHERE id = {$rent_payment['tenant_id']} LIMIT 1");
    $tenant = $tenant_result ? $tenant_result->fetch_assoc() : null;
    if ($tenant_result) {
        $tenant_result->free();
    }
    $tenant_name = $tenant ? ($tenant['first_name'] . ' ' . $tenant['last_name']) : 'Unknown';
    echo "<td>{$tenant_name}</td>";
    echo "<td>" . formatCurrency($rent_payment['amount']) . "</td>";
    echo "<td>{$rent_payment['paid_date']}</td>";
    echo "<td>";
    
    // Create transaction
    $payment_method = !empty($rent_payment['payment_method']) ? $rent_payment['payment_method'] : 'Bank Transfer';
    $description = 'Rent Payment - ' . $rent_payment['amount'];
    if (!empty($rent_payment['notes'])) {
        $description .= ' - ' . $rent_payment['notes'];
    }
    $ref_number = !empty($rent_payment['reference_number']) ? $rent_payment['reference_number'] : '';
    
    $trans_stmt = $conn->prepare("INSERT INTO transactions (user_id, property_id, tenant_id, type, category, amount, description, transaction_date, payment_method, reference_number) VALUES (?, ?, ?, 'Income', 'Rent Payment', ?, ?, ?, ?, ?)");
    
    if ($trans_stmt) {
        $trans_stmt->bind_param("iiidssss", 
            $rent_payment['user_id'], 
            $rent_payment['property_id'], 
            $rent_payment['tenant_id'], 
            $rent_payment['amount'], 
            $description, 
            $rent_payment['paid_date'], 
            $payment_method,
            $ref_number
        );
        
        if ($trans_stmt->execute()) {
            echo "<span style='color: green;'>✓ Created</span>";
            $created++;
        } else {
            echo "<span style='color: red;'>✗ Error: " . $trans_stmt->error . "</span>";
            $errors++;
        }
        $trans_stmt->close();
    } else {
        echo "<span style='color: red;'>✗ Error preparing statement: " . $conn->error . "</span>";
        $errors++;
    }
    
    echo "</td>";
    echo "</tr>";
}

// Free the main result set
$result->free();

echo "</table>";
echo "<hr>";
echo "<h3>Summary:</h3>";
echo "<p><strong>Total found:</strong> {$total_found}</p>";
echo "<p><strong>Created:</strong> <span style='color: green;'>{$created}</span></p>";
echo "<p><strong>Errors:</strong> <span style='color: red;'>{$errors}</span></p>";

if ($created > 0) {
    echo "<p style='color: green; font-weight: bold;'>✓ Backfill completed successfully! Your rent payments should now appear in reports, income/expenses, and cash flow charts.</p>";
}

// Free all resources and close connection
closeAllDBConnections();
?>

