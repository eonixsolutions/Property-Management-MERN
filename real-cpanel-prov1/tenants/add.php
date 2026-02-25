<?php
// Enable error display for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

$error = '';

// Get properties for dropdown - check if default_rent column exists
$check_column = $conn->query("SHOW COLUMNS FROM properties LIKE 'default_rent'");
$has_default_rent = $check_column->num_rows > 0;

$additional_fields = $has_default_rent ? 'p.default_rent' : '0 as default_rent';
$properties_result = getPropertiesForDropdown($conn, $user_id, $additional_fields);

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
        // Verify property belongs to user
        $stmt = $conn->prepare("SELECT id FROM properties WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $property_id, $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows == 0) {
            $error = 'Invalid property selected';
        } else {
            // Check if qatar_id column exists
            $check_qatar_id = $conn->query("SHOW COLUMNS FROM tenants LIKE 'qatar_id'");
            $has_qatar_id = $check_qatar_id->num_rows > 0;
            
            if ($has_qatar_id) {
                // With qatar_id: 16 parameters
                // i(property_id) + s(6 strings) + s(qatar_id) + s(3 dates) + d(2 decimals) + s(4 strings) = 16
                $stmt = $conn->prepare("INSERT INTO tenants (property_id, first_name, last_name, email, phone, alternate_phone, qatar_id, move_in_date, lease_start, lease_end, monthly_rent, security_deposit, status, emergency_contact_name, emergency_contact_phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                // 16 parameters: Working version "issssssssddssss" (15) + 1s for qatar_id = "isssssssssssddssss" (16)
                // But wait, qatar_id is inserted after alternate_phone, so: "isssss" + "s" + "sssddssss" = "isssssssssddssss"
                // Actually: i + 5s + 1s(qatar_id) + 3s(dates) + 2d + 4s = "isssssssssddssss" = 16 ✓
                $stmt->bind_param("isssssssssddssss", $property_id, $first_name, $last_name, $email, $phone, $alternate_phone, $qatar_id, $move_in_date, $lease_start, $lease_end, $monthly_rent, $security_deposit, $status, $emergency_contact_name, $emergency_contact_phone, $notes);
            } else {
                // Without qatar_id: 15 parameters (same as working version)
                $stmt = $conn->prepare("INSERT INTO tenants (property_id, first_name, last_name, email, phone, alternate_phone, move_in_date, lease_start, lease_end, monthly_rent, security_deposit, status, emergency_contact_name, emergency_contact_phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("issssssssddssss", $property_id, $first_name, $last_name, $email, $phone, $alternate_phone, $move_in_date, $lease_start, $lease_end, $monthly_rent, $security_deposit, $status, $emergency_contact_name, $emergency_contact_phone, $notes);
            }
            
            if ($stmt->execute()) {
                $tenant_id = $conn->insert_id;
                
                // Update property status based on active tenants
                updatePropertyStatusBasedOnTenants($conn, $property_id);
                
                // Auto-generate recurring invoices if tenant is active and has lease_start
                // Generates rent payments from lease_start to current month (including past months)
                if ($status == 'Active' && !empty($lease_start)) {
                    require_once '../includes/recurring_invoices.php';
                    $invoices_created = generateRecurringInvoices($tenant_id, $conn);
                }
                
                header('Location: index.php?added=1');
                exit();
            } else {
                $error = 'Error adding tenant: ' . $stmt->error . ' (Error Code: ' . $stmt->errno . ')';
                if ($conn->error) {
                    $error .= ' | MySQL Error: ' . $conn->error;
                }
            }
        }
        
        $stmt->close();
    }
}

closeDBConnection($conn);

$page_title = 'Add Tenant';
include '../includes/header.php';

// Pre-select property if passed in URL
$selected_property = isset($_GET['property_id']) ? intval($_GET['property_id']) : '';
?>

