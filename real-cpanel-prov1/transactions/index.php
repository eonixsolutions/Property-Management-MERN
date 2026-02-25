<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if user has admin privileges
$current_user = $conn->query("SELECT role FROM users WHERE id = $user_id")->fetch_assoc();
$user_role = $current_user['role'] ?? 'User';
$is_admin = in_array($user_role, ['Super Admin', 'Admin', 'Manager']);
$is_super_admin = $user_role == 'Super Admin';
$can_delete_any = in_array($user_role, ['Super Admin', 'Admin']); // Only Super Admin and Admin can delete any transaction

// Handle delete
if (isset($_GET['delete']) && is_numeric($_GET['delete'])) {
    $transaction_id = intval($_GET['delete']);
    $source = isset($_GET['source']) ? $_GET['source'] : 'transaction';
    
    if ($source == 'owner_rent') {
        // Delete from owner_payments table
        if ($can_delete_any) {
            // Super Admin and Admin can delete any owner payment
            $stmt = $conn->prepare("DELETE FROM owner_payments WHERE id = ?");
            $stmt->bind_param("i", $transaction_id);
        } else {
            // Regular users and Managers can only delete their own owner payments
            $stmt = $conn->prepare("DELETE FROM owner_payments WHERE id = ? AND user_id = ?");
            $stmt->bind_param("ii", $transaction_id, $user_id);
        }
    } else {
        // Delete from transactions table
        if ($can_delete_any) {
            // Super Admin and Admin can delete any transaction
            $stmt = $conn->prepare("DELETE FROM transactions WHERE id = ?");
            $stmt->bind_param("i", $transaction_id);
        } else {
            // Regular users and Managers can only delete their own transactions
            $stmt = $conn->prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?");
            $stmt->bind_param("ii", $transaction_id, $user_id);
        }
    }
    
    $stmt->execute();
    $stmt->close();
    header('Location: index.php?deleted=1');
    exit();
}

// Check if owner_payments table exists
$check_owner_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_table = $check_owner_table->num_rows > 0;

// Get search and filter parameters
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$type_filter = isset($_GET['type']) ? $conn->real_escape_string($_GET['type']) : '';
$month_filter = isset($_GET['month']) ? $conn->real_escape_string($_GET['month']) : date('Y-m');
$category_filter = isset($_GET['category']) ? $conn->real_escape_string($_GET['category']) : '';

// Build UNION query to include transactions, rent payments, and owner rent
// Admins can see all transactions, regular users only see their own
$transactions_query = "SELECT 
    t.id,
    t.transaction_date as date,
    t.type,
    t.category,
    t.amount,
    t.description,
    p.property_name,
    tn.first_name,
    tn.last_name,
    'transaction' as source,
    t.user_id as transaction_user_id,
    u.email as transaction_user_email,
    CONCAT(u.first_name, ' ', u.last_name) as transaction_user_name
    FROM transactions t
    LEFT JOIN properties p ON t.property_id = p.id
    LEFT JOIN tenants tn ON t.tenant_id = tn.id
    LEFT JOIN users u ON t.user_id = u.id
    " . ($is_admin ? "" : "WHERE t.user_id = $user_id");

// Add rent payments (as Income)
$rent_user_filter = $is_admin ? "WHERE rp.status = 'Paid'" : "WHERE p.user_id = $user_id AND rp.status = 'Paid'";
$transactions_query .= "
UNION ALL
SELECT 
    rp.id,
    rp.paid_date as date,
    'Income' as type,
    'Rent Collection' as category,
    rp.amount,
    CONCAT('Rent payment for ', DATE_FORMAT(rp.due_date, '%M %Y')) as description,
    p.property_name,
    tn.first_name,
    tn.last_name,
    'rent_payment' as source,
    p.user_id as transaction_user_id,
    u.email as transaction_user_email,
    CONCAT(u.first_name, ' ', u.last_name) as transaction_user_name
    FROM rent_payments rp
    INNER JOIN tenants tn ON rp.tenant_id = tn.id
    INNER JOIN properties p ON rp.property_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    $rent_user_filter";

// Add owner rent payments (as Expense)
if ($has_owner_table) {
    $owner_user_filter = $is_admin ? "WHERE op.status = 'Paid'" : "WHERE op.user_id = $user_id AND op.status = 'Paid'";
    $transactions_query .= "
UNION ALL
SELECT 
    op.id,
    op.paid_date as date,
    'Expense' as type,
    'Rent Paid to Owner' as category,
    op.amount,
    CONCAT('Rent to owner - ', DATE_FORMAT(op.payment_month, '%M %Y')) as description,
    p.property_name,
    NULL as first_name,
    NULL as last_name,
    'owner_rent' as source,
    op.user_id as transaction_user_id,
    u.email as transaction_user_email,
    CONCAT(u.first_name, ' ', u.last_name) as transaction_user_name
    FROM owner_payments op
    INNER JOIN properties p ON op.property_id = p.id
    LEFT JOIN users u ON op.user_id = u.id
    $owner_user_filter";
}

