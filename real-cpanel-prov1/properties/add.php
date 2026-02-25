<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $property_name = sanitizeInput($_POST['property_name']);
    $address = sanitizeInput($_POST['address']);
    $city = sanitizeInput($_POST['city']);
    $state = sanitizeInput($_POST['state']);
    $zip_code = sanitizeInput($_POST['zip_code']);
    $country = sanitizeInput($_POST['country']);
    $property_type = $_POST['property_type'];
    // If "Other" is selected, use the custom property type
    if ($property_type == 'Other' && !empty($_POST['custom_property_type'])) {
        $property_type = sanitizeInput($_POST['custom_property_type']);
    }
    $bedrooms = !empty($_POST['bedrooms']) ? intval($_POST['bedrooms']) : null;
    $bathrooms = !empty($_POST['bathrooms']) ? floatval($_POST['bathrooms']) : null;
    $square_feet = !empty($_POST['square_feet']) ? intval($_POST['square_feet']) : null;
    $purchase_price = !empty($_POST['purchase_price']) ? floatval($_POST['purchase_price']) : null;
    $current_value = !empty($_POST['current_value']) ? floatval($_POST['current_value']) : null;
    $purchase_date = !empty($_POST['purchase_date']) ? $_POST['purchase_date'] : null;
    $default_rent = !empty($_POST['default_rent']) ? floatval($_POST['default_rent']) : null;
    $owner_name = !empty($_POST['owner_name']) ? sanitizeInput($_POST['owner_name']) : null;
    $owner_contact = !empty($_POST['owner_contact']) ? sanitizeInput($_POST['owner_contact']) : null;
    $owner_email = !empty($_POST['owner_email']) ? sanitizeInput($_POST['owner_email']) : null;
    $owner_phone = !empty($_POST['owner_phone']) ? sanitizeInput($_POST['owner_phone']) : null;
    $monthly_rent_to_owner = !empty($_POST['monthly_rent_to_owner']) ? floatval($_POST['monthly_rent_to_owner']) : null;
    $owner_rent_start_date = !empty($_POST['owner_rent_start_date']) ? $_POST['owner_rent_start_date'] : null;
    $is_unit = isset($_POST['is_unit']) && $_POST['is_unit'] == '1' ? 1 : 0;
    $parent_property_id = !empty($_POST['parent_property_id']) ? intval($_POST['parent_property_id']) : null;
    $unit_name = !empty($_POST['unit_name']) ? sanitizeInput($_POST['unit_name']) : null;
    $status = !empty($_POST['status']) ? $_POST['status'] : '';
    $contact_number = !empty($_POST['contact_number']) ? sanitizeInput($_POST['contact_number']) : null;
    $notes = sanitizeInput($_POST['notes']);
    
    // If it's a unit, don't allow owner fields (inherited from parent)
    // Also set address, city, property_type, status to inherit from parent if empty
    if ($is_unit && $parent_property_id) {
        $owner_name = null;
        $owner_contact = null;
        $owner_email = null;
        $owner_phone = null;
        $monthly_rent_to_owner = null;
        $owner_rent_start_date = null;
        
        // Get parent property to inherit address/location info
        $parent_result = $conn->query("SELECT address, city, state, zip_code, country, property_type, status FROM properties WHERE id = $parent_property_id AND user_id = $user_id");
        if ($parent_result && $parent_result->num_rows > 0) {
            $parent_data = $parent_result->fetch_assoc();
        // Inherit if fields are empty (but allow property_type to be overridden)
        if (empty($address)) $address = $parent_data['address'];
        if (empty($city)) $city = $parent_data['city'];
        if (empty($state)) $state = $parent_data['state'];
        if (empty($zip_code)) $zip_code = $parent_data['zip_code'];
        if (empty($country)) $country = $parent_data['country'];
        // Allow units to have their own property_type, only inherit if not set
        if (empty($property_type)) $property_type = $parent_data['property_type'];
        if (empty($status)) $status = $parent_data['status'];
        }
        
        // Default status to Vacant if still empty
        if (empty($status)) $status = 'Vacant';
    }
    
    if (empty($property_name)) {
        $error = 'Please fill in property name';
    } else if (empty($property_type) || ($property_type == 'Other' && empty($_POST['custom_property_type']))) {
        $error = 'Please select a property type or enter a custom type';
    } else if (!$is_unit && (empty($address) || empty($city))) {
        $error = 'Please fill in all required fields';
    } else {
        // Check which columns exist
        $check_default_rent = $conn->query("SHOW COLUMNS FROM properties LIKE 'default_rent'");
        $has_default_rent = $check_default_rent->num_rows > 0;
        $check_owner_name = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
        $has_owner_fields = $check_owner_name->num_rows > 0;
        $check_owner_rent_start = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_rent_start_date'");
        $has_owner_rent_start = $check_owner_rent_start->num_rows > 0;
        $check_unit_fields = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
        $has_unit_fields = $check_unit_fields->num_rows > 0;
        $check_contact = $conn->query("SHOW COLUMNS FROM properties LIKE 'contact_number'");
        $has_contact_number = $check_contact->num_rows > 0;
        
        // Add contact_number column if it doesn't exist
        if (!$has_contact_number) {
            $conn->query("ALTER TABLE properties ADD COLUMN contact_number VARCHAR(20) DEFAULT NULL AFTER notes");
            $has_contact_number = true;
        }
        
        // Add owner_rent_start_date column if it doesn't exist
        if ($has_owner_fields && !$has_owner_rent_start) {
            $conn->query("ALTER TABLE properties ADD COLUMN owner_rent_start_date DATE DEFAULT NULL AFTER monthly_rent_to_owner");
            $has_owner_rent_start = true;
        }
        
        // Build INSERT statement based on available columns
        if ($has_unit_fields && $has_owner_fields && $has_owner_rent_start && $has_default_rent && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, owner_rent_start_date, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisissssdssssssssiddddsdsss", $user_id, $parent_property_id, $unit_name, $is_unit, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $owner_rent_start_date, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $contact_number, $notes);
        } else if ($has_unit_fields && $has_owner_fields && $has_owner_rent_start && $has_default_rent) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, owner_rent_start_date, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisissssdssssssssiddddsdss", $user_id, $parent_property_id, $unit_name, $is_unit, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $owner_rent_start_date, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $notes);
        } else if ($has_unit_fields && $has_owner_fields && $has_owner_rent_start && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, owner_rent_start_date, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisissssdssssssssiddddssss", $user_id, $parent_property_id, $unit_name, $is_unit, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $owner_rent_start_date, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $contact_number, $notes);
        } else if ($has_unit_fields && $has_owner_fields && $has_owner_rent_start) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, owner_rent_start_date, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisissssdssssssssiddddsss", $user_id, $parent_property_id, $unit_name, $is_unit, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $owner_rent_start_date, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $notes);
        } else if ($has_unit_fields && $has_owner_fields && $has_default_rent && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            // Types: i(user_id) + i(parent_property_id) + s(unit_name) + i(is_unit) + s(owner_name) + s(owner_contact) + s(owner_email) + s(owner_phone) + d(monthly_rent_to_owner) + s(property_name) + s(address) + s(city) + s(state) + s(zip_code) + s(country) + s(property_type) + i(bedrooms) + d(bathrooms) + i(square_feet) + d(purchase_price) + d(current_value) + s(purchase_date) + d(default_rent) + s(status) + s(contact_number) + s(notes) = "iisissssdsssssssiddddsdsss"
            $stmt->bind_param("iisissssdsssssssiddddsdsss", $user_id, $parent_property_id, $unit_name, $is_unit, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $contact_number, $notes);
        } else if ($has_unit_fields && $has_owner_fields && $has_default_rent) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisissssdsssssssiddddsdss", $user_id, $parent_property_id, $unit_name, $is_unit, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $notes);
        } else if ($has_unit_fields && $has_owner_fields && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisissssdsssssssiddddssss", $user_id, $parent_property_id, $unit_name, $is_unit, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $contact_number, $notes);
        } else if ($has_unit_fields && $has_owner_fields) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisissssdsssssssiddddsss", $user_id, $parent_property_id, $unit_name, $is_unit, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $notes);
        } else if ($has_unit_fields && $has_default_rent && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisisssssssiddddsdsss", $user_id, $parent_property_id, $unit_name, $is_unit, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $contact_number, $notes);
        } else if ($has_unit_fields && $has_default_rent) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisisssssssiddddsdss", $user_id, $parent_property_id, $unit_name, $is_unit, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $notes);
        } else if ($has_unit_fields && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisisssssssiddddssss", $user_id, $parent_property_id, $unit_name, $is_unit, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $contact_number, $notes);
        } else if ($has_unit_fields) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, parent_property_id, unit_name, is_unit, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisisssssssiddddsss", $user_id, $parent_property_id, $unit_name, $is_unit, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $notes);
        } else if ($has_owner_fields && $has_owner_rent_start && $has_default_rent && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, owner_rent_start_date, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssdssssssssiddddsdsss", $user_id, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $owner_rent_start_date, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $contact_number, $notes);
        } else if ($has_owner_fields && $has_owner_rent_start && $has_default_rent) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, owner_rent_start_date, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssdssssssssiddddsdss", $user_id, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $owner_rent_start_date, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $notes);
        } else if ($has_owner_fields && $has_owner_rent_start && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, owner_rent_start_date, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssdssssssssiddddssss", $user_id, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $owner_rent_start_date, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $contact_number, $notes);
        } else if ($has_owner_fields && $has_owner_rent_start) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, owner_rent_start_date, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssdssssssssiddddsss", $user_id, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $owner_rent_start_date, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $notes);
        } else if ($has_owner_fields && $has_default_rent && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssdsssssssiddddsdsss", $user_id, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $contact_number, $notes);
        } else if ($has_owner_fields && $has_default_rent) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssdsssssssiddddsdss", $user_id, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $notes);
        } else if ($has_owner_fields && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssdsssssssiddddssss", $user_id, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $contact_number, $notes);
        } else if ($has_owner_fields) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, owner_name, owner_contact, owner_email, owner_phone, monthly_rent_to_owner, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssdsssssssiddddsss", $user_id, $owner_name, $owner_contact, $owner_email, $owner_phone, $monthly_rent_to_owner, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $notes);
        } else if ($has_default_rent && $has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssssssiddddsdsss", $user_id, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $contact_number, $notes);
        } else if ($has_default_rent) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, default_rent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssssssiddddsdss", $user_id, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $default_rent, $status, $notes);
        } else if ($has_contact_number) {
            $stmt = $conn->prepare("INSERT INTO properties (user_id, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, contact_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssssssiddddssss", $user_id, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $contact_number, $notes);
        } else {
            // Fallback if columns don't exist yet
            $stmt = $conn->prepare("INSERT INTO properties (user_id, property_name, address, city, state, zip_code, country, property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value, purchase_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssssssiddddsss", $user_id, $property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date, $status, $notes);
        }
        
        if ($stmt->execute()) {
            $property_id = $conn->insert_id;
            
            // Generate recurring owner payments if property has owner rent configured
            if ($has_owner_fields && !empty($owner_name) && !empty($monthly_rent_to_owner) && $monthly_rent_to_owner > 0) {
                // Check if owner_payments table exists
                $check_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
                if ($check_table->num_rows > 0) {
                    require_once '../includes/recurring_owner_payments.php';
                    // Pass the start date if provided
                    $payments_created = generateRecurringOwnerPayments($property_id, $conn, $owner_rent_start_date);
                }
            }
            
            header('Location: index.php?added=1');
            exit();
        } else {
            $error = 'Error adding property. Please try again.';
        }
        
        $stmt->close();
    }
}

