<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header('Location: index.php');
    exit();
}

$tenant_id = intval($_GET['id']);

// Handle rent payment generation
if (isset($_GET['generate_rent']) && $_GET['generate_rent'] == '1') {
    require_once '../includes/recurring_invoices.php';
    $invoices_created = generateRecurringInvoices($tenant_id, $conn);
    
    if ($invoices_created > 0) {
        header('Location: view.php?id=' . $tenant_id . '&rent_generated=1&count=' . $invoices_created);
    } else {
        header('Location: view.php?id=' . $tenant_id . '&rent_generated=0');
    }
    exit();
}

// Get tenant details
$tenant = $conn->query("SELECT t.*, p.property_name, p.address
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE t.id = $tenant_id AND p.user_id = $user_id")->fetch_assoc();

if (!$tenant) {
    header('Location: index.php');
    exit();
}

// Get rent payments
$rent_payments = $conn->query("SELECT * FROM rent_payments WHERE tenant_id = $tenant_id ORDER BY due_date DESC LIMIT 10");

// Get rent payment statistics
$rent_stats = $conn->query("SELECT 
    COUNT(*) as total_payments,
    SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) as total_paid,
    SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END) as total_pending,
    SUM(CASE WHEN status = 'Overdue' THEN amount ELSE 0 END) as total_overdue
    FROM rent_payments WHERE tenant_id = $tenant_id")->fetch_assoc();

// Get maintenance requests for this tenant
$maintenance_requests = $conn->query("SELECT * FROM maintenance_requests WHERE tenant_id = $tenant_id ORDER BY created_at DESC LIMIT 5");

// Get transactions related to this tenant
$transactions = $conn->query("SELECT * FROM transactions WHERE tenant_id = $tenant_id ORDER BY transaction_date DESC LIMIT 10");

// Get tenant cheques if table exists
$check_cheque_table = $conn->query("SHOW TABLES LIKE 'tenant_cheques'");
$has_cheque_table = $check_cheque_table->num_rows > 0;

