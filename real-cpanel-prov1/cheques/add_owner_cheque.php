<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if owner_cheques table exists
$check_table = $conn->query("SHOW TABLES LIKE 'owner_cheques'");
$has_table = $check_table->num_rows > 0;

if (!$has_table) {
    closeDBConnection($conn);
    die('Cheque register table not found. Please run the migration: <a href="../database/migrate_cheque_register.php">Run Migration</a>');
}

$error = '';

// Check if owner_payments table exists
$check_owner_payments = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_payments = $check_owner_payments->num_rows > 0;

// Get properties with owners
$check_owner_fields = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner_fields = $check_owner_fields->num_rows > 0;

// Get properties with additional fields and formatted display names
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

$additional_fields = $has_owner_fields ? 'p.owner_name, p.monthly_rent_to_owner' : '';
$where_clause = $has_owner_fields 
    ? "p.user_id = $user_id AND p.owner_name IS NOT NULL AND p.owner_name != '' AND p.monthly_rent_to_owner > 0"
    : "p.user_id = $user_id";

if ($has_unit_fields) {
    $properties_query = "SELECT p.id, p.property_name, p.parent_property_id, p.unit_name, 
                            parent.property_name as parent_property_name" . 
                            ($additional_fields ? ", " . $additional_fields : "") . "
                          FROM properties p
                          LEFT JOIN properties parent ON p.parent_property_id = parent.id
                          WHERE $where_clause
                          ORDER BY 
                            CASE 
                              WHEN p.parent_property_id IS NULL OR p.parent_property_id = 0 OR p.is_unit = 0 THEN 0 
                              ELSE 1 
                            END,
                            COALESCE(parent.property_name, p.property_name),
                            p.unit_name,
                            p.property_name";
} else {
    $properties_query = "SELECT p.id, p.property_name" . 
                        ($additional_fields ? ", " . $additional_fields : "") . "
                          FROM properties p
                          WHERE $where_clause
                          ORDER BY p.property_name";
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

// Get owner payments for linking
$owner_payments = null;
if ($has_owner_payments) {
    $owner_payments = $conn->query("SELECT op.id, op.amount, op.payment_month, p.property_name, p.owner_name
        FROM owner_payments op
        INNER JOIN properties p ON op.property_id = p.id
        WHERE p.user_id = $user_id AND op.status = 'Pending'
        ORDER BY op.payment_month ASC");
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $property_id = intval($_POST['property_id']);
    $owner_payment_id = !empty($_POST['owner_payment_id']) ? intval($_POST['owner_payment_id']) : null;
    $cheque_number = sanitizeInput($_POST['cheque_number']);
    $bank_name = !empty($_POST['bank_name']) ? sanitizeInput($_POST['bank_name']) : null;
    $cheque_amount = floatval($_POST['cheque_amount']);
    $cheque_date = $_POST['cheque_date'];
    $issue_date = !empty($_POST['issue_date']) ? $_POST['issue_date'] : date('Y-m-d');
    $notes = !empty($_POST['notes']) ? sanitizeInput($_POST['notes']) : null;
    
    if (empty($cheque_number) || empty($cheque_amount) || empty($cheque_date)) {
        $error = 'Please fill in all required fields';
    } else {
        $stmt = $conn->prepare("INSERT INTO owner_cheques (user_id, property_id, owner_payment_id, cheque_number, bank_name, cheque_amount, cheque_date, issue_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Issued', ?)");
        $stmt->bind_param("iiissdsss", $user_id, $property_id, $owner_payment_id, $cheque_number, $bank_name, $cheque_amount, $cheque_date, $issue_date, $notes);
        
        if ($stmt->execute()) {
            // If linked to owner payment, update payment method
            if ($owner_payment_id && $has_owner_payments) {
                $conn->query("UPDATE owner_payments SET payment_method = 'Cheque', cheque_number = '$cheque_number' WHERE id = $owner_payment_id");
            }
            header('Location: owners.php?added=1');
            exit();
        } else {
            $error = 'Error adding cheque. Please try again.';
        }
        
        $stmt->close();
    }
}

closeDBConnection($conn);

$page_title = 'Issue Owner Cheque';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Issue Owner Cheque</h1>
    <div>
        <a href="owners.php" class="btn-link">← Back to Owner Cheques</a>
        <a href="add_multiple_owner_cheques.php" class="btn btn-primary">+ Issue Multiple Cheques</a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-group">
                <label for="property_id">Property *</label>
                <select id="property_id" name="property_id" required>
                    <option value="">Select Property</option>
                    <?php foreach ($properties_array as $property): ?>
                        <option value="<?php echo $property['id']; ?>" data-owner-rent="<?php echo $property['monthly_rent_to_owner'] ?? 0; ?>">
                            <?php echo htmlspecialchars($property['display_name']); ?>
                            <?php if ($has_owner_fields && !empty($property['owner_name'])): ?>
                                (Owner: <?php echo htmlspecialchars($property['owner_name']); ?>)
                            <?php endif; ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <?php if ($has_owner_payments && $owner_payments): ?>
            <div class="form-group">
                <label for="owner_payment_id">Link to Owner Payment (Optional)</label>
                <select id="owner_payment_id" name="owner_payment_id">
                    <option value="">None</option>
                    <?php 
                    $owner_payments->data_seek(0); // Reset pointer
                    while ($payment = $owner_payments->fetch_assoc()): 
                    ?>
                        <option value="<?php echo $payment['id']; ?>" data-amount="<?php echo $payment['amount']; ?>">
                            <?php echo htmlspecialchars($payment['property_name'] . ' - ' . formatCurrency($payment['amount']) . ' (' . formatDate($payment['payment_month']) . ')'); ?>
                        </option>
                    <?php endwhile; ?>
                </select>
                <small class="text-muted">Link this cheque to a specific owner payment</small>
            </div>
            <?php endif; ?>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cheque_number">Cheque Number *</label>
                    <input type="text" id="cheque_number" name="cheque_number" required>
                </div>
                
                <div class="form-group">
                    <label for="bank_name">Bank Name</label>
                    <input type="text" id="bank_name" name="bank_name" placeholder="e.g., Your Bank Name">
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
                    <small class="text-muted">Date written on cheque</small>
                </div>
            </div>
            
            <div class="form-group">
                <label for="issue_date">Issue Date</label>
                <input type="date" id="issue_date" name="issue_date" value="<?php echo date('Y-m-d'); ?>">
                <small class="text-muted">Date you issued this cheque</small>
            </div>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="3"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Issue Cheque</button>
                <a href="owners.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<script>
// Auto-fill amount if owner payment is selected
document.getElementById('owner_payment_id')?.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const amountInput = document.getElementById('cheque_amount');
    
    if (selectedOption.value && selectedOption.dataset.amount && !amountInput.value) {
        amountInput.value = selectedOption.dataset.amount;
    }
});

// Auto-fill amount based on property owner rent
document.getElementById('property_id').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const amountInput = document.getElementById('cheque_amount');
    
    if (selectedOption.value && selectedOption.dataset.ownerRent && selectedOption.dataset.ownerRent > 0 && !amountInput.value) {
        amountInput.value = selectedOption.dataset.ownerRent;
    }
});
</script>

<?php include '../includes/footer.php'; ?>

