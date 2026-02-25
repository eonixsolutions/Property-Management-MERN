<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header('Location: index.php');
    exit();
}

$tenant_id = intval($_GET['id']);
$error = '';

// Get tenant details
$tenant = $conn->query("SELECT t.*, p.property_name
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE t.id = $tenant_id AND p.user_id = $user_id")->fetch_assoc();

if (!$tenant) {
    header('Location: index.php');
    exit();
}

// Get properties for dropdown
$properties_result = getPropertiesForDropdown($conn, $user_id);

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $property_id = intval($_POST['property_id']);
    $first_name = sanitizeInput($_POST['first_name']);
    $last_name = sanitizeInput($_POST['last_name']);
    $email = sanitizeInput($_POST['email']);
    $phone = sanitizeInput($_POST['phone']);
    $alternate_phone = sanitizeInput($_POST['alternate_phone']);
    $qatar_id = sanitizeInput($_POST['qatar_id']);
    $move_in_date = !empty($_POST['move_in_date']) ? $_POST['move_in_date'] : null;
    $lease_start = !empty($_POST['lease_start']) ? $_POST['lease_start'] : null;
    $lease_end = !empty($_POST['lease_end']) ? $_POST['lease_end'] : null;
    $monthly_rent = floatval($_POST['monthly_rent']);
    $security_deposit = !empty($_POST['security_deposit']) ? floatval($_POST['security_deposit']) : null;
    $status = $_POST['status'];
    $emergency_contact_name = sanitizeInput($_POST['emergency_contact_name']);
    $emergency_contact_phone = sanitizeInput($_POST['emergency_contact_phone']);
    $notes = sanitizeInput($_POST['notes']);
    
    if (empty($property_id) || empty($first_name) || empty($last_name) || empty($monthly_rent)) {
        $error = 'Please fill in all required fields';
    } else {
        // Get old tenant data to check if dates or status changed
        $old_tenant_result = $conn->query("SELECT property_id as old_property_id, lease_start, lease_end, status FROM tenants WHERE id = $tenant_id");
        $old_tenant = $old_tenant_result ? $old_tenant_result->fetch_assoc() : null;
        $old_property_id = $old_tenant ? $old_tenant['old_property_id'] : $property_id;
        $old_status = $old_tenant ? $old_tenant['status'] : $status;
        $status_changed = $old_status != $status;
        $property_changed = $old_property_id != $property_id;
        $dates_changed = $old_tenant ? (($old_tenant['lease_start'] != $lease_start) || ($old_tenant['lease_end'] != $lease_end) || $status_changed) : false;
        
        // Check if qatar_id column exists
        $check_qatar_id = $conn->query("SHOW COLUMNS FROM tenants LIKE 'qatar_id'");
        $has_qatar_id = $check_qatar_id->num_rows > 0;
        
        if ($has_qatar_id) {
            // 17 parameters: i(property_id) + s(6 strings: first,last,email,phone,alt_phone,qatar) + s(3 dates) + d(2 decimals) + s(4 strings: status,emergency_name,emergency_phone,notes) + i(tenant_id)
            // Type string breakdown: i + s(6) + s(3) + d(2) + s(4) + i = "isssssssssddssssi" (17 chars)
            $stmt = $conn->prepare("UPDATE tenants SET property_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, alternate_phone = ?, qatar_id = ?, move_in_date = ?, lease_start = ?, lease_end = ?, monthly_rent = ?, security_deposit = ?, status = ?, emergency_contact_name = ?, emergency_contact_phone = ?, notes = ? WHERE id = ?");
            $stmt->bind_param("isssssssssddssssi", $property_id, $first_name, $last_name, $email, $phone, $alternate_phone, $qatar_id, $move_in_date, $lease_start, $lease_end, $monthly_rent, $security_deposit, $status, $emergency_contact_name, $emergency_contact_phone, $notes, $tenant_id);
        } else {
            // 16 parameters: i(property_id) + s(5 strings) + s(3 dates) + d(2 decimals) + s(4 strings) + i(tenant_id)
            // Type string: "issssssssddssssi" = 16 characters
            $stmt = $conn->prepare("UPDATE tenants SET property_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, alternate_phone = ?, move_in_date = ?, lease_start = ?, lease_end = ?, monthly_rent = ?, security_deposit = ?, status = ?, emergency_contact_name = ?, emergency_contact_phone = ?, notes = ? WHERE id = ?");
            $stmt->bind_param("issssssssddssssi", $property_id, $first_name, $last_name, $email, $phone, $alternate_phone, $move_in_date, $lease_start, $lease_end, $monthly_rent, $security_deposit, $status, $emergency_contact_name, $emergency_contact_phone, $notes, $tenant_id);
        }
        
        if ($stmt->execute()) {
            // Update property status based on active tenants
            // Always update the current property (tenant is now assigned to this property)
            updatePropertyStatusBasedOnTenants($conn, $property_id);
            
            // If property changed, also update the old property
            // (the tenant moved from old property, so old property might become vacant)
            if ($property_changed) {
                updatePropertyStatusBasedOnTenants($conn, $old_property_id);
            }
            
            // Regenerate invoices if lease dates changed and tenant is active
            if ($dates_changed && $status == 'Active' && !empty($lease_start) && !empty($lease_end)) {
                require_once '../includes/recurring_invoices.php';
                // Delete future invoices and regenerate
                $future_date = date('Y-m-d');
                $conn->query("DELETE FROM rent_payments WHERE tenant_id = $tenant_id AND due_date >= '$future_date' AND status = 'Pending'");
                generateMonthlyInvoices($tenant_id, $conn);
            }
            
            header('Location: index.php?updated=1');
            exit();
        } else {
            $error = 'Error updating tenant. Please try again.';
        }
        
        $stmt->close();
    }
}