$tenant_cheques = null;
if ($has_cheque_table) {
    $tenant_cheques = $conn->query("SELECT tc.* FROM tenant_cheques tc
        WHERE tc.tenant_id = $tenant_id 
        ORDER BY tc.deposit_date ASC, tc.cheque_date ASC");
}

closeDBConnection($conn);

$page_title = 'View Tenant';
include '../includes/header.php';

// Show success/error message for rent generation
if (isset($_GET['rent_generated'])) {
    if ($_GET['rent_generated'] == '1' && isset($_GET['count'])) {
        echo '<div class="alert alert-success" style="margin-bottom: 20px; padding: 12px 16px; background: #d1fae5; color: #065f46; border-radius: 6px; border: 1px solid #10b981;">
            <strong>✓ Success!</strong> Generated ' . intval($_GET['count']) . ' rent payment(s) for this tenant.
        </div>';
    } else {
        echo '<div class="alert alert-info" style="margin-bottom: 20px; padding: 12px 16px; background: #dbeafe; color: #1e40af; border-radius: 6px; border: 1px solid #3b82f6;">
            <strong>Info:</strong> No new rent payments generated. They may already exist or tenant information is incomplete.
        </div>';
    }
}
?>

<div class="page-actions">
    <h1><?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']); ?></h1>
    <div style="display: flex; gap: 8px;">
        <a href="edit.php?id=<?php echo $tenant['id']; ?>" class="btn btn-primary">Edit Tenant</a>
        <a href="../contracts/index.php?tenant_id=<?php echo $tenant['id']; ?>" class="btn btn-success">📄 Generate Contract</a>
        <?php if ($tenant['status'] == 'Active' && !empty($tenant['lease_start'])): ?>
            <a href="?id=<?php echo $tenant['id']; ?>&generate_rent=1" class="btn btn-info" onclick="return confirm('This will generate rent payments for all months from lease start<?php echo !empty($tenant['lease_end']) ? ' to lease end' : ' (up to 12 months from now)'; ?>, including past months. Continue?');">💰 Generate Rent Payments</a>
        <?php endif; ?>
        <a href="index.php" class="btn-link">← Back to Tenants</a>
    </div>
</div>

<div class="dashboard-grid">
    <div class="content-card">
        <div class="card-header">
            <h2>Tenant Information</h2>
        </div>
        <div class="card-body">
            <table class="data-table">
                <tr>
                    <td><strong>Name</strong></td>
                    <td><?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']); ?></td>
                </tr>
                <tr>
                    <td><strong>Property</strong></td>
                    <td><?php echo htmlspecialchars($tenant['property_name']); ?></td>
                </tr>
                <tr>
                    <td><strong>Email</strong></td>
                    <td><?php echo htmlspecialchars($tenant['email'] ?? '-'); ?></td>
                </tr>
                <tr>
                    <td><strong>Phone</strong></td>
                    <td><?php echo htmlspecialchars($tenant['phone'] ?? '-'); ?></td>
                </tr>
                <?php if (!empty($tenant['qatar_id'])): ?>
                <tr>
                    <td><strong>Qatar ID Number</strong></td>
                    <td><?php echo htmlspecialchars($tenant['qatar_id']); ?></td>
                </tr>
                <?php endif; ?>
                <tr>
                    <td><strong>Monthly Rent</strong></td>
                    <td><?php echo formatCurrency($tenant['monthly_rent']); ?></td>
                </tr>
                <tr>
                    <td><strong>Security Deposit</strong></td>
                    <td><?php echo $tenant['security_deposit'] ? formatCurrency($tenant['security_deposit']) : '-'; ?></td>
                </tr>
                <tr>
                    <td><strong>Status</strong></td>
                    <td>
                        <span class="badge badge-<?php echo $tenant['status'] == 'Active' ? 'success' : 'info'; ?>">
                            <?php echo htmlspecialchars($tenant['status']); ?>
                        </span>
                    </td>
                </tr>
                <tr>
                    <td><strong>Move In Date</strong></td>
                    <td><?php echo formatDate($tenant['move_in_date'] ?? ''); ?></td>
                </tr>
                <tr>
                    <td><strong>Lease Start</strong></td>
                    <td><?php echo formatDate($tenant['lease_start'] ?? ''); ?></td>
                </tr>
                <tr>
                    <td><strong>Lease End</strong></td>
                    <td><?php echo formatDate($tenant['lease_end'] ?? ''); ?></td>
                </tr>
                <?php if ($tenant['notes']): ?>
                <tr>
                    <td><strong>Notes</strong></td>
                    <td><?php echo nl2br(htmlspecialchars($tenant['notes'])); ?></td>
                </tr>
                <?php endif; ?>
            </table>
        </div>
    </div>

    <!-- Tenant Statistics -->
    <div class="content-card">
        <div class="card-header">
            <h2>Rent Payment Statistics</h2>
        </div>
        <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #4f46e5;">
                        <?php echo $rent_stats['total_payments'] ?? 0; ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Total Payments</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #10b981;">
                        <?php echo formatCurrency($rent_stats['total_paid'] ?? 0); ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Total Paid</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">
                        <?php echo formatCurrency($rent_stats['total_pending'] ?? 0); ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Pending</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #ef4444;">
                        <?php echo formatCurrency($rent_stats['total_overdue'] ?? 0); ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Overdue</div>
                </div>
            </div>
        </div>
    </div>

    <div class="content-card">
        <div class="card-header">
            <h2>Recent Rent Payments</h2>
            <a href="../rent/add.php?tenant_id=<?php echo $tenant['id']; ?>" class="btn-link">+ Record Payment</a>
        </div>
        <div class="card-body">
            <?php if ($rent_payments && $rent_payments->num_rows > 0): ?>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Due Date</th>
                                <th>Paid Date</th>
                                <th>Amount</th>
                                <th>Payment Method</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $rent_payments->data_seek(0); // Reset pointer
                            while ($payment = $rent_payments->fetch_assoc()): ?>
                                <tr>
                                    <td><?php echo formatDate($payment['due_date']); ?></td>
                                    <td><?php echo $payment['paid_date'] ? formatDate($payment['paid_date']) : '-'; ?></td>
                                    <td><?php echo formatCurrency($payment['amount']); ?></td>
                                    <td><?php echo htmlspecialchars($payment['payment_method'] ?? '-'); ?></td>
                                    <td>
                                        <span class="badge badge-<?php echo $payment['status'] == 'Paid' ? 'success' : ($payment['status'] == 'Overdue' ? 'danger' : 'warning'); ?>">
                                            <?php echo htmlspecialchars($payment['status']); ?>
                                        </span>
                                    </td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <p class="text-muted">No rent payments recorded.</p>
            <?php endif; ?>
        </div>
    </div>

    <?php if ($has_cheque_table && $tenant_cheques): ?>
    <div class="content-card mt-20">
        <div class="card-header">
            <h2>💳 Tenant Cheques</h2>
            <a href="../cheques/add_tenant_cheque.php?tenant_id=<?php echo $tenant['id']; ?>" class="btn-link">+ Add Cheque</a>
        </div>
        <div class="card-body">
            <?php if ($tenant_cheques->num_rows > 0): ?>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Cheque #</th>
                                <th>Amount</th>
                                <th>Cheque Date</th>
                                <th>Deposit Date</th>
                                <th>Bank</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while ($cheque = $tenant_cheques->fetch_assoc()): ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($cheque['cheque_number']); ?></strong></td>
                                    <td class="text-success"><strong><?php echo formatCurrency($cheque['cheque_amount']); ?></strong></td>
                                    <td><?php echo formatDate($cheque['cheque_date']); ?></td>
                                    <td>
                                        <?php if ($cheque['deposit_date']): ?>
                                            <?php 
                                            $deposit_date = new DateTime($cheque['deposit_date']);
                                            $today_obj = new DateTime();
                                            $is_overdue = $deposit_date < $today_obj && $cheque['status'] == 'Pending';
                                            $is_upcoming = $deposit_date >= $today_obj && $deposit_date <= (new DateTime('+7 days'));
                                            ?>
                                            <span class="<?php echo $is_overdue ? 'text-danger' : ($is_upcoming ? 'text-warning' : ''); ?>">
                                                <?php echo formatDate($cheque['deposit_date']); ?>
                                            </span>
                                        <?php else: ?>
                                            <span class="text-muted">Not set</span>
                                        <?php endif; ?>
                                    </td>
                                    <td><?php echo htmlspecialchars($cheque['bank_name'] ?? '-'); ?></td>
                                    <td>
                                        <span class="badge badge-<?php 
                                            echo $cheque['status'] == 'Cleared' ? 'success' : 
                                                ($cheque['status'] == 'Deposited' ? 'info' : 
                                                ($cheque['status'] == 'Bounced' ? 'danger' : 'warning')); 
                                        ?>">
                                            <?php echo htmlspecialchars($cheque['status']); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <a href="../cheques/edit_tenant_cheque.php?id=<?php echo $cheque['id']; ?>" class="btn-link">Edit</a>
                                    </td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <p class="text-muted">No cheques recorded for this tenant.</p>
                <a href="../cheques/add_tenant_cheque.php?tenant_id=<?php echo $tenant['id']; ?>" class="btn btn-primary">Add First Cheque</a>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>

    <?php if (isset($maintenance_requests) && $maintenance_requests && $maintenance_requests->num_rows > 0): ?>
    <div class="content-card mt-20">
        <div class="card-header">
            <h2>🔧 Maintenance Requests</h2>
            <a href="../maintenance/add.php?tenant_id=<?php echo $tenant['id']; ?>" class="btn-link">+ Add Request</a>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Cost</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($request = $maintenance_requests->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($request['title']); ?></strong></td>
                                <td>
                                    <span class="badge badge-<?php 
                                        echo $request['priority'] == 'Emergency' ? 'danger' : 
                                            ($request['priority'] == 'High' ? 'warning' : 'info'); 
                                    ?>">
                                        <?php echo htmlspecialchars($request['priority']); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge badge-<?php 
                                        echo $request['status'] == 'Completed' ? 'success' : 
                                            ($request['status'] == 'In Progress' ? 'info' : 'warning'); 
                                    ?>">
                                        <?php echo htmlspecialchars($request['status']); ?>
                                    </span>
                                </td>
                                <td><?php echo $request['cost'] ? formatCurrency($request['cost']) : '-'; ?></td>
                                <td><?php echo formatDate($request['created_at']); ?></td>
                                <td>
                                    <a href="../maintenance/view.php?id=<?php echo $request['id']; ?>" class="btn-link">View</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <?php if (isset($transactions) && $transactions && $transactions->num_rows > 0): ?>
    <div class="content-card mt-20">
        <div class="card-header">
            <h2>💳 Related Transactions</h2>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($transaction = $transactions->fetch_assoc()): ?>
                            <tr>
                                <td><?php echo formatDate($transaction['transaction_date']); ?></td>
                                <td>
                                    <span class="badge badge-<?php echo $transaction['type'] == 'Income' ? 'success' : 'danger'; ?>">
                                        <?php echo htmlspecialchars($transaction['type']); ?>
                                    </span>
                                </td>
                                <td><?php echo htmlspecialchars($transaction['category']); ?></td>
                                <td class="<?php echo $transaction['type'] == 'Income' ? 'text-success' : 'text-danger'; ?>">
                                    <?php echo $transaction['type'] == 'Income' ? '+' : '-'; ?><?php echo formatCurrency($transaction['amount']); ?>
                                </td>
                                <td><?php echo htmlspecialchars($transaction['description'] ?? '-'); ?></td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <?php endif; ?>
</div>

<?php include '../includes/footer.php'; ?>
