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

// Check if user has admin privileges (moved before mark_paid handler)
$current_user = $conn->query("SELECT role FROM users WHERE id = $user_id")->fetch_assoc();
$user_role = $current_user['role'] ?? 'User';
$can_delete_any = in_array($user_role, ['Super Admin', 'Admin']);

// Handle mark as paid
if (isset($_GET['mark_paid']) && is_numeric($_GET['mark_paid'])) {
    $payment_id = intval($_GET['mark_paid']);
    $paid_date = date('Y-m-d');
    
    if ($can_delete_any) {
        // Super Admin and Admin can mark any payment as paid
        $stmt = $conn->prepare("UPDATE owner_payments SET status = 'Paid', paid_date = ? WHERE id = ?");
        $stmt->bind_param("si", $paid_date, $payment_id);
    } else {
        // Regular users and Managers can only mark their own payments as paid
        $stmt = $conn->prepare("UPDATE owner_payments SET status = 'Paid', paid_date = ? WHERE id = ? AND user_id = ?");
        $stmt->bind_param("sii", $paid_date, $payment_id, $user_id);
    }
    
    $stmt->execute();
    $stmt->close();
    
    header('Location: index.php?paid=1');
    exit();
}

// Handle delete
if (isset($_GET['delete']) && is_numeric($_GET['delete'])) {
    $payment_id = intval($_GET['delete']);
    
    if ($can_delete_any) {
        // Super Admin and Admin can delete any owner payment
        $stmt = $conn->prepare("DELETE FROM owner_payments WHERE id = ?");
        $stmt->bind_param("i", $payment_id);
    } else {
        // Regular users and Managers can only delete their own owner payments
        $stmt = $conn->prepare("DELETE FROM owner_payments WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $payment_id, $user_id);
    }
    
    $stmt->execute();
    $stmt->close();
    header('Location: index.php?deleted=1');
    exit();
}

// Get search and filter parameters
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$month = isset($_GET['month']) ? $conn->real_escape_string($_GET['month']) : date('Y-m');
$status_filter = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : '';
$property_filter = isset($_GET['property']) ? intval($_GET['property']) : 0;

// Build WHERE clause - Admins can see all, others see only their own
$where_clause = $can_delete_any 
    ? "DATE_FORMAT(op.payment_month, '%Y-%m') = '$month'"
    : "op.user_id = $user_id AND DATE_FORMAT(op.payment_month, '%Y-%m') = '$month'";

if (!empty($search)) {
    $where_clause .= " AND (p.property_name LIKE '%$search%' OR p.owner_name LIKE '%$search%')";
}

if (!empty($status_filter)) {
    $where_clause .= " AND op.status = '$status_filter'";
}

if ($property_filter > 0) {
    $where_clause .= " AND op.property_id = $property_filter";
}

// Get owner payments
$owner_payments = $conn->query("SELECT op.*, p.property_name, p.owner_name, p.monthly_rent_to_owner
    FROM owner_payments op
    INNER JOIN properties p ON op.property_id = p.id
    WHERE $where_clause
    ORDER BY op.payment_month DESC, op.status ASC");

// Get statistics
$stats_where = $can_delete_any 
    ? "op.status = 'Pending' AND DATE_FORMAT(op.payment_month, '%Y-%m') = '$month'"
    : "op.user_id = $user_id AND op.status = 'Pending' AND DATE_FORMAT(op.payment_month, '%Y-%m') = '$month'";
    
$total_pending = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM owner_payments op
    INNER JOIN properties p ON op.property_id = p.id
    WHERE $stats_where")->fetch_assoc()['total'];

$stats_where_paid = $can_delete_any 
    ? "op.status = 'Paid' AND DATE_FORMAT(op.payment_month, '%Y-%m') = '$month'"
    : "op.user_id = $user_id AND op.status = 'Paid' AND DATE_FORMAT(op.payment_month, '%Y-%m') = '$month'";

$total_paid = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM owner_payments op
    INNER JOIN properties p ON op.property_id = p.id
    WHERE $stats_where_paid")->fetch_assoc()['total'];

// Get properties with owners for filter with parent property info
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

if ($has_unit_fields) {
    $properties_with_owners_query = "SELECT p.id, p.property_name, p.owner_name, p.monthly_rent_to_owner, 
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
    $properties_with_owners_query = "SELECT id, property_name, owner_name, monthly_rent_to_owner
                                        FROM properties 
                                        WHERE user_id = $user_id AND owner_name IS NOT NULL AND owner_name != '' AND monthly_rent_to_owner > 0
                                        ORDER BY property_name";
}
$properties_with_owners = $conn->query($properties_with_owners_query);

$page_title = 'Owner Payments';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Owner Rent Payments</h1>
    <div>
        <a href="generate.php" class="btn">🔄 Generate Recurring</a>
        <a href="add.php" class="btn btn-primary" style="margin-left: 12px;">+ Record Payment</a>
    </div>
</div>

<?php if (isset($_GET['paid'])): ?>
    <div class="alert alert-success">Payment marked as paid!</div>
<?php endif; ?>

<?php if (isset($_GET['deleted'])): ?>
    <div class="alert alert-success">Payment deleted successfully!</div>
<?php endif; ?>

<div class="stats-grid" style="margin-bottom: 30px;">
    <div class="stat-card stat-expense">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_pending); ?></h3>
            <p>Pending Payments</p>
        </div>
    </div>
    <div class="stat-card stat-income">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_paid); ?></h3>
            <p>Paid This Month</p>
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
                    <input type="text" id="search" name="search" placeholder="Search by property or owner..." value="<?php echo htmlspecialchars($search); ?>" style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="month_filter" style="font-size: 12px; margin-bottom: 4px;">Month</label>
                    <input type="month" id="month_filter" name="month" value="<?php echo htmlspecialchars($month); ?>" style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="status_filter" style="font-size: 12px; margin-bottom: 4px;">Status</label>
                    <select id="status_filter" name="status" style="width: 100%;">
                        <option value="">All Statuses</option>
                        <option value="Pending" <?php echo $status_filter == 'Pending' ? 'selected' : ''; ?>>Pending</option>
                        <option value="Paid" <?php echo $status_filter == 'Paid' ? 'selected' : ''; ?>>Paid</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="property_filter" style="font-size: 12px; margin-bottom: 4px;">Property</label>
                    <select id="property_filter" name="property" style="width: 100%;">
                        <option value="">All Properties</option>
                        <?php while ($prop = $properties_with_owners->fetch_assoc()): 
                            $display_name = $prop['property_name'];
                            if ($has_unit_fields && !empty($prop['parent_property_id']) && !empty($prop['parent_property_name'])) {
                                $unit_display = !empty($prop['unit_name']) ? $prop['unit_name'] : $prop['property_name'];
                                $display_name = $prop['parent_property_name'] . ' - ' . $unit_display;
                            }
                        ?>
                            <option value="<?php echo $prop['id']; ?>" <?php echo $property_filter == $prop['id'] ? 'selected' : ''; ?>><?php echo htmlspecialchars($display_name); ?></option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="btn btn-primary">🔍 Search</button>
                    <?php if (!empty($search) || !empty($status_filter) || $property_filter > 0): ?>
                        <a href="index.php" class="btn">Clear</a>
                    <?php endif; ?>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="content-card">
    <div class="card-header">
        <h2>Owner Payments - <?php echo date('F Y', strtotime($month . '-01')); ?></h2>
    </div>
    <div class="card-body">
        <?php if ($owner_payments->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Property</th>
                            <th>Owner</th>
                            <th>Payment Month</th>
                            <th>Amount</th>
                            <th>Paid Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($payment = $owner_payments->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($payment['property_name']); ?></strong></td>
                                <td>
                                    <?php if (!empty($payment['owner_name'])): ?>
                                        <a href="profile.php?owner=<?php echo urlencode($payment['owner_name']); ?>" class="btn-link">
                                            <?php echo htmlspecialchars($payment['owner_name']); ?>
                                        </a>
                                    <?php else: ?>
                                        N/A
                                    <?php endif; ?>
                                </td>
                                <td><?php echo date('F Y', strtotime($payment['payment_month'])); ?></td>
                                <td><strong><?php echo formatCurrency($payment['amount']); ?></strong></td>
                                <td><?php echo $payment['paid_date'] ? formatDate($payment['paid_date']) : '-'; ?></td>
                                <td>
                                    <?php if ($payment['status'] == 'Paid'): ?>
                                        <span class="badge badge-success">Paid</span>
                                    <?php else: ?>
                                        <span class="badge badge-warning">Pending</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php 
                                    // Check if user can edit/delete this payment
                                    $can_edit_delete = $can_delete_any || ($payment['user_id'] == $user_id);
                                    ?>
                                    <?php if ($can_edit_delete && $payment['status'] == 'Pending'): ?>
                                        <a href="index.php?mark_paid=<?php echo $payment['id']; ?>" 
                                           class="btn btn-success" style="padding: 6px 12px; font-size: 12px;">Mark Paid</a>
                                    <?php endif; ?>
                                    <?php if ($can_edit_delete): ?>
                                    <a href="edit.php?id=<?php echo $payment['id']; ?>" class="btn-link">Edit</a>
                                    <a href="index.php?delete=<?php echo $payment['id']; ?>" 
                                       class="btn-link text-danger" 
                                       onclick="return confirm('Are you sure you want to delete this payment?');">Delete</a>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-muted">No owner payments found for this month.</p>
            <?php if ($properties_with_owners->num_rows > 0): ?>
                <p style="margin-top: 20px;">
                    <a href="add.php" class="btn btn-primary">Record First Payment</a>
                </p>
            <?php else: ?>
                <p style="margin-top: 20px; color: #64748b;">
                    No properties with owners found. Add owner information in property settings to track owner rent payments.
                </p>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</div>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>