$page_title = 'Add Property';
include '../includes/header.php';

// Check if owner fields exist (need connection open)
$check_owner = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner_fields = $check_owner->num_rows > 0;

// Check if we're adding a unit to a parent property
$parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : null;
$parent_property = null;
if ($parent_id) {
    $parent_result = $conn->query("SELECT * FROM properties WHERE id = $parent_id AND user_id = $user_id");
    if ($parent_result && $parent_result->num_rows > 0) {
        $parent_property = $parent_result->fetch_assoc();
    }
}

// Check if this is a unit for form display
$is_unit = $parent_property ? true : false;
?>

<div class="page-actions">
    <h1><?php echo $parent_property ? 'Add Unit to: ' . htmlspecialchars($parent_property['property_name']) : 'Add New Property'; ?></h1>
    <a href="index.php" class="btn-link">← Back to Properties</a>
</div>

<?php if ($parent_property): ?>
    <div class="alert alert-info">
        <strong>Adding Unit:</strong> You're adding a unit to <strong><?php echo htmlspecialchars($parent_property['property_name']); ?></strong>
        <?php if (!empty($parent_property['owner_name'])): ?>
            <br>Master Property Owner: <?php echo htmlspecialchars($parent_property['owner_name']); ?> 
            (Rent: <?php echo formatCurrency($parent_property['monthly_rent_to_owner']); ?>/month)
        <?php endif; ?>
    </div>
