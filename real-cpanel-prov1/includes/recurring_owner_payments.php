<?php
/**
 * Recurring Owner Payments System
 * Automatically generates monthly owner payment entries for rental properties
 */

// Don't require config.php here - it should already be included by the calling script
// require_once __DIR__ . '/../config/config.php';

/**
 * Generate recurring owner payments for a property
 * Creates payment entries from start date to end date (or next 12 months)
 * @param int $property_id Property ID
 * @param mysqli $conn Database connection
 * @param string|null $custom_start_date Optional start date (Y-m-d format). If not provided, uses owner_rent_start_date from property or current month
 */
function generateRecurringOwnerPayments($property_id, $conn, $custom_start_date = null) {
    // Get property details including owner_rent_start_date
    $property = $conn->query("SELECT id, owner_name, monthly_rent_to_owner, owner_rent_start_date, user_id 
        FROM properties 
        WHERE id = $property_id")->fetch_assoc();
    
    if (!$property || empty($property['owner_name']) || empty($property['monthly_rent_to_owner']) || $property['monthly_rent_to_owner'] <= 0) {
        return 0; // Property doesn't have owner rent configured
    }
    
    $user_id = $property['user_id'];
    $amount = $property['monthly_rent_to_owner'];
    
    // Check if owner_payments table exists
    $check_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
    if ($check_table->num_rows == 0) {
        return 0; // Table doesn't exist
    }
    
    $payments_created = 0;
    
    // Determine start date: custom_start_date > owner_rent_start_date > current month
    if (!empty($custom_start_date)) {
        $start_date = new DateTime($custom_start_date);
    } else if (!empty($property['owner_rent_start_date'])) {
        $start_date = new DateTime($property['owner_rent_start_date']);
    } else {
        $start_date = new DateTime();
    }
    $start_date->modify('first day of this month');
    
    $end_date = new DateTime();
    $end_date->modify('+12 months'); // Generate for next 12 months
    
    // Generate payments for each month
    $current_date = clone $start_date;
    while ($current_date <= $end_date) {
        $payment_month = $current_date->format('Y-m-01');
        
        // Check if payment already exists for this month
        $exists = $conn->query("SELECT id FROM owner_payments 
            WHERE property_id = $property_id 
            AND DATE_FORMAT(payment_month, '%Y-%m') = '" . $current_date->format('Y-m') . "'")->num_rows;
        
        if (!$exists) {
            $stmt = $conn->prepare("INSERT INTO owner_payments (property_id, user_id, amount, payment_month, status) VALUES (?, ?, ?, ?, 'Pending')");
            $stmt->bind_param("iids", $property_id, $user_id, $amount, $payment_month);
            
            if ($stmt->execute()) {
                $payments_created++;
            }
            $stmt->close();
        }
        
        // Move to next month
        $current_date->modify('+1 month');
    }
    
    return $payments_created;
}

/**
 * Generate monthly owner payments for all rental properties
 * Used by cron job to generate upcoming month's payments
 */
function generateMonthlyOwnerPayments($user_id, $conn) {
    // Check if owner_payments table exists
    $check_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
    if ($check_table->num_rows == 0) {
        return 0; // Table doesn't exist
    }
    
    // Get all properties with owners and monthly rent configured
    $properties = $conn->query("SELECT id, owner_name, monthly_rent_to_owner 
        FROM properties 
        WHERE user_id = $user_id 
        AND owner_name IS NOT NULL 
        AND owner_name != '' 
        AND monthly_rent_to_owner > 0");
    
    $total_payments = 0;
    
    while ($property = $properties->fetch_assoc()) {
        $payments_created = generateRecurringOwnerPayments($property['id'], $conn);
        $total_payments += $payments_created;
    }
    
    return $total_payments;
}
?>

