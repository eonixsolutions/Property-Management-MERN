<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

$error = '';

// Get properties and tenants for dropdowns
$properties_result = getPropertiesForDropdown($conn, $user_id);
$tenants = $conn->query("SELECT t.id, t.first_name, t.last_name, p.property_name 
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE p.user_id = $user_id AND t.status = 'Active'
    ORDER BY t.first_name, t.last_name");

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
        $stmt = $conn->prepare("INSERT INTO transactions (user_id, property_id, tenant_id, type, category, amount, description, transaction_date, payment_method, reference_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iiissdssss", $user_id, $property_id, $tenant_id, $type, $category, $amount, $description, $transaction_date, $payment_method, $reference_number);
        
        if ($stmt->execute()) {
            header('Location: index.php?added=1');
            exit();
        } else {
            $error = 'Error adding transaction. Please try again.';
        }
        
        $stmt->close();
    }
}

closeDBConnection($conn);

$page_title = 'Add Transaction';
include '../includes/header.php';

$selected_property = isset($_GET['property_id']) ? intval($_GET['property_id']) : '';
?>

<div class="page-actions">
    <h1>Add Transaction</h1>
    <a href="index.php" class="btn-link">← Back to Transactions</a>
</div>

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
                        <option value="">Select Type</option>
                        <option value="Income">Income</option>
                        <option value="Expense">Expense</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="category">Category *</label>
                    <input type="text" id="category" name="category" list="categories" required>
                    <datalist id="categories">
                        <option value="Rent">
                        <option value="Security Deposit">
                        <option value="Maintenance">
                        <option value="Utilities">
                        <option value="Insurance">
                        <option value="Taxes">
                        <option value="Repairs">
                        <option value="Other">
                    </datalist>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="amount">Amount *</label>
                    <input type="number" id="amount" name="amount" step="0.01" min="0" required>
                </div>
                
                <div class="form-group">
                    <label for="transaction_date">Date *</label>
                    <input type="date" id="transaction_date" name="transaction_date" value="<?php echo date('Y-m-d'); ?>" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="property_id">Property</label>
                    <select id="property_id" name="property_id">
                        <option value="">Select Property</option>
                        <?php foreach ($properties_result as $property): ?>
                            <option value="<?php echo $property['id']; ?>" <?php echo ($selected_property == $property['id']) ? 'selected' : ''; ?>>
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
                            <option value="<?php echo $tenant['id']; ?>">
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
                <label for="description">Description</label>
                <textarea id="description" name="description" rows="3"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Add Transaction</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