$transactions_query .= "
ORDER BY date DESC, id DESC";

// Apply filters to the entire result set
$all_transactions_result = $conn->query($transactions_query);
$all_transactions = [];
while ($row = $all_transactions_result->fetch_assoc()) {
    // Apply search filter
    if (!empty($search)) {
        $search_fields = $row['description'] . ' ' . $row['category'] . ' ' . $row['property_name'];
        if (!empty($row['first_name'])) {
            $search_fields .= ' ' . $row['first_name'] . ' ' . $row['last_name'];
        }
        if (stripos($search_fields, $search) === false) {
            continue;
        }
    }
    
    // Apply type filter
    if ($type_filter && $row['type'] != $type_filter) {
        continue;
    }
    
    // Apply month filter
    if ($month_filter && date('Y-m', strtotime($row['date'])) != $month_filter) {
        continue;
    }
    
    // Apply category filter
    if (!empty($category_filter) && $row['category'] != $category_filter) {
        continue;
    }
    
    $all_transactions[] = $row;
}

// Get totals
$income_total = 0;
$expense_total = 0;
foreach ($all_transactions as $t) {
    if ($t['type'] == 'Income') {
        $income_total += $t['amount'];
    } else {
        $expense_total += $t['amount'];
    }
}

// Get distinct categories for filter from all transactions (including rent categories)
$categories_for_dropdown = $conn->query("SELECT DISTINCT category FROM transactions WHERE user_id = $user_id AND category IS NOT NULL AND category != '' ORDER BY category");

closeDBConnection($conn);

// Build array of categories including rent categories
$all_categories = [];
while ($cat = $categories_for_dropdown->fetch_assoc()) {
    $all_categories[] = $cat['category'];
}
// Add rent categories if they exist in the transactions
$has_rent_collection = false;
$has_owner_rent = false;
foreach ($all_transactions as $t) {
    if ($t['category'] == 'Rent Collection') {
        $has_rent_collection = true;
    }
    if ($t['category'] == 'Rent Paid to Owner') {
        $has_owner_rent = true;
    }
}
if ($has_rent_collection && !in_array('Rent Collection', $all_categories)) {
    $all_categories[] = 'Rent Collection';
}
if ($has_owner_rent && !in_array('Rent Paid to Owner', $all_categories)) {
    $all_categories[] = 'Rent Paid to Owner';
}
sort($all_categories);

$page_title = 'Income & Expenses';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Income & Expenses</h1>
    <a href="add.php" class="btn btn-primary">+ Add Transaction</a>
</div>

<?php if (isset($_GET['deleted'])): ?>
    <div class="alert alert-success">Transaction deleted successfully!</div>
<?php endif; ?>

<?php if (isset($_GET['added'])): ?>
    <div class="alert alert-success">Transaction added successfully!</div>
<?php endif; ?>

<div class="stats-grid" style="margin-bottom: 30px;">
    <div class="stat-card stat-income">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($income_total); ?></h3>
            <p>Total Income</p>
        </div>
    </div>
    <div class="stat-card stat-expense">
        <div class="stat-icon">💸</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($expense_total); ?></h3>
            <p>Total Expenses</p>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($income_total - $expense_total); ?></h3>
            <p>Net Profit</p>
        </div>
    </div>
</div>

