<?php
/**
 * Cron Job: Generate Monthly Rent Invoices
 * 
 * This script should be run monthly (e.g., via cron job)
 * It generates invoices for all active tenants for upcoming months
 * 
 * Usage: php cron/generate_invoices.php
 * Or set up cron: 0 0 1 * * /usr/bin/php /path/to/realestate/cron/generate_invoices.php
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/recurring_invoices.php';
require_once __DIR__ . '/../includes/recurring_owner_payments.php';

// Only allow running from command line or with admin key
$is_cli = php_sapi_name() === 'cli';
$admin_key = isset($_GET['key']) && $_GET['key'] === 'generate_invoices_2024';

if (!$is_cli && !$admin_key) {
    die('Access denied. This script can only be run from command line or with proper authentication.');
}

echo "Starting invoice generation...\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

$conn = getDBConnection();

// Get all active tenants
$tenants = $conn->query("SELECT id, first_name, last_name FROM tenants WHERE status = 'Active'");

$total_invoices = 0;
$tenants_processed = 0;

while ($tenant = $tenants->fetch_assoc()) {
    echo "Processing tenant: {$tenant['first_name']} {$tenant['last_name']} (ID: {$tenant['id']})...\n";
    
    $invoices_created = generateMonthlyInvoices($tenant['id'], $conn);
    
    if ($invoices_created > 0) {
        echo "  Created {$invoices_created} invoice(s)\n";
        $total_invoices += $invoices_created;
    } else {
        echo "  No new invoices needed\n";
    }
    
    $tenants_processed++;
}

// Generate owner payments for rental properties
echo "\n";
echo "Generating owner payment invoices for rental properties...\n";

// Get all users (for CLI mode)
if ($is_cli) {
    $users = $conn->query("SELECT DISTINCT id FROM users");
    $total_owner_payments = 0;
    
    while ($user = $users->fetch_assoc()) {
        $payments = generateMonthlyOwnerPayments($user['id'], $conn);
        $total_owner_payments += $payments;
    }
    
    echo "Owner payments created: {$total_owner_payments}\n";
    $owner_payments_created = $total_owner_payments;
} else {
    // Web mode - current user only
    $owner_payments_created = generateMonthlyOwnerPayments(getCurrentUserId(), $conn);
    echo "Owner payments created: {$owner_payments_created}\n";
}

closeDBConnection($conn);

echo "\n";
echo "Invoice generation completed!\n";
echo "Tenants processed: {$tenants_processed}\n";
echo "Tenant invoices created: {$total_invoices}\n";
echo "Owner payments created: {$owner_payments_created}\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";
?>
