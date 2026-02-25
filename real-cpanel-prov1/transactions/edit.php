<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if user is Super Admin
$current_user = $conn->query("SELECT role FROM users WHERE id = $user_id")->fetch_assoc();
$is_super_admin = ($current_user['role'] ?? 'User') == 'Super Admin';

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header('Location: index.php');
    exit();
}

$transaction_id = intval($_GET['id']);
$error = '';

// Get transaction details - Super Admin can edit any transaction, others only their own
if ($is_super_admin) {
    $transaction = $conn->query("SELECT * FROM transactions WHERE id = $transaction_id")->fetch_assoc();
} else {
    $transaction = $conn->query("SELECT * FROM transactions WHERE id = $transaction_id AND user_id = $user_id")->fetch_assoc();
}

if (!$transaction) {
    header('Location: index.php');
    exit();
}

// Get properties and tenants - Super Admin can see all, others only their own
if ($is_super_admin) {
    $properties_result = getPropertiesForDropdown($conn, $user_id);
    $tenants = $conn->query("SELECT t.id, t.first_name, t.last_name, p.property_name
        FROM tenants t
        INNER JOIN properties p ON t.property_id = p.id
        ORDER BY t.first_name");
} else {
    $properties_result = getPropertiesForDropdown($conn, $user_id);
    $tenants = $conn->query("SELECT t.id, t.first_name, t.last_name, p.property_name
        FROM tenants t
        INNER JOIN properties p ON t.property_id = p.id
        WHERE p.user_id = $user_id
        ORDER BY t.first_name");
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $type = $_POST['type'];
    $category = sanitizeInput($_POST['category']);
    $amount = floatval($_POST['amount']);
    $description = sanitizeInput($_POST['description']);
    $transaction_date = $_POST['transaction_date'];
    $payment_method = $_POST['payment_method'];
    $reference_number = sanitizeInput($_POST['reference_number']);
    $property_id = !empty($_POST['property_id']) ? intval($_POST['property_id']) : null;
    $tenant_id = !empty($_POST['tenant_id']) ? intval($_POST['tenant_id']) : null;
    
    if (empty($type) || empty($category) || empty($amount) || empty($transaction_date)) {
        $error = 'Please fill in all required fields';
    } else {
        // Super Admin can update any transaction, others only their own
        if ($is_super_admin) {
            $stmt = $conn->prepare("UPDATE transactions SET property_id = ?, tenant_id = ?, type = ?, category = ?, amount = ?, description = ?, transaction_date = ?, payment_method = ?, reference_number = ? WHERE id = ?");
            $stmt->bind_param("iissdssssi", $property_id, $tenant_id, $type, $category, $amount, $description, $transaction_date, $payment_method, $reference_number, $transaction_id);
        } else {
            $stmt = $conn->prepare("UPDATE transactions SET property_id = ?, tenant_id = ?, type = ?, category = ?, amount = ?, description = ?, transaction_date = ?, payment_method = ?, reference_number = ? WHERE id = ? AND user_id = ?");
            $stmt->bind_param("iissdssssii", $property_id, $tenant_id, $type, $category, $amount, $description, $transaction_date, $payment_method, $reference_number, $transaction_id, $user_id);
        }
        
        if ($stmt->execute()) {
            header('Location: index.php?updated=1');
            exit();
        } else {
            $error = 'Error updating transaction. Please try again.';
        }
        
        $stmt->close();
    }
}

// Get transaction owner info if Super Admin
$transaction_owner = null;
if ($is_super_admin && $transaction['user_id'] != $user_id) {
    $transaction_owner = $conn->query("SELECT first_name, last_name, email FROM users WHERE id = {$transaction['user_id']}")->fetch_assoc();
}

closeDBConnection($conn);

$page_title = 'Edit Transaction';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Edit Transaction</h1>
    <a href="index.php" class="btn-link">← Back to Transactions</a>
</div>

<?php if ($is_super_admin && $transaction_owner): ?>
    <div class="alert alert-info">
        <strong>ℹ️ Super Admin Mode:</strong> You are editing a transaction created by 
        <strong><?php echo htmlspecialchars($transaction_owner['first_name'] . ' ' . $transaction_owner['last_name']); ?></strong> 
        (<?php echo htmlspecialchars($transaction_owner['email']); ?>)
    </div>
<?php endif; ?>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-row">
                <div class="form-group">
                    <label for="type">Type *</label>
                    <select id="type" name="type" required>
                        <option value="Income" <?php echo $transaction['type'] == 'Income' ? 'selected' : ''; ?>>Income</option>
                        <option value="Expense" <?php echo $transaction['type'] == 'Expense' ? 'selected' : ''; ?>>Expense</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="category">Category *</label>
                    <input type="text" id="category" name="category" value="<?php echo htmlspecialchars($transaction['category']); ?>" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="amount">Amount *</label>
                    <input type="number" id="amount" name="amount" step="0.01" min="0" value="<?php echo $transaction['amount']; ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="transaction_date">Date *</label>
                    <input type="date" id="transaction_date" name="transaction_date" value="<?php echo $transaction['transaction_date']; ?>" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="property_id">Property</label>
                    <select id="property_id" name="property_id">
                        <option value="">Select Property</option>
                        <?php foreach ($properties_result as $property): ?>
                            <option value="<?php echo $property['id']; ?>" <?php echo ($transaction['property_id'] == $property['id']) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($property['display_name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="tenant_id">Tenant</label>
                    <select id="tenant_id" name="tenant_id">
                        <option value="">Select Tenant</option>
                        <?php while ($tenant = $tenants->fetch_assoc()): ?>
                            <option value="<?php echo $tenant['id']; ?>" <?php echo ($transaction['tenant_id'] == $tenant['id']) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name'] . ' - ' . $tenant['property_name']); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="payment_method">Payment Method</label>
                    <select id="payment_method" name="payment_method">
                        <option value="Bank Transfer" <?php echo $transaction['payment_method'] == 'Bank Transfer' ? 'selected' : ''; ?>>Bank Transfer</option>
                        <option value="Cash" <?php echo $transaction['payment_method'] == 'Cash' ? 'selected' : ''; ?>>Cash</option>
                        <option value="Check" <?php echo $transaction['payment_method'] == 'Check' ? 'selected' : ''; ?>>Check</option>
                        <option value="Credit Card" <?php echo $transaction['payment_method'] == 'Credit Card' ? 'selected' : ''; ?>>Credit Card</option>
                        <option value="Other" <?php echo $transaction['payment_method'] == 'Other' ? 'selected' : ''; ?>>Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="reference_number">Reference Number</label>
                    <input type="text" id="reference_number" name="reference_number" value="<?php echo htmlspecialchars($transaction['reference_number'] ?? ''); ?>">
                </div>
            </div>
            
            <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" name="description" rows="3"><?php echo htmlspecialchars($transaction['description'] ?? ''); ?></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Transaction</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