<!-- Search and Filter -->
<div class="content-card" style="margin-bottom: 20px;">
    <div class="card-body">
        <form method="GET" action="" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 12px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="search" style="font-size: 12px; margin-bottom: 4px;">Search</label>
                    <input type="text" id="search" name="search" placeholder="Search by description, category, property, tenant..." value="<?php echo htmlspecialchars($search); ?>" style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="type_filter" style="font-size: 12px; margin-bottom: 4px;">Type</label>
                    <select id="type_filter" name="type" style="width: 100%;">
                        <option value="">All Types</option>
                        <option value="Income" <?php echo $type_filter == 'Income' ? 'selected' : ''; ?>>Income</option>
                        <option value="Expense" <?php echo $type_filter == 'Expense' ? 'selected' : ''; ?>>Expense</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="category_filter" style="font-size: 12px; margin-bottom: 4px;">Category</label>
                    <select id="category_filter" name="category" style="width: 100%;">
                        <option value="">All Categories</option>
                        <?php foreach ($all_categories as $cat): ?>
                            <option value="<?php echo htmlspecialchars($cat); ?>" <?php echo $category_filter == $cat ? 'selected' : ''; ?>><?php echo htmlspecialchars($cat); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="month_filter" style="font-size: 12px; margin-bottom: 4px;">Month</label>
                    <input type="month" id="month_filter" name="month" value="<?php echo htmlspecialchars($month_filter); ?>" style="width: 100%;">
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="btn btn-primary">🔍 Search</button>
                    <?php if (!empty($search) || !empty($type_filter) || !empty($category_filter) || !empty($month_filter)): ?>
                        <a href="index.php" class="btn">Clear</a>
                    <?php endif; ?>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="content-card">
    <div class="card-header">
        <h2>Transactions</h2>
    </div>
    <div class="card-body">
        <?php if (count($all_transactions) > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Property</th>
                            <th>Tenant</th>
                            <th>Amount</th>
                            <th>Description</th>
                            <?php if ($is_admin): ?>
                            <th>User</th>
                            <?php endif; ?>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($all_transactions as $transaction): ?>
                            <tr>
                                <td><?php echo formatDate($transaction['date']); ?></td>
                                <td>
                                    <span class="badge badge-<?php echo $transaction['type'] == 'Income' ? 'success' : 'danger'; ?>">
                                        <?php echo $transaction['type']; ?>
                                    </span>
                                </td>
                                <td><?php echo htmlspecialchars($transaction['category']); ?></td>
                                <td><?php echo htmlspecialchars($transaction['property_name'] ?? '-'); ?></td>
                                <td><?php echo $transaction['first_name'] ? htmlspecialchars($transaction['first_name'] . ' ' . $transaction['last_name']) : '-'; ?></td>
                                <td class="<?php echo $transaction['type'] == 'Income' ? 'text-success' : 'text-danger'; ?>">
                                    <?php echo $transaction['type'] == 'Income' ? '+' : '-'; ?><?php echo formatCurrency($transaction['amount']); ?>
                                </td>
                                <td><?php echo htmlspecialchars($transaction['description'] ?? '-'); ?></td>
                                <?php if ($is_admin): ?>
                                <td>
                                    <?php if (!empty($transaction['transaction_user_name'])): ?>
                                        <span style="font-size: 12px; color: #666;">
                                            <?php echo htmlspecialchars($transaction['transaction_user_name']); ?>
                                        </span>
                                    <?php else: ?>
                                        <span class="text-muted">-</span>
                                    <?php endif; ?>
                                </td>
                                <?php endif; ?>
                                <td>
                                    <?php if ($transaction['source'] == 'transaction'): ?>
                                        <a href="edit.php?id=<?php echo $transaction['id']; ?>" class="btn-link">Edit</a>
                                        <?php 
                                        // Only show delete button if user can delete this transaction
                                        // Super Admin and Admin can delete any, others can only delete their own
                                        $can_delete_this = $can_delete_any || ($transaction['transaction_user_id'] == $user_id);
                                        if ($can_delete_this): ?>
                                        <a href="?delete=<?php echo $transaction['id']; ?>" 
                                           onclick="return confirmDelete('Are you sure you want to delete this transaction?')" 
                                           class="btn-link text-danger">Delete</a>
                                        <?php endif; ?>
                                    <?php elseif ($transaction['source'] == 'owner_rent'): ?>
                                        <?php 
                                        // Check if user can edit/delete this owner payment
                                        $can_delete_owner_payment = $can_delete_any || ($transaction['transaction_user_id'] == $user_id);
                                        if ($can_delete_owner_payment): ?>
                                        <a href="../owners/edit.php?id=<?php echo $transaction['id']; ?>" class="btn-link">Edit</a>
                                        <a href="?delete=<?php echo $transaction['id']; ?>&source=owner_rent" 
                                           onclick="return confirmDelete('Are you sure you want to delete this owner payment?')" 
                                           class="btn-link text-danger">Delete</a>
                                        <?php else: ?>
                                        <span class="text-muted" style="font-size: 12px;">Owner Payment</span>
                                        <?php endif; ?>
                                    <?php else: ?>
                                        <span class="text-muted" style="font-size: 12px;">
                                            <?php if ($transaction['source'] == 'rent_payment'): ?>
                                                Rent Record
                                            <?php endif; ?>
                                        </span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <div class="text-center" style="padding: 60px 20px;">
                <p class="text-muted" style="font-size: 18px; margin-bottom: 20px;">No transactions found</p>
                <a href="add.php" class="btn btn-primary">Add Your First Transaction</a>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
