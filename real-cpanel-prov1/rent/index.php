<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Handle payment
if (isset($_GET['mark_paid']) && is_numeric($_GET['mark_paid'])) {
    $payment_id = intval($_GET['mark_paid']);
    $paid_date = date('Y-m-d');
    
    $stmt = $conn->prepare("UPDATE rent_payments SET status = 'Paid', paid_date = ? WHERE id = ? AND property_id IN (SELECT id FROM properties WHERE user_id = ?)");
    $stmt->bind_param("sii", $paid_date, $payment_id, $user_id);
    $stmt->execute();
    $stmt->close();
    
    header('Location: index.php?paid=1');
    exit();
}

// Handle generate rent payments for all tenants
if (isset($_GET['generate_all_rent']) && $_GET['generate_all_rent'] == '1') {
    require_once '../includes/recurring_invoices.php';
    
    // Get all active tenants with lease_start
    $tenants = $conn->query("SELECT t.id FROM tenants t
        INNER JOIN properties p ON t.property_id = p.id
        WHERE p.user_id = $user_id AND t.status = 'Active' AND t.lease_start IS NOT NULL AND t.lease_start != ''");
    
    $total_generated = 0;
    while ($tenant = $tenants->fetch_assoc()) {
        $result = generateRecurringInvoices($tenant['id'], $conn);
        if ($result !== false) {
            $total_generated += $result;
        }
    }
    
    header('Location: index.php?rent_generated=1&count=' . $total_generated);
    exit();
}

// Get all rent payments
$month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
$filter = isset($_GET['filter']) ? $_GET['filter'] : 'current';
$today = date('Y-m-d');
$current_month = date('Y-m');

$where_clause = "p.user_id = $user_id";
if ($filter == 'all') {
    // Show all payments regardless of month
    $month_filter = "";
} else {
    // Show only current month (default)
    $where_clause .= " AND DATE_FORMAT(rp.due_date, '%Y-%m') = '$current_month'";
    $month_filter = "AND DATE_FORMAT(rp.due_date, '%Y-%m') = '$current_month'";
}

$rent_payments = $conn->query("SELECT rp.*, t.first_name, t.last_name, t.email, t.phone, p.property_name
    FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE $where_clause
    ORDER BY rp.due_date ASC, rp.status ASC");

// Get statistics
if ($filter == 'all') {
    // Show all payments statistics
    $total_due = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments rp
        INNER JOIN properties p ON rp.property_id = p.id
        WHERE p.user_id = $user_id AND rp.status != 'Paid'")->fetch_assoc()['total'];

    $total_paid = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments rp
        INNER JOIN properties p ON rp.property_id = p.id
        WHERE p.user_id = $user_id AND rp.status = 'Paid'")->fetch_assoc()['total'];
} else {
    // Show current month statistics
    $total_due = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments rp
        INNER JOIN properties p ON rp.property_id = p.id
        WHERE p.user_id = $user_id AND DATE_FORMAT(rp.due_date, '%Y-%m') = '$current_month' AND rp.status != 'Paid'")->fetch_assoc()['total'];

    $total_paid = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments rp
        INNER JOIN properties p ON rp.property_id = p.id
        WHERE p.user_id = $user_id AND DATE_FORMAT(rp.due_date, '%Y-%m') = '$current_month' AND rp.status = 'Paid'")->fetch_assoc()['total'];
}

closeDBConnection($conn);

$page_title = 'Rent Collection';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Rent Collection</h1>
    <div>
        <div style="display: inline-block; margin-left: 12px;">
            <a href="index.php?filter=all" class="btn <?php echo $filter == 'all' ? 'btn-primary' : ''; ?>" style="margin-right: 8px;">All</a>
            <a href="index.php?filter=current" class="btn <?php echo $filter == 'current' ? 'btn-primary' : ''; ?>">Current</a>
        </div>
        <a href="?generate_all_rent=1" class="btn btn-info" style="margin-left: 12px;" onclick="return confirm('This will generate rent payments for all active tenants from their lease start to current month. Continue?');">💰 Generate All Rent</a>
        <a href="add.php" class="btn btn-primary" style="margin-left: 12px;">+ Record Payment</a>
    </div>
</div>

<?php if (isset($_GET['paid'])): ?>
    <div class="alert alert-success">Payment marked as paid!</div>
<?php endif; ?>

<?php if (isset($_GET['rent_generated']) && $_GET['rent_generated'] == '1'): ?>
    <div class="alert alert-success">
        <strong>✓ Success!</strong> Generated <?php echo intval($_GET['count'] ?? 0); ?> rent payment(s) for all active tenants.
    </div>
<?php endif; ?>

<?php 
// Calculate overdue payments for display (always show if there are any)
$overdue_count = $conn->query("SELECT COUNT(*) as total FROM rent_payments rp
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND (rp.status = 'Overdue' OR (rp.status = 'Pending' AND rp.due_date < '$today'))")->fetch_assoc()['total'];
$overdue_amount = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments rp
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND (rp.status = 'Overdue' OR (rp.status = 'Pending' AND rp.due_date < '$today'))")->fetch_assoc()['total'];

if ($overdue_count > 0): ?>
    <div class="alert alert-error" style="background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <strong>⚠️ Overdue Payments:</strong> You have <strong><?php echo $overdue_count; ?></strong> overdue payment(s) totaling <strong><?php echo formatCurrency($overdue_amount); ?></strong>
    </div>
<?php endif; ?>

<div class="stats-grid" style="margin-bottom: 30px;">
    <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_paid); ?></h3>
            <p>Total Paid</p>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_due); ?></h3>
            <p>Total Due</p>
            <?php if (isset($overdue_count) && $overdue_count > 0): ?>
                <p style="font-size: 12px; color: #ef4444; margin-top: 4px;"><?php echo $overdue_count; ?> overdue</p>
            <?php endif; ?>
        </div>
    </div>
</div>

<div class="content-card">
    <div class="card-body">
        <?php if ($rent_payments->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tenant</th>
                            <th>Property</th>
                            <th>Due Date</th>
                            <th>Paid Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($rent = $rent_payments->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($rent['first_name'] . ' ' . $rent['last_name']); ?></strong></td>
                                <td><?php echo htmlspecialchars($rent['property_name']); ?></td>
                                <td><?php echo formatDate($rent['due_date']); ?></td>
                                <td><?php echo $rent['paid_date'] ? formatDate($rent['paid_date']) : '-'; ?></td>
                                <td><?php echo formatCurrency($rent['amount']); ?></td>
                                <td>
                                    <span class="badge badge-<?php 
                                        echo $rent['status'] == 'Paid' ? 'success' : 
                                            ($rent['status'] == 'Overdue' ? 'danger' : 'warning'); 
                                    ?>">
                                        <?php echo htmlspecialchars($rent['status']); ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if ($rent['status'] != 'Paid'): ?>
                                        <a href="?mark_paid=<?php echo $rent['id']; ?>&filter=<?php echo urlencode($filter); ?>" 
                                           class="btn btn-success" style="padding: 6px 12px; font-size: 12px;">Mark Paid</a>
                                    <?php else: ?>
                                        <span class="text-muted">-</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <div class="text-center" style="padding: 60px 20px;">
                <p class="text-muted" style="font-size: 18px;">No rent payments <?php echo $filter == 'current' ? 'for current month' : 'found'; ?></p>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