<div class="page-actions">
    <h1>Add New Tenant</h1>
    <a href="index.php" class="btn-link">← Back to Tenants</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <strong>Error:</strong> <?php echo $error; ?>
        <?php if (isset($_POST)): ?>
            <br><small>Debug: POST method received. Check database connection and table structure.</small>
        <?php endif; ?>
    </div>
<?php endif; ?>

<?php if (isset($_GET['debug'])): 
    $debug_conn = getDBConnection();
    $debug_user_id = getCurrentUserId();
    $debug_check = $debug_conn->query("SHOW COLUMNS FROM properties LIKE 'default_rent'");
    $debug_has_default_rent = $debug_check->num_rows > 0;
    $debug_additional_fields = $debug_has_default_rent ? 'p.default_rent' : '0 as default_rent';
    $debug_properties = getPropertiesForDropdown($debug_conn, $debug_user_id, $debug_additional_fields);
?>
    <div class="alert alert-info">
        <strong>Debug Info:</strong><br>
        Database: <?php echo DB_NAME; ?><br>
        Connection: <?php echo $debug_conn ? 'OK' : 'FAILED'; ?><br>
        User ID: <?php echo $debug_user_id; ?><br>
        Properties count: <?php echo $debug_properties ? count($debug_properties) : 0; ?><br>
        <a href="debug_add.php">Full Debug Page</a>
    </div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-group">
                <label for="property_id">Property *</label>
                <select id="property_id" name="property_id" required onchange="updateRentFromProperty()">
                    <option value="">Select Property</option>
                    <?php foreach ($properties_result as $property): ?>
                        <option value="<?php echo $property['id']; ?>" 
                                data-default-rent="<?php echo $property['default_rent'] ?? ''; ?>"
                                <?php echo ($selected_property == $property['id']) ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($property['display_name']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="first_name">First Name *</label>
                    <input type="text" id="first_name" name="first_name" required>
                </div>
                
                <div class="form-group">
                    <label for="last_name">Last Name *</label>
                    <input type="text" id="last_name" name="last_name" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email">
                </div>
                
                <div class="form-group">
                    <label for="phone">Phone</label>
                    <input type="text" id="phone" name="phone">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="alternate_phone">Alternate Phone</label>
                    <input type="text" id="alternate_phone" name="alternate_phone">
                </div>
                
                <div class="form-group">
                    <label for="qatar_id">Qatar ID Number</label>
                    <input type="text" id="qatar_id" name="qatar_id" placeholder="Enter Qatar ID">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="monthly_rent">Monthly Rent *</label>
                    <input type="number" id="monthly_rent" name="monthly_rent" step="0.01" min="0" required>
                    <small class="text-muted">Default rent from property will be auto-filled when you select a property</small>
                </div>
                
                <div class="form-group">
                    <label for="security_deposit">Security Deposit</label>
                    <input type="number" id="security_deposit" name="security_deposit" step="0.01" min="0">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="move_in_date">Move In Date</label>
                    <input type="date" id="move_in_date" name="move_in_date">
                </div>
                
                <div class="form-group">
                    <label for="status">Status *</label>
                    <select id="status" name="status" required>
                        <option value="Active" selected>Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Past">Past</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="lease_start">Lease Start Date</label>
                    <input type="date" id="lease_start" name="lease_start">
                </div>
                
                <div class="form-group">
                    <label for="lease_end">Lease End Date</label>
                    <input type="date" id="lease_end" name="lease_end">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="emergency_contact_name">Emergency Contact Name</label>
                    <input type="text" id="emergency_contact_name" name="emergency_contact_name">
                </div>
                
                <div class="form-group">
                    <label for="emergency_contact_phone">Emergency Contact Phone</label>
                    <input type="text" id="emergency_contact_phone" name="emergency_contact_phone">
                </div>
            </div>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="4"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Add Tenant</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<script>
function updateRentFromProperty() {
    const select = document.getElementById('property_id');
    const rentInput = document.getElementById('monthly_rent');
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value && selectedOption.dataset.defaultRent && !rentInput.value) {
        rentInput.value = selectedOption.dataset.defaultRent;
    }
}
</script>

<?php include '../includes/footer.php'; ?>
