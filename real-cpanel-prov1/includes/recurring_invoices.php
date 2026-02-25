<?php
/**
 * Recurring Invoices System
 * Automatically generates rent invoices for tenants
 */

require_once __DIR__ . '/../config/config.php';

/**
 * Generate recurring rent invoices for a tenant
 * Generates invoices for all months from lease_start to lease_end, including past months
 */
function generateRecurringInvoices($tenant_id, $conn = null) {
    if ($conn === null) {
        $conn = getDBConnection();
    }
    
    // Get tenant details
    $tenant = $conn->query("SELECT * FROM tenants WHERE id = $tenant_id")->fetch_assoc();
    
    if (!$tenant || $tenant['status'] != 'Active') {
        return false;
    }
    
    $lease_start = $tenant['lease_start'] ? $tenant['lease_start'] : $tenant['move_in_date'];
    $lease_end = $tenant['lease_end'];
    $monthly_rent = $tenant['monthly_rent'];
    $property_id = $tenant['property_id'];
    
    if (!$lease_start || !$monthly_rent) {
        return false;
    }
    
    // Start from the first day of the month of lease_start
    $start_date = new DateTime($lease_start);
    $start_date->modify('first day of this month');
    
    // Get current date and set end date to current month (not future months)
    $today = new DateTime();
    $current_month = clone $today;
    $current_month->modify('first day of this month');
    
    // Determine end date: use lease_end if set, otherwise use current month
    if (!empty($lease_end)) {
        $end_date = new DateTime($lease_end);
        $end_date->modify('last day of this month');
        // Don't generate beyond current month
        if ($end_date > $current_month) {
            $end_date = clone $current_month;
        }
    } else {
        // If no lease_end, generate only until current month
        $end_date = clone $current_month;
    }
    
    $current_date = clone $start_date;
    $invoices_created = 0;
    
    // Generate invoices for all months from lease_start to current month (including past months, but not future)
    while ($current_date <= $end_date) {
        // Set due_date to the first day of each month
        $due_date = $current_date->format('Y-m-01');
        
        // Check if invoice already exists for this month
        $exists = $conn->query("SELECT id FROM rent_payments 
            WHERE tenant_id = $tenant_id 
            AND DATE_FORMAT(due_date, '%Y-%m') = '" . $current_date->format('Y-m') . "'")->num_rows;
        
        if (!$exists) {
            // Determine status: if due_date is in the past and not paid, mark as Overdue
            // Otherwise mark as Pending
            $due_date_obj = new DateTime($due_date);
            $status = ($due_date_obj < $today) ? 'Overdue' : 'Pending';
            
            $stmt = $conn->prepare("INSERT INTO rent_payments (tenant_id, property_id, amount, due_date, status) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("iidss", $tenant_id, $property_id, $monthly_rent, $due_date, $status);
            
            if ($stmt->execute()) {
                $invoices_created++;
            }
            $stmt->close();
        }
        
        // Move to next month
        $current_date->modify('+1 month');
    }
    
    return $invoices_created;
}

/**
 * Generate invoices for all active tenants (for cron job)
 */
function generateAllRecurringInvoices() {
    $conn = getDBConnection();
    
    // Get all active tenants
    $tenants = $conn->query("SELECT id FROM tenants WHERE status = 'Active'");
    
    $total_invoices = 0;
    
    while ($tenant = $tenants->fetch_assoc()) {
        // Generate invoices for current and future months
        generateMonthlyInvoices($tenant['id'], $conn);
        $total_invoices++;
    }
    
    closeDBConnection($conn);
    return $total_invoices;
}

/**
 * Generate invoices for current and upcoming months for a tenant
 */
function generateMonthlyInvoices($tenant_id, $conn = null) {
    if ($conn === null) {
        $conn = getDBConnection();
    }
    
    // Get tenant details
    $tenant = $conn->query("SELECT * FROM tenants WHERE id = $tenant_id")->fetch_assoc();
    
    if (!$tenant || $tenant['status'] != 'Active') {
        return false;
    }
    
    $lease_start = $tenant['lease_start'] ? $tenant['lease_start'] : $tenant['move_in_date'];
    $lease_end = $tenant['lease_end'];
    $monthly_rent = $tenant['monthly_rent'];
    $property_id = $tenant['property_id'];
    
    if (!$lease_start || !$lease_end || !$monthly_rent) {
        return false;
    }
    
    $lease_end_date = new DateTime($lease_end);
    $current_date = new DateTime();
    
    // Generate invoices for next 12 months from today (or until lease end)
    $target_date = clone $current_date;
    $target_date->modify('+12 months');
    
    if ($lease_end_date < $target_date) {
        $target_date = $lease_end_date;
    }
    
    $invoices_created = 0;
    $check_date = clone $current_date;
    
    // Check and create invoices for next 12 months
    while ($check_date <= $target_date && $check_date <= $lease_end_date) {
        $due_date = $check_date->format('Y-m-01'); // First day of the month
        
        // Check if invoice already exists for this month
        $exists = $conn->query("SELECT id FROM rent_payments 
            WHERE tenant_id = $tenant_id 
            AND DATE_FORMAT(due_date, '%Y-%m') = '" . $check_date->format('Y-m') . "'")->num_rows;
        
        if (!$exists && $check_date >= new DateTime($lease_start)) {
            $stmt = $conn->prepare("INSERT INTO rent_payments (tenant_id, property_id, amount, due_date, status) VALUES (?, ?, ?, ?, 'Pending')");
            $stmt->bind_param("iids", $tenant_id, $property_id, $monthly_rent, $due_date);
            
            if ($stmt->execute()) {
                $invoices_created++;
            }
            $stmt->close();
        }
        
        // Move to next month
        $check_date->modify('+1 month');
    }
    
    return $invoices_created;
}
?>
