<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if tenant_cheques table exists
$check_table = $conn->query("SHOW TABLES LIKE 'tenant_cheques'");
$has_table = $check_table->num_rows > 0;

if (!$has_table) {
    closeDBConnection($conn);
    die('Cheque register table not found. Please run the migration: <a href="../database/migrate_cheque_register.php">Run Migration</a>');
}

$error = '';
$success = '';

// Get tenants for dropdown
$tenants = $conn->query("SELECT t.id, t.first_name, t.last_name, t.property_id, p.property_name, t.status
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE p.user_id = $user_id
    ORDER BY t.first_name, t.last_name");

// Get rent payments for linking
$rent_payments = $conn->query("SELECT rp.id, rp.amount, rp.due_date, t.first_name, t.last_name, p.property_name
    FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND rp.status = 'Pending'
    ORDER BY rp.due_date ASC");

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $tenant_id = intval($_POST['tenant_id']);
    $property_id = isset($_POST['property_id']) ? intval($_POST['property_id']) : 0;
    $rent_payment_id = !empty($_POST['rent_payment_id']) ? intval($_POST['rent_payment_id']) : null;
    $cheque_number = sanitizeInput($_POST['cheque_number']);
    $bank_name = !empty($_POST['bank_name']) ? sanitizeInput($_POST['bank_name']) : null;
    $cheque_amount = floatval($_POST['cheque_amount']);
    $cheque_date = $_POST['cheque_date'];
    $deposit_date = !empty($_POST['deposit_date']) ? $_POST['deposit_date'] : null;
    $notes = !empty($_POST['notes']) ? sanitizeInput($_POST['notes']) : null;
    
    if (empty($cheque_number) || empty($cheque_amount) || empty($cheque_date) || empty($property_id) || empty($tenant_id)) {
        $error = 'Please fill in all required fields';
    } else {
        $stmt = $conn->prepare("INSERT INTO tenant_cheques (user_id, tenant_id, property_id, rent_payment_id, cheque_number, bank_name, cheque_amount, cheque_date, deposit_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)");
        $stmt->bind_param("iiiissdsss", $user_id, $tenant_id, $property_id, $rent_payment_id, $cheque_number, $bank_name, $cheque_amount, $cheque_date, $deposit_date, $notes);
        
        if ($stmt->execute()) {
            // If linked to rent payment, update payment method
            if ($rent_payment_id) {
                $conn->query("UPDATE rent_payments SET payment_method = 'Cheque', cheque_number = '$cheque_number' WHERE id = $rent_payment_id");
            }
            header('Location: tenants.php?added=1');
            exit();
        } else {
            $error = 'Error adding cheque. Please try again.';
        }
        
        $stmt->close();
    }
}

$pre_selected_tenant = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : '';

$page_title = 'Add Tenant Cheque';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Add Tenant Cheque</h1>
    <div>
        <a href="tenants.php" class="btn-link">← Back to Tenant Cheques</a>
        <a href="add_multiple_tenant_cheques.php" class="btn btn-primary">+ Add Multiple Cheques</a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-group">
                <label for="tenant_id">Tenant *</label>
                <select id="tenant_id" name="tenant_id" required onchange="updatePropertyFromTenant()">
                    <option value="">Select Tenant</option>
                    <?php while ($tenant = $tenants->fetch_assoc()): ?>
                        <option value="<?php echo $tenant['id']; ?>" data-property-id="<?php echo $tenant['property_id']; ?>" <?php echo ($pre_selected_tenant == $tenant['id']) ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name'] . ' - ' . $tenant['property_name']); ?>
                            <?php if ($tenant['status'] != 'Active'): ?>
                                (<?php echo htmlspecialchars($tenant['status']); ?>)
                            <?php endif; ?>
                        </option>
                    <?php endwhile; ?>
                </select>
            </div>
            
            <input type="hidden" id="property_id" name="property_id" required>
            
            <div class="form-group">
                <label for="rent_payment_id">Link to Rent Payment (Optional)</label>
                <select id="rent_payment_id" name="rent_payment_id">
                    <option value="">None</option>
                    <?php 
                    $rent_payments->data_seek(0); // Reset pointer
                    while ($payment = $rent_payments->fetch_assoc()): 
                    ?>
                        <option value="<?php echo $payment['id']; ?>" data-amount="<?php echo $payment['amount']; ?>">
                            <?php echo htmlspecialchars($payment['first_name'] . ' ' . $payment['last_name'] . ' - ' . formatCurrency($payment['amount']) . ' (Due: ' . formatDate($payment['due_date']) . ')'); ?>
                        </option>
                    <?php endwhile; ?>
                </select>
                <small class="text-muted">Link this cheque to a specific rent payment</small>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cheque_number">Cheque Number *</label>
                    <input type="text" id="cheque_number" name="cheque_number" required>
                </div>
                
                <div class="form-group">
                    <label for="bank_name">Bank Name</label>
                    <input type="text" id="bank_name" name="bank_name" placeholder="e.g., Qatar National Bank">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cheque_amount">Cheque Amount *</label>
                    <input type="number" id="cheque_amount" name="cheque_amount" min="0" step="0.01" required>
                </div>
                
                <div class="form-group">
                    <label for="cheque_date">Cheque Date *</label>
                    <input type="date" id="cheque_date" name="cheque_date" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="deposit_date">Deposit Date</label>
                <input type="date" id="deposit_date" name="deposit_date">
                <small class="text-muted">When you plan to deposit this cheque (for notifications)</small>
            </div>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="3"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Add Cheque</button>
                <a href="tenants.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<script>
function updatePropertyFromTenant() {
    const tenantSelect = document.getElementById('tenant_id');
    const propertySelect = document.getElementById('property_id');
    const selectedOption = tenantSelect.options[tenantSelect.selectedIndex];
    
    if (selectedOption.value) {
        const propertyId = selectedOption.dataset.propertyId;
        propertySelect.value = propertyId;
    } else {
        propertySelect.value = '';
    }
}

// Auto-fill amount if rent payment is selected
document.getElementById('rent_payment_id').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const amountInput = document.getElementById('cheque_amount');
    
    if (selectedOption.value && selectedOption.dataset.amount && !amountInput.value) {
        amountInput.value = selectedOption.dataset.amount;
    }
});
</script>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>