<?php endif; ?>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <?php 
            // Check if unit fields exist
            $check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
            $has_unit_fields = $check_unit->num_rows > 0;
            
            if ($has_unit_fields):
                // Get master properties (all properties that are NOT units)
                $master_properties = $conn->query("SELECT id, property_name, owner_name, monthly_rent_to_owner, property_type
                    FROM properties 
                    WHERE user_id = $user_id 
                    AND (parent_property_id IS NULL OR parent_property_id = 0)
                    ORDER BY property_name");
            ?>
            <div class="content-card" style="margin-bottom: 20px; background: #ecfdf5; border-left: 4px solid #10b981;">
                <div class="card-header">
                    <h3 style="margin: 0; font-size: 16px;">🏗️ Property Type</h3>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #065f46;">Is this a unit/apartment within a master property?</p>
                </div>
                <div class="card-body" style="padding: 15px;">
            <div class="form-group">
                <label for="is_unit">
                    <input type="checkbox" id="is_unit" name="is_unit" value="1" onchange="toggleUnitFields()" <?php echo $parent_property ? 'checked' : ''; ?>>
                    This is a unit/apartment within a master property
                </label>
                <small class="text-muted">Check this if splitting a property into multiple units (e.g., villa into apartments)</small>
            </div>
                    
                    <div id="unit_fields" style="display: <?php echo $parent_property ? 'block' : 'none'; ?>; margin-top: 15px;">
                        <div class="form-group">
                            <label for="parent_property_id">Master Property *</label>
                            <select id="parent_property_id" name="parent_property_id" <?php echo $parent_property ? 'disabled' : ''; ?>>
                                <option value="">Select Master Property</option>
                                <?php while ($master = $master_properties->fetch_assoc()): ?>
                                    <option value="<?php echo $master['id']; ?>" 
                                            data-property-type="<?php echo htmlspecialchars($master['property_type'] ?? ''); ?>"
                                            <?php echo ($parent_property && $master['id'] == $parent_property['id']) ? 'selected' : ''; ?>>
                                        <?php echo htmlspecialchars($master['property_name']); ?> 
                                        <?php if (!empty($master['owner_name']) && !empty($master['monthly_rent_to_owner'])): ?>
                                            (Owner: <?php echo htmlspecialchars($master['owner_name']); ?> - <?php echo formatCurrency($master['monthly_rent_to_owner']); ?>/mo)
                                        <?php endif; ?>
                                    </option>
                                <?php endwhile; ?>
                            </select>
                            <?php if ($parent_property): ?>
                                <input type="hidden" name="parent_property_id" value="<?php echo $parent_property['id']; ?>">
                            <?php endif; ?>
                            <small class="text-muted">Select the master property to which this unit belongs</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="unit_name">Unit Name/Number *</label>
                            <input type="text" id="unit_name" name="unit_name" placeholder="e.g., Apartment 1, Unit A, Floor 2">
                            <small class="text-muted">Name or number for this unit (e.g., Apartment 1, Unit A)</small>
                        </div>
                    </div>
                </div>
            </div>
            <?php endif; ?>
            
            <div class="form-group">
                <label for="property_name">Property Name *</label>
                <input type="text" id="property_name" name="property_name" required>
                <small class="text-muted" id="property_name_help">Full property name</small>
            </div>
            
            <?php 
            if ($has_owner_fields): 
            ?>
            <div id="owner_info_card" class="content-card" style="margin-bottom: 20px; background: #fef3c7; border-left: 4px solid #f59e0b;">
                <div class="card-header">
                    <h3 style="margin: 0; font-size: 16px;">🏢 Rental Property Information</h3>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #78716c;">If this is a rental property managed for another owner (not purchased by you), fill in the owner details below</p>
                </div>
                <div class="card-body" style="padding: 15px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="owner_name">Property Owner Name</label>
                            <input type="text" id="owner_name" name="owner_name" placeholder="Name of property owner">
                            <small class="text-muted">Leave blank if you own this property</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="monthly_rent_to_owner">Monthly Rent to Owner</label>
                            <input type="number" id="monthly_rent_to_owner" name="monthly_rent_to_owner" min="0" step="0.01" placeholder="Amount paid to owner monthly">
                            <small class="text-muted">Required if property has an owner. This will be deducted from profit calculations</small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="owner_rent_start_date">Owner Rent Start Date</label>
                        <input type="date" id="owner_rent_start_date" name="owner_rent_start_date" placeholder="When owner rent payments should start">
                        <small class="text-muted">Date when owner rent payments should begin (used for generating recurring payments)</small>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="owner_email">Owner Email</label>
                            <input type="email" id="owner_email" name="owner_email" placeholder="owner@email.com">
                        </div>
                        
                        <div class="form-group">
                            <label for="owner_phone">Owner Phone</label>
                            <input type="text" id="owner_phone" name="owner_phone" placeholder="+1234567890">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="owner_contact">Owner Contact Address</label>
                        <input type="text" id="owner_contact" name="owner_contact" placeholder="Owner contact address">
                    </div>
                </div>
            </div>
            <?php endif; ?>
            
            <div id="address_location_section">
                <div id="address_field">
                    <div class="form-group">
                        <label for="address">Address *</label>
                        <input type="text" id="address" name="address" required>
                        <small class="text-muted" id="address_help">Property address</small>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="city">City *</label>
                        <input type="text" id="city" name="city" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="state">State</label>
                        <input type="text" id="state" name="state">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="zip_code">Zip Code</label>
                        <input type="text" id="zip_code" name="zip_code">
                    </div>
                    
                    <div class="form-group">
                        <label for="country">Country</label>
                        <input type="text" id="country" name="country" value="USA">
                    </div>
                </div>
            </div>
            
            <div id="property_type_status_section">
                <div class="form-row">
                    <div class="form-group">
                        <label for="property_type">Property Type *</label>
                        <select id="property_type" name="property_type" required onchange="toggleCustomPropertyType()">
                            <option value="">Select Type</option>
                            <option value="Apartment" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Apartment') ? 'selected' : ''; ?>>Apartment</option>
                            <option value="Villa" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Villa') ? 'selected' : ''; ?>>Villa</option>
                            <option value="House" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'House') ? 'selected' : ''; ?>>House</option>
                            <option value="Condo" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Condo') ? 'selected' : ''; ?>>Condo</option>
                            <option value="Townhouse" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Townhouse') ? 'selected' : ''; ?>>Townhouse</option>
                            <option value="Studio" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Studio') ? 'selected' : ''; ?>>Studio</option>
                            <option value="Penthouse" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Penthouse') ? 'selected' : ''; ?>>Penthouse</option>
                            <option value="Commercial" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Commercial') ? 'selected' : ''; ?>>Commercial</option>
                            <option value="Office" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Office') ? 'selected' : ''; ?>>Office</option>
                            <option value="Shop" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Shop') ? 'selected' : ''; ?>>Shop</option>
                            <option value="Warehouse" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Warehouse') ? 'selected' : ''; ?>>Warehouse</option>
                            <option value="Land" <?php echo (isset($parent_property) && $parent_property && $parent_property['property_type'] == 'Land') ? 'selected' : ''; ?>>Land</option>
                            <option value="Other" <?php echo (isset($parent_property) && $parent_property && !in_array($parent_property['property_type'], ['Apartment', 'Villa', 'House', 'Condo', 'Townhouse', 'Studio', 'Penthouse', 'Commercial', 'Office', 'Shop', 'Warehouse', 'Land'])) ? 'selected' : ''; ?>>Other (Custom)</option>
                        </select>
                        <div id="custom_property_type_container" style="display: none; margin-top: 8px;">
                            <input type="text" id="custom_property_type" name="custom_property_type" placeholder="Enter custom property type" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <small class="text-muted">Enter a custom property type if not listed above</small>
                        </div>
                        <small class="text-muted"><?php echo $parent_property ? 'You can override the parent property type if needed' : 'Select the type of property or enter a custom type'; ?></small>
                    </div>
                    
                    <div class="form-group">
                        <label for="status">Status *</label>
                        <select id="status" name="status" required>
                            <option value="Vacant">Vacant</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Under Maintenance">Under Maintenance</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="bedrooms">Bedrooms</label>
                    <input type="number" id="bedrooms" name="bedrooms" min="0">
                </div>
                
                <div class="form-group">
                    <label for="bathrooms">Bathrooms</label>
                    <input type="number" id="bathrooms" name="bathrooms" min="0" step="0.5">
                </div>
                
                <div class="form-group">
                    <label for="square_feet">Square Feet</label>
                    <input type="number" id="square_feet" name="square_feet" min="0">
                </div>
            </div>
            
            <div id="purchase_info_section" class="content-card" style="margin-bottom: 20px; background: #dbeafe; border-left: 4px solid #3b82f6;">
                <div class="card-header">
                    <h3 style="margin: 0; font-size: 16px;">💰 Purchase Information (Optional)</h3>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #475569;">Fill this section if YOU purchased/own this property. Leave blank for rental properties managed for others.</p>
                </div>
                <div class="card-body" style="padding: 15px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="purchase_price">Purchase Price</label>
                            <input type="number" id="purchase_price" name="purchase_price" min="0" step="0.01" placeholder="Price you paid for the property">
                            <small class="text-muted">Leave blank if this is a rental property (not purchased)</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="current_value">Current Value</label>
                            <input type="number" id="current_value" name="current_value" min="0" step="0.01" placeholder="Current market value">
                        </div>
                        
                        <div class="form-group">
                            <label for="purchase_date">Purchase Date</label>
                            <input type="date" id="purchase_date" name="purchase_date">
                        </div>
                    </div>
                </div>
            </div>
            
            <?php 
            // Check if default_rent column exists
            $check_column = $conn->query("SHOW COLUMNS FROM properties LIKE 'default_rent'");
            $has_default_rent = $check_column->num_rows > 0;
            if ($has_default_rent): 
            ?>
            <div class="form-group">
                <label for="default_rent">Default Monthly Rent</label>
                <input type="number" id="default_rent" name="default_rent" min="0" step="0.01" placeholder="Default rent for this property">
                <small class="text-muted">This will be suggested when adding tenants to this property</small>
            </div>
            <?php else: ?>
            <div class="alert alert-info">
                <strong>Note:</strong> To use default rent feature, please run the migration: 
                <a href="../database/migrate.php" target="_blank">Add default_rent column</a>
            </div>
            <?php endif; ?>
            
            <?php 
            // Check if contact_number column exists
            $check_contact_field = $conn->query("SHOW COLUMNS FROM properties LIKE 'contact_number'");
            $has_contact_field = $check_contact_field->num_rows > 0;
            // Show contact number field for units or if column exists
            $show_contact_field = $has_contact_field || $is_unit || $parent_property;
            if ($show_contact_field): 
            ?>
            <div class="form-group">
                <label for="contact_number">Contact Number (for Landing Page)</label>
                <input type="text" id="contact_number" name="contact_number" placeholder="e.g., +974 1234 5678" value="<?php echo isset($parent_property['contact_number']) ? htmlspecialchars($parent_property['contact_number']) : ''; ?>">
                <small class="text-muted">This number will be displayed on the landing page with WhatsApp and Call buttons for this unit</small>
            </div>
            <?php endif; ?>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="4"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Add Property</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<script>