closeDBConnection($conn);

$page_title = 'Edit Tenant';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Edit Tenant</h1>
    <a href="index.php" class="btn-link">← Back to Tenants</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-group">
                <label for="property_id">Property *</label>
                <select id="property_id" name="property_id" required>
                        <?php foreach ($properties_result as $property): ?>
                            <option value="<?php echo $property['id']; ?>" <?php echo ($tenant['property_id'] == $property['id']) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($property['display_name']); ?>
                            </option>
                        <?php endforeach; ?>
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="first_name">First Name *</label>
                    <input type="text" id="first_name" name="first_name" value="<?php echo htmlspecialchars($tenant['first_name']); ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="last_name">Last Name *</label>
                    <input type="text" id="last_name" name="last_name" value="<?php echo htmlspecialchars($tenant['last_name']); ?>" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" value="<?php echo htmlspecialchars($tenant['email'] ?? ''); ?>">
                </div>
                
                <div class="form-group">
                    <label for="phone">Phone</label>
                    <input type="text" id="phone" name="phone" value="<?php echo htmlspecialchars($tenant['phone'] ?? ''); ?>">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="alternate_phone">Alternate Phone</label>
                    <input type="text" id="alternate_phone" name="alternate_phone" value="<?php echo htmlspecialchars($tenant['alternate_phone'] ?? ''); ?>">
                </div>
                
                <div class="form-group">
                    <label for="qatar_id">Qatar ID Number</label>
                    <input type="text" id="qatar_id" name="qatar_id" value="<?php echo htmlspecialchars($tenant['qatar_id'] ?? ''); ?>" placeholder="Enter Qatar ID">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="monthly_rent">Monthly Rent *</label>
                    <input type="number" id="monthly_rent" name="monthly_rent" step="0.01" min="0" value="<?php echo $tenant['monthly_rent']; ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="security_deposit">Security Deposit</label>
                    <input type="number" id="security_deposit" name="security_deposit" step="0.01" min="0" value="<?php echo $tenant['security_deposit'] ?? ''; ?>">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="move_in_date">Move In Date</label>
                    <input type="date" id="move_in_date" name="move_in_date" value="<?php echo $tenant['move_in_date'] ?? ''; ?>">
                </div>
                
                <div class="form-group">
                    <label for="status">Status *</label>
                    <select id="status" name="status" required>
                        <option value="Active" <?php echo $tenant['status'] == 'Active' ? 'selected' : ''; ?>>Active</option>
                        <option value="Pending" <?php echo $tenant['status'] == 'Pending' ? 'selected' : ''; ?>>Pending</option>
                        <option value="Past" <?php echo $tenant['status'] == 'Past' ? 'selected' : ''; ?>>Past</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="lease_start">Lease Start Date</label>
                    <input type="date" id="lease_start" name="lease_start" value="<?php echo $tenant['lease_start'] ?? ''; ?>">
                </div>
                
                <div class="form-group">
                    <label for="lease_end">Lease End Date</label>
                    <input type="date" id="lease_end" name="lease_end" value="<?php echo $tenant['lease_end'] ?? ''; ?>">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="emergency_contact_name">Emergency Contact Name</label>
                    <input type="text" id="emergency_contact_name" name="emergency_contact_name" value="<?php echo htmlspecialchars($tenant['emergency_contact_name'] ?? ''); ?>">
                </div>
                
                <div class="form-group">
                    <label for="emergency_contact_phone">Emergency Contact Phone</label>
                    <input type="text" id="emergency_contact_phone" name="emergency_contact_phone" value="<?php echo htmlspecialchars($tenant['emergency_contact_phone'] ?? ''); ?>">
                </div>
            </div>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="4"><?php echo htmlspecialchars($tenant['notes'] ?? ''); ?></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Tenant</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
