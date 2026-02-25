<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if owner_payments table exists
$check_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_table = $check_table->num_rows > 0;

if (!$has_owner_table) {
    closeDBConnection($conn);
    die('Owner payments table not found. Please run the migration: <a href="../database/migrate_owner.php">Run Migration</a>');
}

$error = '';

// Get properties with owners and formatted display names
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

if ($has_unit_fields) {
    $properties_query = "SELECT p.id, p.property_name, p.owner_name, p.monthly_rent_to_owner, 
                            p.parent_property_id, p.unit_name, parent.property_name as parent_property_name
                          FROM properties p
                          LEFT JOIN properties parent ON p.parent_property_id = parent.id
                          WHERE p.user_id = $user_id AND p.owner_name IS NOT NULL AND p.owner_name != '' AND p.monthly_rent_to_owner > 0
                          ORDER BY 
                            CASE 
                              WHEN p.parent_property_id IS NULL OR p.parent_property_id = 0 OR p.is_unit = 0 THEN 0 
                              ELSE 1 
                            END,
                            COALESCE(parent.property_name, p.property_name),
                            p.unit_name,
                            p.property_name";
} else {
    $properties_query = "SELECT id, property_name, owner_name, monthly_rent_to_owner
                          FROM properties 
                          WHERE user_id = $user_id AND owner_name IS NOT NULL AND owner_name != '' AND monthly_rent_to_owner > 0
                          ORDER BY property_name";
}

$properties_result = $conn->query($properties_query);
$properties_array = [];
if ($properties_result && $properties_result->num_rows > 0) {
    while ($row = $properties_result->fetch_assoc()) {
        // Format display name
        if ($has_unit_fields && !empty($row['parent_property_id']) && !empty($row['parent_property_name'])) {
            $unit_display = !empty($row['unit_name']) ? $row['unit_name'] : $row['property_name'];
            $row['display_name'] = $row['parent_property_name'] . ' - ' . $unit_display;
        } else {
            $row['display_name'] = $row['property_name'];
        }
        $properties_array[] = $row;
    }
}
$properties = $properties_result; // Keep for backward compatibility

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $property_id = intval($_POST['property_id']);
    $amount = floatval($_POST['amount']);
    $payment_month = $_POST['payment_month'];
    $paid_date = !empty($_POST['paid_date']) ? $_POST['paid_date'] : null;
    $payment_method = $_POST['payment_method'];
    $reference_number = !empty($_POST['reference_number']) ? sanitizeInput($_POST['reference_number']) : null;
    $notes = !empty($_POST['notes']) ? sanitizeInput($_POST['notes']) : null;
    $status = !empty($paid_date) ? 'Paid' : 'Pending';
    
    if (empty($property_id) || empty($amount) || empty($payment_month)) {
        $error = 'Please fill in all required fields';
    } else {
        $stmt = $conn->prepare("INSERT INTO owner_payments (property_id, user_id, amount, payment_month, paid_date, payment_method, reference_number, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iidssssss", $property_id, $user_id, $amount, $payment_month, $paid_date, $payment_method, $reference_number, $notes, $status);
        
        if ($stmt->execute()) {
            header('Location: index.php?added=1');
            exit();
        } else {
            $error = 'Error adding payment. Please try again.';
        }
        
        $stmt->close();
    }
}

closeDBConnection($conn);

$page_title = 'Record Owner Payment';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Record Owner Payment</h1>
    <a href="index.php" class="btn-link">← Back to Owner Payments</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-group">
                <label for="property_id">Property *</label>
                <select id="property_id" name="property_id" required onchange="updateAmountFromProperty()">
                    <option value="">Select Property</option>
                    <?php foreach ($properties_array as $property): ?>
                        <option value="<?php echo $property['id']; ?>" 
                                data-rent-amount="<?php echo $property['monthly_rent_to_owner']; ?>"
                                data-owner-name="<?php echo htmlspecialchars($property['owner_name']); ?>">
                            <?php echo htmlspecialchars($property['display_name']); ?> 
                            (<?php echo htmlspecialchars($property['owner_name']); ?> - <?php echo formatCurrency($property['monthly_rent_to_owner']); ?>/mo)
                        </option>
                    <?php endforeach; ?>
                </select>
                <small class="text-muted">Only properties with owner information are shown</small>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="amount">Amount *</label>
                    <input type="number" id="amount" name="amount" step="0.01" min="0" required>
                    <small class="text-muted">Amount will be auto-filled from property's monthly rent</small>
                </div>
                
                <div class="form-group">
                    <label for="payment_month">Payment Month *</label>
                    <input type="month" id="payment_month" name="payment_month" value="<?php echo date('Y-m'); ?>" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="paid_date">Paid Date</label>
                    <input type="date" id="paid_date" name="paid_date" value="<?php echo date('Y-m-d'); ?>">
                    <small class="text-muted">Leave empty if payment is pending</small>
                </div>
                
                <div class="form-group">
                    <label for="payment_method">Payment Method</label>
                    <select id="payment_method" name="payment_method" required>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Check">Check</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="reference_number">Reference Number</label>
                <input type="text" id="reference_number" name="reference_number" placeholder="Transaction/Check number">
            </div>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="3" placeholder="Additional notes about this payment"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Record Payment</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<script>
function updateAmountFromProperty() {
    const select = document.getElementById('property_id');
    const amountInput = document.getElementById('amount');
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value && selectedOption.dataset.rentAmount && !amountInput.value) {
        amountInput.value = selectedOption.dataset.rentAmount;
    }
}
</script>

<?php include '../includes/footer.php'; ?>