function toggleUnitFields() {
    const isUnit = document.getElementById('is_unit').checked;
    const unitFields = document.getElementById('unit_fields');
    const propertyNameInput = document.getElementById('property_name');
    const propertyNameHelp = document.getElementById('property_name_help');
    const addressField = document.getElementById('address_field');
    const addressHelp = document.getElementById('address_help');
    const addressLocationSection = document.getElementById('address_location_section');
    const propertyTypeStatusSection = document.getElementById('property_type_status_section');
    const ownerInfoCard = document.getElementById('owner_info_card');
    const purchaseInfoSection = document.getElementById('purchase_info_section');
    
    if (isUnit) {
        unitFields.style.display = 'block';
        propertyNameHelp.textContent = 'Unit name (e.g., Apartment 1, Unit A)';
        
        // Hide sections for units - they inherit from master property
        if (addressLocationSection) addressLocationSection.style.display = 'none';
        // Keep property_type_status_section visible for units so they can set their own property type
        // if (propertyTypeStatusSection) propertyTypeStatusSection.style.display = 'none';
        if (ownerInfoCard) ownerInfoCard.style.display = 'none';
        if (purchaseInfoSection) purchaseInfoSection.style.display = 'none';
        
        // Make address fields optional since they're hidden (check if elements exist)
        const addressEl = document.getElementById('address');
        const cityEl = document.getElementById('city');
        const propertyTypeEl = document.getElementById('property_type');
        const statusEl = document.getElementById('status');
        if (addressEl) addressEl.required = false;
        if (cityEl) cityEl.required = false;
        // Keep property_type required for units
        // if (propertyTypeEl) propertyTypeEl.required = false;
        if (statusEl) statusEl.required = false;
        
        // Make unit fields required
        const parentPropertyEl = document.getElementById('parent_property_id');
        const unitNameEl = document.getElementById('unit_name');
        if (parentPropertyEl) {
            // Only set required if not disabled (when coming from parent link, it's disabled)
            if (!parentPropertyEl.disabled) {
                parentPropertyEl.required = true;
            }
        }
        if (unitNameEl) unitNameEl.required = true;
    } else {
        unitFields.style.display = 'none';
        propertyNameHelp.textContent = 'Full property name';
        
        // Show sections for master properties
        if (addressLocationSection) addressLocationSection.style.display = 'block';
        if (propertyTypeStatusSection) propertyTypeStatusSection.style.display = 'block';
        if (ownerInfoCard) ownerInfoCard.style.display = 'block';
        if (purchaseInfoSection) purchaseInfoSection.style.display = 'block';
        
        // Make fields required again (check if elements exist)
        const addressEl = document.getElementById('address');
        const cityEl = document.getElementById('city');
        const propertyTypeEl = document.getElementById('property_type');
        const statusEl = document.getElementById('status');
        if (addressEl) addressEl.required = true;
        if (cityEl) cityEl.required = true;
        if (propertyTypeEl) propertyTypeEl.required = true;
        if (statusEl) statusEl.required = true;
        
        // Make unit fields optional and clear them
        const parentPropertyEl = document.getElementById('parent_property_id');
        const unitNameEl = document.getElementById('unit_name');
        if (parentPropertyEl) {
            parentPropertyEl.required = false;
            parentPropertyEl.value = '';
        }
        if (unitNameEl) {
            unitNameEl.required = false;
            unitNameEl.value = '';
        }
    }
}

