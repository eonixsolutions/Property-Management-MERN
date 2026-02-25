<?php
// Application Configuration

// Set secure session configuration
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '0');  // Disabled for local HTTP development
ini_set('session.use_strict_mode', '1');

session_start();

// Base URL - Update this to match your XAMPP folder name
define('BASE_URL', 'http://localhost/real-cpanel-prov1');

// Session timeout in seconds (10 minutes = 600 seconds)
define('SESSION_TIMEOUT', 600);

// Timezone
date_default_timezone_set('UTC');

// Error Reporting (disabled for production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Disabled for production
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1); // Enable error logging

// Include database configuration
require_once __DIR__ . '/database.php';

// Initialize last activity time if not set
if (isset($_SESSION['user_id']) && !isset($_SESSION['last_activity'])) {
    $_SESSION['last_activity'] = time();
}

// Check session timeout
if (isset($_SESSION['user_id']) && isset($_SESSION['last_activity'])) {
    $timeSinceLastActivity = time() - $_SESSION['last_activity'];
    
    if ($timeSinceLastActivity > SESSION_TIMEOUT) {
        // Session expired - clear session and redirect to login
        session_unset();
        session_destroy();
        
        // Check if this is an AJAX request
        if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
            header('Content-Type: application/json');
            echo json_encode(['timeout' => true, 'redirect' => BASE_URL . '/auth/login.php?timeout=1']);
            exit();
        } else {
            header('Location: ' . BASE_URL . '/auth/login.php?timeout=1');
            exit();
        }
    }
}

// Update last activity time on each request
if (isset($_SESSION['user_id'])) {
    $_SESSION['last_activity'] = time();
}

// Helper function to check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

// Helper function to redirect if not logged in
function requireLogin() {
    if (!isLoggedIn()) {
        header('Location: ' . BASE_URL . '/auth/login.php');
        exit();
    }
}

// Helper function to get current user ID
function getCurrentUserId() {
    return isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
}

// Helper function to get current user role
function getCurrentUserRole() {
    if (!isLoggedIn()) {
        return null;
    }
    
    // Check if role is cached in session
    if (isset($_SESSION['user_role'])) {
        return $_SESSION['user_role'];
    }
    
    // Get from database
    $conn = getDBConnection();
    $user_id = getCurrentUserId();
    $result = $conn->query("SELECT role FROM users WHERE id = $user_id LIMIT 1");
    
    if ($result && $result->num_rows > 0) {
        $role = $result->fetch_assoc()['role'];
        $_SESSION['user_role'] = $role;
        closeDBConnection($conn);
        return $role;
    }
    
    closeDBConnection($conn);
    return 'User'; // Default role
}

// Helper function to check if user is admin (Super Admin, Admin, or Manager)
function isAdmin() {
    $role = getCurrentUserRole();
    return in_array($role, ['Super Admin', 'Admin', 'Manager']);
}

// Helper function to check if user is Super Admin
function isSuperAdmin() {
    return getCurrentUserRole() === 'Super Admin';
}

// Helper function to require admin access
function requireAdmin() {
    requireLogin();
    if (!isAdmin()) {
        header('Location: ' . BASE_URL . '/index.php?error=access_denied');
        exit();
    }
}

// Helper function to get user ID for queries (returns null for admins to see all data)
function getQueryUserId() {
    if (isAdmin()) {
        return null; // Admins can see all data
    }
    return getCurrentUserId(); // Regular users see only their data
}

// Helper function to build WHERE clause for user-specific data
function getUserWhereClause($table_alias = '') {
    $prefix = !empty($table_alias) ? $table_alias . '.' : '';
    
    if (isAdmin()) {
        return ''; // Admins see all data, no WHERE clause needed
    }
    
    return "WHERE {$prefix}user_id = " . getCurrentUserId();
}

