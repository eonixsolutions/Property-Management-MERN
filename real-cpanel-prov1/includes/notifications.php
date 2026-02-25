<?php
/**
 * Notification System
 * Get notifications for overdue payments, upcoming due dates, etc.
 */

// Don't require config.php again if already included
if (!function_exists('formatCurrency')) {
    require_once __DIR__ . '/../config/config.php';
}

function getNotifications($user_id, $conn = null) {
    $close_conn = false;
    if ($conn === null) {
        $conn = getDBConnection();
        $close_conn = true;
    }
    
    $notifications = [];
    $today = date('Y-m-d');
    
    // Overdue Rent Payments
    $overdue_count = $conn->query("SELECT COUNT(*) as count FROM rent_payments rp
        INNER JOIN tenants t ON rp.tenant_id = t.id
        INNER JOIN properties p ON rp.property_id = p.id
        WHERE p.user_id = $user_id 
        AND rp.status = 'Pending' 
        AND rp.due_date < '$today'")->fetch_assoc()['count'];
    
    if ($overdue_count > 0) {
        $overdue_amount = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments rp
            INNER JOIN properties p ON rp.property_id = p.id
            WHERE p.user_id = $user_id 
            AND rp.status = 'Pending' 
            AND rp.due_date < '$today'")->fetch_assoc()['total'];
        
        $notifications[] = [
            'type' => 'danger',
            'icon' => '⚠️',
            'title' => 'Overdue Rent Payments',
            'message' => $overdue_count . ' payment(s) totaling ' . formatCurrency($overdue_amount),
            'link' => BASE_URL . '/rent/index.php?filter=overdue',
            'count' => $overdue_count
        ];
    }
    
    // Upcoming Rent Due (Next 7 days)
    $upcoming_7days = $conn->query("SELECT COUNT(*) as count FROM rent_payments rp
        INNER JOIN tenants t ON rp.tenant_id = t.id
        INNER JOIN properties p ON rp.property_id = p.id
        WHERE p.user_id = $user_id 
        AND rp.status = 'Pending' 
        AND rp.due_date >= '$today' 
        AND rp.due_date <= DATE_ADD('$today', INTERVAL 7 DAY)")->fetch_assoc()['count'];
    
    if ($upcoming_7days > 0) {
        $notifications[] = [
            'type' => 'warning',
            'icon' => '📅',
            'title' => 'Rent Due Soon',
            'message' => $upcoming_7days . ' payment(s) due in the next 7 days',
            'link' => BASE_URL . '/rent/index.php',
            'count' => $upcoming_7days
        ];
    }
    
    // Pending Maintenance Requests
    $pending_maintenance = $conn->query("SELECT COUNT(*) as count FROM maintenance_requests mr
        INNER JOIN properties p ON mr.property_id = p.id
        WHERE p.user_id = $user_id 
        AND mr.status IN ('Pending', 'In Progress')")->fetch_assoc()['count'];
    
    if ($pending_maintenance > 0) {
        $notifications[] = [
            'type' => 'info',
            'icon' => '🔧',
            'title' => 'Pending Maintenance',
            'message' => $pending_maintenance . ' maintenance request(s) need attention',
            'link' => BASE_URL . '/maintenance/index.php',
            'count' => $pending_maintenance
        ];
    }
    
    // Expiring Leases (Next 30 days)
    $expiring_leases = $conn->query("SELECT COUNT(*) as count FROM tenants t
        INNER JOIN properties p ON t.property_id = p.id
        WHERE p.user_id = $user_id 
        AND t.status = 'Active'
        AND t.lease_end IS NOT NULL
        AND t.lease_end >= '$today'
        AND t.lease_end <= DATE_ADD('$today', INTERVAL 30 DAY)")->fetch_assoc()['count'];
    
    if ($expiring_leases > 0) {
        $notifications[] = [
            'type' => 'warning',
            'icon' => '📋',
            'title' => 'Expiring Leases',
            'message' => $expiring_leases . ' lease(s) expiring in the next 30 days',
            'link' => BASE_URL . '/tenants/index.php',
            'count' => $expiring_leases
        ];
    }
    
    // Check if cheque tables exist
    $check_tenant_cheques = $conn->query("SHOW TABLES LIKE 'tenant_cheques'");
    $check_owner_cheques = $conn->query("SHOW TABLES LIKE 'owner_cheques'");
    $has_tenant_cheques = $check_tenant_cheques->num_rows > 0;
    $has_owner_cheques = $check_owner_cheques->num_rows > 0;
    
    // Tenant Cheques - Upcoming Deposit Dates (Next 7 days)
    if ($has_tenant_cheques) {
        $upcoming_deposits = $conn->query("SELECT COUNT(*) as count FROM tenant_cheques tc
            INNER JOIN properties p ON tc.property_id = p.id
            WHERE p.user_id = $user_id 
            AND tc.status IN ('Pending', 'Deposited')
            AND tc.deposit_date IS NOT NULL
            AND tc.deposit_date >= '$today'
            AND tc.deposit_date <= DATE_ADD('$today', INTERVAL 7 DAY)")->fetch_assoc()['count'];
        
        if ($upcoming_deposits > 0) {
            $deposit_amount = $conn->query("SELECT COALESCE(SUM(cheque_amount), 0) as total FROM tenant_cheques tc
                INNER JOIN properties p ON tc.property_id = p.id
                WHERE p.user_id = $user_id 
                AND tc.status IN ('Pending', 'Deposited')
                AND tc.deposit_date IS NOT NULL
                AND tc.deposit_date >= '$today'
                AND tc.deposit_date <= DATE_ADD('$today', INTERVAL 7 DAY)")->fetch_assoc()['total'];
            
            $notifications[] = [
                'type' => 'info',
                'icon' => '💳',
                'title' => 'Cheques to Deposit',
                'message' => $upcoming_deposits . ' cheque(s) totaling ' . formatCurrency($deposit_amount) . ' need deposit in next 7 days',
                'link' => BASE_URL . '/cheques/tenants.php?filter=upcoming',
                'count' => $upcoming_deposits
            ];
        }
        
        // Pending tenant cheques (not yet deposited)
        $pending_tenant_cheques = $conn->query("SELECT COUNT(*) as count FROM tenant_cheques tc
            INNER JOIN properties p ON tc.property_id = p.id
            WHERE p.user_id = $user_id 
            AND tc.status = 'Pending'
            AND (tc.deposit_date IS NULL OR tc.deposit_date >= '$today')")->fetch_assoc()['count'];
        
        if ($pending_tenant_cheques > 0) {
            $notifications[] = [
                'type' => 'warning',
                'icon' => '📝',
                'title' => 'Pending Tenant Cheques',
                'message' => $pending_tenant_cheques . ' cheque(s) pending deposit',
                'link' => BASE_URL . '/cheques/tenants.php?filter=pending',
                'count' => $pending_tenant_cheques
            ];
        }
    }
    
    // Owner Cheques - Upcoming Cheque Dates (Next 7 days)
    if ($has_owner_cheques) {
        $upcoming_owner_cheques = $conn->query("SELECT COUNT(*) as count FROM owner_cheques oc
            INNER JOIN properties p ON oc.property_id = p.id
            WHERE p.user_id = $user_id 
            AND oc.status = 'Issued'
            AND oc.cheque_date >= '$today'
            AND oc.cheque_date <= DATE_ADD('$today', INTERVAL 7 DAY)")->fetch_assoc()['count'];
        
        if ($upcoming_owner_cheques > 0) {
            $owner_cheque_amount = $conn->query("SELECT COALESCE(SUM(cheque_amount), 0) as total FROM owner_cheques oc
                INNER JOIN properties p ON oc.property_id = p.id
                WHERE p.user_id = $user_id 
                AND oc.status = 'Issued'
                AND oc.cheque_date >= '$today'
                AND oc.cheque_date <= DATE_ADD('$today', INTERVAL 7 DAY)")->fetch_assoc()['total'];
            
            $notifications[] = [
                'type' => 'info',
                'icon' => '🏦',
                'title' => 'Owner Cheques Due',
                'message' => $upcoming_owner_cheques . ' cheque(s) totaling ' . formatCurrency($owner_cheque_amount) . ' will be due in next 7 days',
                'link' => BASE_URL . '/cheques/owners.php?filter=upcoming',
                'count' => $upcoming_owner_cheques
            ];
        }
    }
    
    if ($close_conn) {
        closeDBConnection($conn);
    }
    
    return $notifications;
}

function getNotificationCount($user_id, $conn = null) {
    $notifications = getNotifications($user_id, $conn);
    $total = 0;
    foreach ($notifications as $notif) {
        $total += $notif['count'];
    }
    return $total;
}
?>