// Function to toggle custom property type input
function toggleCustomPropertyType() {
    const propertyTypeSelect = document.getElementById('property_type');
    const customContainer = document.getElementById('custom_property_type_container');
    const customInput = document.getElementById('custom_property_type');
    
    if (!propertyTypeSelect || !customContainer) return;
    
    if (propertyTypeSelect.value === 'Other') {
        customContainer.style.display = 'block';
        if (customInput) {
            customInput.required = true;
        }
    } else {
        customContainer.style.display = 'none';
        if (customInput) {
            customInput.required = false;
            // Only clear if switching away from Other
            if (propertyTypeSelect.value && propertyTypeSelect.value !== 'Other') {
                customInput.value = '';
            }
        }
    }
}

// Function to update property type when parent property is selected
function updatePropertyTypeFromParent() {
    const parentSelect = document.getElementById('parent_property_id');
    const propertyTypeSelect = document.getElementById('property_type');
    
    if (!parentSelect || !propertyTypeSelect) return;
    
    parentSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const propertyType = selectedOption ? selectedOption.getAttribute('data-property-type') : '';
        
        if (propertyType && propertyTypeSelect) {
            // Check if the property type is in the predefined list
            const predefinedTypes = ['Apartment', 'Villa', 'House', 'Condo', 'Townhouse', 'Studio', 'Penthouse', 'Commercial', 'Office', 'Shop', 'Warehouse', 'Land'];
            if (predefinedTypes.includes(propertyType)) {
                propertyTypeSelect.value = propertyType;
            } else {
                // If it's a custom type, set to "Other" and fill the custom input
                propertyTypeSelect.value = 'Other';
                const customInput = document.getElementById('custom_property_type');
                if (customInput) {
                    customInput.value = propertyType;
                }
            }
            toggleCustomPropertyType();
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    toggleUnitFields();
    toggleCustomPropertyType();
    updatePropertyTypeFromParent();
    
    // Add form validation before submit
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const propertyTypeSelect = document.getElementById('property_type');
            const customInput = document.getElementById('custom_property_type');
            
            if (propertyTypeSelect && propertyTypeSelect.value === 'Other') {
                if (!customInput || !customInput.value || customInput.value.trim() === '') {
                    e.preventDefault();
                    alert('Please enter a custom property type');
                    if (customInput) {
                        customInput.focus();
                    }
                    return false;
                }
            }
        });
    }
    
    // Re-run toggleCustomPropertyType after a short delay to ensure DOM is ready
    setTimeout(toggleCustomPropertyType, 100);
});
</script>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>
