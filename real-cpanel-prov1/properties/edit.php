<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header('Location: index.php');
    exit();
}

$property_id = intval($_GET['id']);
$error = '';

// Get property details
$stmt = $conn->prepare("SELECT * FROM properties WHERE id = ? AND user_id = ?");
$stmt->bind_param("ii", $property_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    header('Location: index.php');
    exit();
}

$property = $result->fetch_assoc();
$stmt->close();

// Check if unit fields exist
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

// Get parent property if this is a unit
$parent_property = null;
if ($has_unit_fields && !empty($property['parent_property_id'])) {
    $parent_result = $conn->query("SELECT * FROM properties WHERE id = {$property['parent_property_id']} AND user_id = $user_id");
    if ($parent_result && $parent_result->num_rows > 0) {
        $parent_property = $parent_result->fetch_assoc();
    }
}

// Get units if this is a master property
$units = null;
if ($has_unit_fields && empty($property['parent_property_id'])) {
    $units = $conn->query("SELECT id, property_name, unit_name, status FROM properties WHERE parent_property_id = $property_id ORDER BY unit_name");
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $property_name = sanitizeInput($_POST['property_name'] ?? '');
    $address = sanitizeInput($_POST['address'] ?? '');
    $city = sanitizeInput($_POST['city'] ?? '');
    $state = sanitizeInput($_POST['state'] ?? '');
    $zip_code = sanitizeInput($_POST['zip_code'] ?? '');
    $country = sanitizeInput($_POST['country'] ?? '');
    $property_type = $_POST['property_type'] ?? '';
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
    $status = $_POST['status'] ?? 'Vacant';
    $contact_number = !empty($_POST['contact_number']) ? sanitizeInput($_POST['contact_number']) : null;
    $notes = sanitizeInput($_POST['notes'] ?? '');
    
    // Unit fields
    $parent_property_id = !empty($_POST['parent_property_id']) ? intval($_POST['parent_property_id']) : null;
    $unit_name = !empty($_POST['unit_name']) ? sanitizeInput($_POST['unit_name']) : null;
    $is_unit = !empty($_POST['is_unit']) ? 1 : 0;
    
    // Check if this is a unit - units don't need address/location fields
    $is_unit_current = $has_unit_fields && !empty($property['is_unit']) && $property['is_unit'];
    
    if (empty($property_name)) {
        $error = 'Please fill in property name';
    } else if (empty($property_type) || ($property_type == 'Other' && empty($_POST['custom_property_type']))) {
        $error = 'Please select a property type or enter a custom type';
    } else if (!$is_unit_current && (empty($address) || empty($city))) {
        $error = 'Please fill in all required fields';
    } else {
        // Check which columns exist
        $check_default_rent = $conn->query("SHOW COLUMNS FROM properties LIKE 'default_rent'");
        $has_default_rent = $check_default_rent->num_rows > 0;
        $check_owner_name = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
        $has_owner_fields = $check_owner_name->num_rows > 0;
        $check_contact = $conn->query("SHOW COLUMNS FROM properties LIKE 'contact_number'");
        $has_contact_number = $check_contact->num_rows > 0;
        
        // Add contact_number column if it doesn't exist
        if (!$has_contact_number) {
            $conn->query("ALTER TABLE properties ADD COLUMN contact_number VARCHAR(20) DEFAULT NULL AFTER notes");
            $has_contact_number = true;
        }
        
        // Build UPDATE statement - add contact_number if column exists
        $update_fields = [];
        $update_values = [];
        $update_types = "";
        
        // Always include these fields
        if ($has_unit_fields) {
            $update_fields[] = "parent_property_id = ?";
            $update_fields[] = "unit_name = ?";
            $update_fields[] = "is_unit = ?";
            $update_values[] = $parent_property_id;
            $update_values[] = $unit_name;
            $update_values[] = $is_unit;
            // Types: i(parent_property_id) + s(unit_name) + i(is_unit) = "isi"
            $update_types .= "isi";
        }
        
        if ($has_owner_fields && !$is_unit_current) {
            $update_fields[] = "owner_name = ?";
            $update_fields[] = "owner_contact = ?";
            $update_fields[] = "owner_email = ?";
            $update_fields[] = "owner_phone = ?";
            $update_fields[] = "monthly_rent_to_owner = ?";
            $update_values[] = $owner_name;
            $update_values[] = $owner_contact;
            $update_values[] = $owner_email;
            $update_values[] = $owner_phone;
            $update_values[] = $monthly_rent_to_owner;
            $update_types .= "ssssd";
        }
        
        $update_fields[] = "property_name = ?";
        $update_fields[] = "address = ?";
        $update_fields[] = "city = ?";
        $update_fields[] = "state = ?";
        $update_fields[] = "zip_code = ?";
        $update_fields[] = "country = ?";
        $update_fields[] = "property_type = ?";
        $update_fields[] = "bedrooms = ?";
        $update_fields[] = "bathrooms = ?";
        $update_fields[] = "square_feet = ?";
        $update_fields[] = "purchase_price = ?";
        $update_fields[] = "current_value = ?";
        $update_fields[] = "purchase_date = ?";
        // Types: s(property_name) + s(address) + s(city) + s(state) + s(zip_code) + s(country) + s(property_type) + i(bedrooms) + d(bathrooms) + i(square_feet) + d(purchase_price) + d(current_value) + s(purchase_date) = 13 chars
        $update_values = array_merge($update_values, [$property_name, $address, $city, $state, $zip_code, $country, $property_type, $bedrooms, $bathrooms, $square_feet, $purchase_price, $current_value, $purchase_date]);
        $update_types .= "sssssssidddds";
        
        if ($has_default_rent) {
            $update_fields[] = "default_rent = ?";
            $update_values[] = $default_rent;
            $update_types .= "d";
        }
        
        $update_fields[] = "status = ?";
        $update_values[] = $status;
        $update_types .= "s";
        
        // Add contact_number if column exists
        if ($has_contact_number) {
            $update_fields[] = "contact_number = ?";
            $update_values[] = $contact_number;
            $update_types .= "s";
        }
        
        $update_fields[] = "notes = ?";
        $update_values[] = $notes;
        $update_types .= "s";
        
        // Add WHERE clause params
        $update_values[] = $property_id;
        $update_values[] = $user_id;
        $update_types .= "ii";
        
        $sql = "UPDATE properties SET " . implode(", ", $update_fields) . " WHERE id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        
        // Safety check: verify type string length matches number of values
        $type_count = strlen($update_types);
        $value_count = count($update_values);
        if ($type_count !== $value_count) {
            $error = "Database error: Type count ($type_count) doesn't match value count ($value_count). Please contact support.";
            error_log("Properties edit error: Type count mismatch. Types: $update_types. SQL: $sql");
            $stmt->close();
        } else {
            $stmt->bind_param($update_types, ...$update_values);
            
            if ($stmt->execute()) {
                // Regenerate owner payments if owner rent was added or changed
                if ($has_owner_fields && !empty($owner_name) && !empty($monthly_rent_to_owner) && $monthly_rent_to_owner > 0) {
                    // Check if owner_payments table exists
                    $check_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
                    if ($check_table->num_rows > 0) {
                        require_once '../includes/recurring_owner_payments.php';
                        // Delete future pending payments and regenerate
                        $today = date('Y-m-01');
                        $conn->query("DELETE FROM owner_payments WHERE property_id = $property_id AND payment_month >= '$today' AND status = 'Pending'");
                        generateRecurringOwnerPayments($property_id, $conn);
                    }
                }
                
                header('Location: index.php?updated=1');
                exit();
            } else {
                $error = 'Error updating property. Please try again.';
            }
            
            $stmt->close();
        }
    }
}

