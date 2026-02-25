<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

$error = '';

// Get tenants for dropdown
$tenants_query = "SELECT t.id, t.first_name, t.last_name, t.monthly_rent, p.property_name
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE p.user_id = $user_id AND t.status = 'Active'
    ORDER BY t.first_name, t.last_name";
$tenants = $conn->query($tenants_query);

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $tenant_id = intval($_POST['tenant_id']);
    $amount = floatval($_POST['amount']);
    $due_date = $_POST['due_date'];
    $paid_date = !empty($_POST['paid_date']) ? $_POST['paid_date'] : null;
    $status = $_POST['status'];
    $payment_method = $_POST['payment_method'];
    $reference_number = sanitizeInput($_POST['reference_number']);
    $notes = sanitizeInput($_POST['notes']);
    
    if (empty($tenant_id) || empty($amount) || empty($due_date) || empty($status)) {
        $error = 'Please fill in all required fields';
    } else {
        // Get property_id from tenant
        $tenant_info = $conn->query("SELECT property_id FROM tenants WHERE id = $tenant_id")->fetch_assoc();
        $property_id = $tenant_info['property_id'];
        
        $stmt = $conn->prepare("INSERT INTO rent_payments (tenant_id, property_id, amount, due_date, paid_date, status, payment_method, reference_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iidssssss", $tenant_id, $property_id, $amount, $due_date, $paid_date, $status, $payment_method, $reference_number, $notes);
        
        if ($stmt->execute()) {
            header('Location: index.php?added=1');
            exit();
        } else {
            $error = 'Error recording payment. Please try again.';
        }
        
        $stmt->close();
    }
}

closeDBConnection($conn);

$page_title = 'Record Rent Payment';
include '../includes/header.php';

$selected_tenant = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : '';
?>

<div class="page-actions">
    <h1>Record Rent Payment</h1>
    <a href="index.php" class="btn-link">← Back to Rent Collection</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-group">
                <label for="tenant_id">Tenant *</label>
                <select id="tenant_id" name="tenant_id" required onchange="updateAmount()">
                    <option value="">Select Tenant</option>
                    <?php while ($tenant = $tenants->fetch_assoc()): ?>
                        <option value="<?php echo $tenant['id']; ?>" 
                                data-rent="<?php echo $tenant['monthly_rent']; ?>"
                                <?php echo ($selected_tenant == $tenant['id']) ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name'] . ' - ' . $tenant['property_name']); ?>
                        </option>
                    <?php endwhile; ?>
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="amount">Amount *</label>
                    <input type="number" id="amount" name="amount" step="0.01" min="0" required>
                </div>
                
                <div class="form-group">
                    <label for="due_date">Due Date *</label>
                    <input type="date" id="due_date" name="due_date" value="<?php echo date('Y-m-d'); ?>" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="status">Status *</label>
                    <select id="status" name="status" required>
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                        <option value="Partial">Partial</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="paid_date">Paid Date</label>
                    <input type="date" id="paid_date" name="paid_date">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="payment_method">Payment Method</label>
                    <select id="payment_method" name="payment_method">
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Check">Check</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="reference_number">Reference Number</label>
                    <input type="text" id="reference_number" name="reference_number">
                </div>
            </div>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="3"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Record Payment</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<script>
function updateAmount() {
    const select = document.getElementById('tenant_id');
    const amountInput = document.getElementById('amount');
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value && selectedOption.dataset.rent) {
        amountInput.value = selectedOption.dataset.rent;
    }
}
</script>

<?php include '../includes/footer.php'; ?>
