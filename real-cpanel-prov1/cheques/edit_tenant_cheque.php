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
    die('Cheque register table not found.');
}

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header('Location: tenants.php');
    exit();
}

$cheque_id = intval($_GET['id']);

// Get cheque details
$cheque = $conn->query("SELECT tc.*, t.first_name, t.last_name, p.property_name
    FROM tenant_cheques tc
    INNER JOIN tenants t ON tc.tenant_id = t.id
    INNER JOIN properties p ON tc.property_id = p.id
    WHERE tc.id = $cheque_id AND p.user_id = $user_id")->fetch_assoc();

if (!$cheque) {
    header('Location: tenants.php');
    exit();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $cheque_number = sanitizeInput($_POST['cheque_number']);
    $bank_name = !empty($_POST['bank_name']) ? sanitizeInput($_POST['bank_name']) : null;
    $cheque_amount = floatval($_POST['cheque_amount']);
    $cheque_date = $_POST['cheque_date'];
    $deposit_date = !empty($_POST['deposit_date']) ? $_POST['deposit_date'] : null;
    $status = $_POST['status'];
    $notes = !empty($_POST['notes']) ? sanitizeInput($_POST['notes']) : null;
    
    if (empty($cheque_number) || empty($cheque_amount) || empty($cheque_date)) {
        $error = 'Please fill in all required fields';
    } else {
        $stmt = $conn->prepare("UPDATE tenant_cheques SET cheque_number = ?, bank_name = ?, cheque_amount = ?, cheque_date = ?, deposit_date = ?, status = ?, notes = ? WHERE id = ?");
        $stmt->bind_param("ssdssssi", $cheque_number, $bank_name, $cheque_amount, $cheque_date, $deposit_date, $status, $notes, $cheque_id);
        
        if ($stmt->execute()) {
            header('Location: tenants.php?updated=1');
            exit();
        } else {
            $error = 'Error updating cheque. Please try again.';
        }
        
        $stmt->close();
    }
}

closeDBConnection($conn);

$page_title = 'Edit Tenant Cheque';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Edit Tenant Cheque</h1>
    <a href="tenants.php" class="btn-link">← Back to Tenant Cheques</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-group">
                <label>Tenant</label>
                <input type="text" value="<?php echo htmlspecialchars($cheque['first_name'] . ' ' . $cheque['last_name']); ?>" disabled>
            </div>
            
            <div class="form-group">
                <label>Property</label>
                <input type="text" value="<?php echo htmlspecialchars($cheque['property_name']); ?>" disabled>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cheque_number">Cheque Number *</label>
                    <input type="text" id="cheque_number" name="cheque_number" value="<?php echo htmlspecialchars($cheque['cheque_number']); ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="bank_name">Bank Name</label>
                    <input type="text" id="bank_name" name="bank_name" value="<?php echo htmlspecialchars($cheque['bank_name'] ?? ''); ?>" placeholder="e.g., Qatar National Bank">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cheque_amount">Cheque Amount *</label>
                    <input type="number" id="cheque_amount" name="cheque_amount" min="0" step="0.01" value="<?php echo $cheque['cheque_amount']; ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="cheque_date">Cheque Date *</label>
                    <input type="date" id="cheque_date" name="cheque_date" value="<?php echo $cheque['cheque_date']; ?>" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="deposit_date">Deposit Date</label>
                    <input type="date" id="deposit_date" name="deposit_date" value="<?php echo $cheque['deposit_date'] ?? ''; ?>">
                    <small class="text-muted">When you plan to deposit this cheque</small>
                </div>
                
                <div class="form-group">
                    <label for="status">Status *</label>
                    <select id="status" name="status" required>
                        <option value="Pending" <?php echo $cheque['status'] == 'Pending' ? 'selected' : ''; ?>>Pending</option>
                        <option value="Deposited" <?php echo $cheque['status'] == 'Deposited' ? 'selected' : ''; ?>>Deposited</option>
                        <option value="Cleared" <?php echo $cheque['status'] == 'Cleared' ? 'selected' : ''; ?>>Cleared</option>
                        <option value="Bounced" <?php echo $cheque['status'] == 'Bounced' ? 'selected' : ''; ?>>Bounced</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="3"><?php echo htmlspecialchars($cheque['notes'] ?? ''); ?></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Cheque</button>
                <a href="tenants.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<?php include '../includes/footer.php'; ?>