$page_title = 'Edit Property';
include '../includes/header.php';

// Check if owner fields exist (after header to keep connection open)
$check_owner = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner_fields = $check_owner->num_rows > 0;

// Check if this is a unit
$is_unit_current = $has_unit_fields && (!empty($property['is_unit']) && $property['is_unit'] || !empty($property['parent_property_id']));
?>

<div class="page-actions">
    <h1>Edit Property</h1>
    <a href="index.php" class="btn-link">← Back to Properties</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <?php 
            if ($has_unit_fields):
                // Get master properties (all properties that are NOT units)
                $master_properties_edit = $conn->query("SELECT id, property_name, owner_name, monthly_rent_to_owner, property_type
                    FROM properties 
                    WHERE user_id = $user_id 
                    AND id != $property_id
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
                            <input type="checkbox" id="is_unit" name="is_unit" value="1" onchange="toggleUnitFields()" <?php echo (!empty($property['is_unit']) && $property['is_unit']) ? 'checked' : ''; ?>>
                            This is a unit/apartment within a master property
                        </label>
                        <small class="text-muted">Check this if splitting a property into multiple units (e.g., villa into apartments)</small>
                    </div>
                    
                    <div id="unit_fields" style="display: <?php echo (!empty($property['is_unit']) && $property['is_unit']) ? 'block' : 'none'; ?>; margin-top: 15px;">
                        <div class="form-group">
                            <label for="parent_property_id">Master Property *</label>
                            <select id="parent_property_id" name="parent_property_id">
                                <option value="">Select Master Property</option>
                                <?php while ($master = $master_properties_edit->fetch_assoc()): ?>
                                    <option value="<?php echo $master['id']; ?>" 
                                            data-property-type="<?php echo htmlspecialchars($master['property_type'] ?? ''); ?>"
                                            <?php echo ($property['parent_property_id'] == $master['id']) ? 'selected' : ''; ?>>
                                        <?php echo htmlspecialchars($master['property_name']); ?> 
                                        <?php if (!empty($master['owner_name']) && !empty($master['monthly_rent_to_owner'])): ?>
                                            (Owner: <?php echo htmlspecialchars($master['owner_name']); ?> - <?php echo formatCurrency($master['monthly_rent_to_owner']); ?>/mo)
                                        <?php endif; ?>
                                    </option>
                                <?php endwhile; ?>
                            </select>
                            <small class="text-muted">Select the master property to which this unit belongs</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="unit_name">Unit Name/Number</label>
                            <input type="text" id="unit_name" name="unit_name" value="<?php echo htmlspecialchars($property['unit_name'] ?? ''); ?>" placeholder="e.g., Apartment 1, Unit A, Floor 2">
                            <small class="text-muted">Name or number for this unit (e.g., Apartment 1, Unit A)</small>
                        </div>
                    </div>
                </div>
            </div>
            <?php endif; ?>
            
            <div class="form-group">
                <label for="property_name">Property Name *</label>
                <input type="text" id="property_name" name="property_name" value="<?php echo htmlspecialchars($property['property_name']); ?>" required>
                <small class="text-muted" id="property_name_help"><?php echo (!empty($property['is_unit']) && $property['is_unit']) ? 'Unit name (e.g., Apartment 1, Unit A)' : 'Full property name'; ?></small>
            </div>
            
            <?php 
            // Hide owner fields if this is a unit (inherited from parent)
            $is_unit_current = $has_unit_fields && !empty($property['is_unit']) && $property['is_unit'];
            if ($has_owner_fields && !$is_unit_current): 
            ?>
            <div class="content-card" style="margin-bottom: 20px; background: #fef3c7; border-left: 4px solid #f59e0b;">
                <div class="card-header">
                    <h3 style="margin: 0; font-size: 16px;">🏢 Rental Property Information</h3>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #78716c;">If this is a rental property managed for another owner (not purchased by you), fill in the owner details below</p>
                </div>
                <div class="card-body" style="padding: 15px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="owner_name">Property Owner Name</label>
                            <input type="text" id="owner_name" name="owner_name" value="<?php echo htmlspecialchars($property['owner_name'] ?? ''); ?>" placeholder="Name of property owner">
                            <small class="text-muted">Leave blank if you own this property</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="monthly_rent_to_owner">Monthly Rent to Owner</label>
                            <input type="number" id="monthly_rent_to_owner" name="monthly_rent_to_owner" min="0" step="0.01" value="<?php echo $property['monthly_rent_to_owner'] ?? ''; ?>" placeholder="Amount paid to owner monthly">
                            <small class="text-muted">Required if property has an owner. This will be deducted from profit calculations</small>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="owner_email">Owner Email</label>
                            <input type="email" id="owner_email" name="owner_email" value="<?php echo htmlspecialchars($property['owner_email'] ?? ''); ?>" placeholder="owner@email.com">
                        </div>
                        
                        <div class="form-group">
                            <label for="owner_phone">Owner Phone</label>
                            <input type="text" id="owner_phone" name="owner_phone" value="<?php echo htmlspecialchars($property['owner_phone'] ?? ''); ?>" placeholder="+1234567890">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="owner_contact">Owner Contact Address</label>
                        <input type="text" id="owner_contact" name="owner_contact" value="<?php echo htmlspecialchars($property['owner_contact'] ?? ''); ?>" placeholder="Owner contact address">
                    </div>
                </div>
            </div>
            <?php elseif ($has_owner_fields && $is_unit_current && $parent_property): ?>
            <div class="alert alert-info">
                <strong>Unit Property:</strong> Owner information is inherited from master property: 
                <strong><?php echo htmlspecialchars($parent_property['property_name']); ?></strong>
                (Owner: <?php echo htmlspecialchars($parent_property['owner_name']); ?> - 
                Rent: <?php echo formatCurrency($parent_property['monthly_rent_to_owner']); ?>/month)
            </div>
            <?php endif; ?>
            
            <?php if (!$is_unit_current): ?>
            <div id="address_location_section">
                <div class="form-group">
                    <label for="address">Address *</label>
                    <input type="text" id="address" name="address" value="<?php echo htmlspecialchars($property['address']); ?>" required>
                    <small class="text-muted" id="address_help">Property address</small>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="city">City *</label>
                        <input type="text" id="city" name="city" value="<?php echo htmlspecialchars($property['city']); ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="state">State</label>
                        <input type="text" id="state" name="state" value="<?php echo htmlspecialchars($property['state'] ?? ''); ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="zip_code">Zip Code</label>
                        <input type="text" id="zip_code" name="zip_code" value="<?php echo htmlspecialchars($property['zip_code'] ?? ''); ?>">
                    </div>
                    
                    <div class="form-group">
                        <label for="country">Country</label>
                        <input type="text" id="country" name="country" value="<?php echo htmlspecialchars($property['country'] ?? 'USA'); ?>">
                    </div>
                </div>
            </div>
            <?php endif; ?>
            
            <div id="property_type_status_section">
                <div class="form-row">
                    <div class="form-group">
                        <label for="property_type">Property Type *</label>
                        <?php 
                        // Check if current property_type is in predefined list
                        $predefined_types = ['Apartment', 'Villa', 'House', 'Condo', 'Townhouse', 'Studio', 'Penthouse', 'Commercial', 'Office', 'Shop', 'Warehouse', 'Land'];
                        $current_type = $property['property_type'] ?? '';
                        $is_custom_type = !empty($current_type) && !in_array($current_type, $predefined_types);
                        $show_custom_input = $is_custom_type;
                        ?>
                        <select id="property_type" name="property_type" required onchange="toggleCustomPropertyType()">
                            <option value="">Select Type</option>
                            <option value="Apartment" <?php echo $current_type == 'Apartment' ? 'selected' : ''; ?>>Apartment</option>
                            <option value="Villa" <?php echo $current_type == 'Villa' ? 'selected' : ''; ?>>Villa</option>
                            <option value="House" <?php echo $current_type == 'House' ? 'selected' : ''; ?>>House</option>
                            <option value="Condo" <?php echo $current_type == 'Condo' ? 'selected' : ''; ?>>Condo</option>
                            <option value="Townhouse" <?php echo $current_type == 'Townhouse' ? 'selected' : ''; ?>>Townhouse</option>
                            <option value="Studio" <?php echo $current_type == 'Studio' ? 'selected' : ''; ?>>Studio</option>
                            <option value="Penthouse" <?php echo $current_type == 'Penthouse' ? 'selected' : ''; ?>>Penthouse</option>
                            <option value="Commercial" <?php echo $current_type == 'Commercial' ? 'selected' : ''; ?>>Commercial</option>
                            <option value="Office" <?php echo $current_type == 'Office' ? 'selected' : ''; ?>>Office</option>
                            <option value="Shop" <?php echo $current_type == 'Shop' ? 'selected' : ''; ?>>Shop</option>
                            <option value="Warehouse" <?php echo $current_type == 'Warehouse' ? 'selected' : ''; ?>>Warehouse</option>
                            <option value="Land" <?php echo $current_type == 'Land' ? 'selected' : ''; ?>>Land</option>
                            <option value="Other" <?php echo $is_custom_type ? 'selected' : ''; ?>>Other (Custom)</option>
                        </select>
                        <div id="custom_property_type_container" style="display: <?php echo $show_custom_input ? 'block' : 'none'; ?>; margin-top: 8px;">
                            <input type="text" id="custom_property_type" name="custom_property_type" value="<?php echo $is_custom_type ? htmlspecialchars($current_type) : ''; ?>" placeholder="Enter custom property type" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <small class="text-muted">Enter a custom property type if not listed above</small>
                        </div>
                        <small class="text-muted"><?php echo $is_unit_current && $parent_property ? 'You can override the parent property type if needed' : 'Select the type of property or enter a custom type'; ?></small>
                    </div>
                    
                    <div class="form-group">
                        <label for="status">Status *</label>
                        <select id="status" name="status" required>
                            <option value="Vacant" <?php echo $property['status'] == 'Vacant' ? 'selected' : ''; ?>>Vacant</option>
                            <option value="Occupied" <?php echo $property['status'] == 'Occupied' ? 'selected' : ''; ?>>Occupied</option>
                            <option value="Under Maintenance" <?php echo $property['status'] == 'Under Maintenance' ? 'selected' : ''; ?>>Under Maintenance</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="bedrooms">Bedrooms</label>
                    <input type="number" id="bedrooms" name="bedrooms" value="<?php echo $property['bedrooms'] ?? ''; ?>" min="0">
                </div>
                
                <div class="form-group">
                    <label for="bathrooms">Bathrooms</label>
                    <input type="number" id="bathrooms" name="bathrooms" value="<?php echo $property['bathrooms'] ?? ''; ?>" min="0" step="0.5">
                </div>
                
                <div class="form-group">
                    <label for="square_feet">Square Feet</label>
                    <input type="number" id="square_feet" name="square_feet" value="<?php echo $property['square_feet'] ?? ''; ?>" min="0">
                </div>
            </div>
            
            <?php if (!$is_unit_current): ?>
            <div id="purchase_info_section" class="content-card" style="margin-bottom: 20px; background: #dbeafe; border-left: 4px solid #3b82f6;">
                <div class="card-header">
                    <h3 style="margin: 0; font-size: 16px;">💰 Purchase Information (Optional)</h3>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #475569;">Fill this section if YOU purchased/own this property. Leave blank for rental properties managed for others.</p>
                </div>
                <div class="card-body" style="padding: 15px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="purchase_price">Purchase Price</label>
                            <input type="number" id="purchase_price" name="purchase_price" value="<?php echo $property['purchase_price'] ?? ''; ?>" min="0" step="0.01" placeholder="Price you paid for the property">
                            <small class="text-muted">Leave blank if this is a rental property (not purchased)</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="current_value">Current Value</label>
                            <input type="number" id="current_value" name="current_value" value="<?php echo $property['current_value'] ?? ''; ?>" min="0" step="0.01" placeholder="Current market value">
                        </div>
                        
                        <div class="form-group">
                            <label for="purchase_date">Purchase Date</label>
                            <input type="date" id="purchase_date" name="purchase_date" value="<?php echo $property['purchase_date'] ?? ''; ?>">
                        </div>
                    </div>
                </div>
            </div>
            <?php endif; ?>
            
            <?php 
            // Check if default_rent column exists
            $check_column = $conn->query("SHOW COLUMNS FROM properties LIKE 'default_rent'");
            $has_default_rent = $check_column->num_rows > 0;
            if ($has_default_rent): 
            ?>
            <div class="form-group">
                <label for="default_rent">Default Monthly Rent</label>
                <input type="number" id="default_rent" name="default_rent" min="0" step="0.01" value="<?php echo $property['default_rent'] ?? ''; ?>" placeholder="Default rent for this property">
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
            $show_contact_field = $has_contact_field || $is_unit_current;
            if ($show_contact_field): 
            ?>
            <div class="form-group">
                <label for="contact_number">Contact Number (for Landing Page)</label>
                <input type="text" id="contact_number" name="contact_number" placeholder="e.g., +974 1234 5678" value="<?php echo htmlspecialchars($property['contact_number'] ?? ''); ?>">
                <small class="text-muted">This number will be displayed on the landing page with WhatsApp and Call buttons for this unit</small>
            </div>
            <?php endif; ?>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="4"><?php echo htmlspecialchars($property['notes'] ?? ''); ?></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Property</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<script>
function toggleUnitFields() {
    const isUnit = document.getElementById('is_unit').checked;
    const unitFields = document.getElementById('unit_fields');
    const propertyNameHelp = document.getElementById('property_name_help');
    const addressHelp = document.getElementById('address_help');
    const addressLocationSection = document.getElementById('address_location_section');
    const propertyTypeStatusSection = document.getElementById('property_type_status_section');
    const ownerInfoCard = document.querySelector('[id*="owner"]')?.closest('.content-card');
    const purchaseInfoSection = document.getElementById('purchase_info_section');
    
    if (isUnit) {
        unitFields.style.display = 'block';
        if (propertyNameHelp) propertyNameHelp.textContent = 'Unit name (e.g., Apartment 1, Unit A)';
        if (addressHelp) addressHelp.textContent = 'Unit address (can be same as master property)';
        
        // Hide address section for units
        if (addressLocationSection) addressLocationSection.style.display = 'none';
        // Keep property_type_status_section visible for units
        // if (propertyTypeStatusSection) propertyTypeStatusSection.style.display = 'none';
        if (purchaseInfoSection) purchaseInfoSection.style.display = 'none';
        
        const addressEl = document.getElementById('address');
        const cityEl = document.getElementById('city');
        const propertyTypeEl = document.getElementById('property_type');
        const statusEl = document.getElementById('status');
        if (addressEl) addressEl.required = false;
        if (cityEl) cityEl.required = false;
        // Keep property_type required for units
        // if (propertyTypeEl) propertyTypeEl.required = false;
        if (statusEl) statusEl.required = false;
    } else {
        unitFields.style.display = 'none';
        if (propertyNameHelp) propertyNameHelp.textContent = 'Full property name';
        if (addressHelp) addressHelp.textContent = 'Property address';
        
        // Show sections for master properties
        if (addressLocationSection) addressLocationSection.style.display = 'block';
        if (propertyTypeStatusSection) propertyTypeStatusSection.style.display = 'block';
        if (purchaseInfoSection) purchaseInfoSection.style.display = 'block';
        
        const addressEl = document.getElementById('address');
        const cityEl = document.getElementById('city');
        const propertyTypeEl = document.getElementById('property_type');
        const statusEl = document.getElementById('status');
        if (addressEl) addressEl.required = true;
        if (cityEl) cityEl.required = true;
        if (propertyTypeEl) propertyTypeEl.required = true;
        if (statusEl) statusEl.required = true;
        
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
