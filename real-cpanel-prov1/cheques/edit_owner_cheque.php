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
    die('Cheque register table not found.');
}

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header('Location: owners.php');
    exit();
}

$cheque_id = intval($_GET['id']);

// Check if owner fields exist
$check_owner = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner_fields = $check_owner->num_rows > 0;

// Get cheque details
if ($has_owner_fields) {
    $cheque = $conn->query("SELECT oc.*, p.property_name, p.owner_name
        FROM owner_cheques oc
        INNER JOIN properties p ON oc.property_id = p.id
        WHERE oc.id = $cheque_id AND p.user_id = $user_id")->fetch_assoc();
} else {
    $cheque = $conn->query("SELECT oc.*, p.property_name
        FROM owner_cheques oc
        INNER JOIN properties p ON oc.property_id = p.id
        WHERE oc.id = $cheque_id AND p.user_id = $user_id")->fetch_assoc();
}

if (!$cheque) {
    header('Location: owners.php');
    exit();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $cheque_number = sanitizeInput($_POST['cheque_number']);
    $bank_name = !empty($_POST['bank_name']) ? sanitizeInput($_POST['bank_name']) : null;
    $cheque_amount = floatval($_POST['cheque_amount']);
    $cheque_date = $_POST['cheque_date'];
    $issue_date = !empty($_POST['issue_date']) ? $_POST['issue_date'] : null;
    $status = $_POST['status'];
    $notes = !empty($_POST['notes']) ? sanitizeInput($_POST['notes']) : null;
    
    if (empty($cheque_number) || empty($cheque_amount) || empty($cheque_date)) {
        $error = 'Please fill in all required fields';
    } else {
        $stmt = $conn->prepare("UPDATE owner_cheques SET cheque_number = ?, bank_name = ?, cheque_amount = ?, cheque_date = ?, issue_date = ?, status = ?, notes = ? WHERE id = ?");
        $stmt->bind_param("ssdssssi", $cheque_number, $bank_name, $cheque_amount, $cheque_date, $issue_date, $status, $notes, $cheque_id);
        
        if ($stmt->execute()) {
            header('Location: owners.php?updated=1');
            exit();
        } else {
            $error = 'Error updating cheque. Please try again.';
        }
        
        $stmt->close();
    }
}

closeDBConnection($conn);

$page_title = 'Edit Owner Cheque';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Edit Owner Cheque</h1>
    <a href="owners.php" class="btn-link">← Back to Owner Cheques</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-group">
                <label>Property</label>
                <input type="text" value="<?php echo htmlspecialchars($cheque['property_name']); ?>" disabled>
            </div>
            
            <?php if ($has_owner_fields && !empty($cheque['owner_name'])): ?>
            <div class="form-group">
                <label>Owner</label>
                <input type="text" value="<?php echo htmlspecialchars($cheque['owner_name']); ?>" disabled>
            </div>
            <?php endif; ?>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cheque_number">Cheque Number *</label>
                    <input type="text" id="cheque_number" name="cheque_number" value="<?php echo htmlspecialchars($cheque['cheque_number']); ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="bank_name">Bank Name</label>
                    <input type="text" id="bank_name" name="bank_name" value="<?php echo htmlspecialchars($cheque['bank_name'] ?? ''); ?>" placeholder="e.g., Your Bank Name">
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
                    <small class="text-muted">Date written on cheque</small>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="issue_date">Issue Date</label>
                    <input type="date" id="issue_date" name="issue_date" value="<?php echo $cheque['issue_date'] ?? ''; ?>">
                    <small class="text-muted">Date you issued this cheque</small>
                </div>
                
                <div class="form-group">
                    <label for="status">Status *</label>
                    <select id="status" name="status" required>
                        <option value="Issued" <?php echo $cheque['status'] == 'Issued' ? 'selected' : ''; ?>>Issued</option>
                        <option value="Cleared" <?php echo $cheque['status'] == 'Cleared' ? 'selected' : ''; ?>>Cleared</option>
                        <option value="Bounced" <?php echo $cheque['status'] == 'Bounced' ? 'selected' : ''; ?>>Bounced</option>
                        <option value="Cancelled" <?php echo $cheque['status'] == 'Cancelled' ? 'selected' : ''; ?>>Cancelled</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="3"><?php echo htmlspecialchars($cheque['notes'] ?? ''); ?></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Cheque</button>
                <a href="owners.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<?php include '../includes/footer.php'; ?>