// Helper function to sanitize input
function sanitizeInput($data) {
    if ($data === null || $data === '') {
        return '';
    }
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// Currency symbols mapping
function getCurrencySymbol($currency_code) {
    $currencies = [
        'USD' => '$',
        'QAR' => 'ر.ق',  // Qatar Riyal
        'SAR' => 'ر.س',  // Saudi Riyal
        'AED' => 'د.إ',  // UAE Dirham
        'EUR' => '€',
        'GBP' => '£',
        'CAD' => 'C$',
        'AUD' => 'A$',
        'JPY' => '¥',
        'INR' => '₹',
        'PKR' => '₨',
        'EGP' => 'E£',
        'BHD' => '.د.ب',
        'KWD' => 'د.ك',
        'OMR' => 'ر.ع.',
    ];
    return isset($currencies[$currency_code]) ? $currencies[$currency_code] : '$';
}

// Helper function to get user's currency
function getUserCurrency() {
    if (!isLoggedIn()) {
        return 'USD'; // Default
    }
    
    // Get currency from session if set
    if (isset($_SESSION['user_currency'])) {
        return $_SESSION['user_currency'];
    }
    
    // Get from database
    $conn = getDBConnection();
    $user_id = getCurrentUserId();
    $result = $conn->query("SELECT currency FROM settings WHERE user_id = $user_id LIMIT 1");
    
    if ($result && $result->num_rows > 0) {
        $currency = $result->fetch_assoc()['currency'];
        if (empty($currency)) {
            $currency = 'QAR'; // Default to QAR
        }
    } else {
        $currency = 'QAR'; // Default to QAR
    }
    
    $_SESSION['user_currency'] = $currency;
    closeDBConnection($conn);
    
    return $currency;
}

// Helper function to format currency
function formatCurrency($amount, $currency_code = null) {
    if ($currency_code === null) {
        $currency_code = getUserCurrency();
    }
    
    $symbol = getCurrencySymbol($currency_code);
    $formatted = number_format($amount, 2);
    
    // For RTL currencies (Arabic), put symbol after the number
    $rtl_currencies = ['QAR', 'SAR', 'AED', 'BHD', 'KWD', 'OMR'];
    if (in_array($currency_code, $rtl_currencies)) {
        return $formatted . ' ' . $symbol;
    } else {
        return $symbol . $formatted;
    }
}

// Helper function to format date
function formatDate($date) {
    if (empty($date) || $date == '0000-00-00') {
        return '-';
    }
    return date('M d, Y', strtotime($date));
}

// Helper function to get properties for dropdowns with units shown under master properties
function getPropertiesForDropdown($conn, $user_id, $additional_fields = '') {
    // Check if unit fields exist
    $check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
    $has_unit_fields = $check_unit->num_rows > 0;
    
    $fields = "p.id, p.property_name";
    if (!empty($additional_fields)) {
        $fields .= ", " . $additional_fields;
    }
    
    if ($has_unit_fields) {
        // Get properties with parent property info, ordered by master properties first, then units
        $query = "SELECT $fields, 
                    p.parent_property_id, 
                    p.unit_name, 
                    p.is_unit,
                    parent.property_name as parent_property_name
                  FROM properties p
                  LEFT JOIN properties parent ON p.parent_property_id = parent.id
                  WHERE p.user_id = $user_id
                  ORDER BY 
                    CASE 
                      WHEN (p.parent_property_id IS NULL OR p.parent_property_id = 0) AND (p.is_unit IS NULL OR p.is_unit = 0) THEN 0 
                      ELSE 1 
                    END,
                    COALESCE(parent.property_name, p.property_name),
                    COALESCE(p.unit_name, ''),
                    p.property_name";
    } else {
        // No unit fields - simple query
        $query = "SELECT $fields 
                  FROM properties p
                  WHERE p.user_id = $user_id
                  ORDER BY p.property_name";
    }
    
    $result = $conn->query($query);
    $properties = [];
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            // Format display name
            if ($has_unit_fields && !empty($row['parent_property_id']) && !empty($row['parent_property_name'])) {
                // This is a unit - show as "Master Property - Unit"
                $unit_display = !empty($row['unit_name']) ? $row['unit_name'] : $row['property_name'];
                $row['display_name'] = $row['parent_property_name'] . ' - ' . $unit_display;
            } else {
                // This is a master property
                $row['display_name'] = $row['property_name'];
            }
            $properties[] = $row;
        }
    }
    
    return $properties;
}

/**
 * Update property status based on active tenants
 * Sets property to 'Occupied' if there are active tenants, 'Vacant' if there are none
 * Does not change 'Under Maintenance' status
 * 
 * @param mysqli $conn Database connection
 * @param int $property_id Property ID to update
 * @return bool True if update was successful or not needed
 */
function updatePropertyStatusBasedOnTenants($conn, $property_id) {
    if (empty($property_id) || !is_numeric($property_id)) {
        return false;
    }
    
    $property_id = intval($property_id);
    
    // Get current property status
    $property_result = $conn->query("SELECT status FROM properties WHERE id = $property_id");
    if (!$property_result || $property_result->num_rows == 0) {
        return false;
    }
    $property = $property_result->fetch_assoc();
    $current_status = $property['status'];
    
    // Don't change 'Under Maintenance' status
    if ($current_status == 'Under Maintenance') {
        return true;
    }
    
    // Count active tenants for this property
    $active_tenants_result = $conn->query("SELECT COUNT(*) as count FROM tenants WHERE property_id = $property_id AND status = 'Active'");
    if (!$active_tenants_result) {
        return false;
    }
    
    $active_count = $active_tenants_result->fetch_assoc()['count'];
    
    // Update property status based on active tenants
    if ($active_count > 0) {
        // Has active tenants - set to Occupied
        if ($current_status != 'Occupied') {
            $conn->query("UPDATE properties SET status = 'Occupied' WHERE id = $property_id");
        }
    } else {
        // No active tenants - set to Vacant
        if ($current_status != 'Vacant') {
            $conn->query("UPDATE properties SET status = 'Vacant' WHERE id = $property_id");
        }
    }
    
    return true;
}
?>
