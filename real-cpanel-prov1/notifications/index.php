<?php
require_once '../config/config.php';
requireLogin();

require_once '../includes/notifications.php';

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Get all notifications
$notifications = getNotifications($user_id, $conn);

// Get detailed overdue payments
$overdue_payments = $conn->query("SELECT rp.*, t.first_name, t.last_name, t.email, t.phone, p.property_name,
    DATEDIFF(CURDATE(), rp.due_date) as days_overdue
    FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id 
    AND rp.status = 'Pending' 
    AND rp.due_date < CURDATE()
    ORDER BY rp.due_date ASC");

// Get upcoming rent (next 7 days)
$upcoming_payments = $conn->query("SELECT rp.*, t.first_name, t.last_name, p.property_name,
    DATEDIFF(rp.due_date, CURDATE()) as days_until_due
    FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id 
    AND rp.status = 'Pending' 
    AND rp.due_date >= CURDATE()
    AND rp.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY rp.due_date ASC");

// Get expiring leases
$expiring_leases = $conn->query("SELECT t.*, p.property_name,
    DATEDIFF(t.lease_end, CURDATE()) as days_until_expiry
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE p.user_id = $user_id 
    AND t.status = 'Active'
    AND t.lease_end IS NOT NULL
    AND t.lease_end >= CURDATE()
    AND t.lease_end <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    ORDER BY t.lease_end ASC");

closeDBConnection($conn);

$page_title = 'Notifications';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Notifications & Alerts</h1>
</div>

<!-- Overdue Rent Payments -->
<div class="content-card" style="margin-bottom: 30px;">
    <div class="card-header" style="background: #fee2e2; border-left: 4px solid var(--danger-color);">
        <h2>⚠️ Overdue Rent Payments</h2>
        <span class="badge badge-danger"><?php echo $overdue_payments->num_rows; ?></span>
    </div>
    <div class="card-body">
        <?php if ($overdue_payments->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tenant</th>
                            <th>Property</th>
                            <th>Due Date</th>
                            <th>Days Overdue</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($payment = $overdue_payments->fetch_assoc()): ?>
                            <tr style="background: <?php echo $payment['days_overdue'] > 30 ? '#fee2e2' : '#fef3c7'; ?>">
                                <td><strong><?php echo htmlspecialchars($payment['first_name'] . ' ' . $payment['last_name']); ?></strong></td>
                                <td><?php echo htmlspecialchars($payment['property_name']); ?></td>
                                <td><?php echo formatDate($payment['due_date']); ?></td>
                                <td>
                                    <span class="badge badge-danger">
                                        <?php echo $payment['days_overdue']; ?> days
                                    </span>
                                </td>
                                <td><strong><?php echo formatCurrency($payment['amount']); ?></strong></td>
                                <td>
                                    <a href="../rent/index.php?mark_paid=<?php echo $payment['id']; ?>" 
                                       class="btn btn-success" style="padding: 6px 12px; font-size: 12px;">Mark Paid</a>
                                    <a href="../tenants/view.php?id=<?php echo $payment['tenant_id']; ?>" 
                                       class="btn-link">Contact</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-muted">✅ No overdue payments. Great job!</p>
        <?php endif; ?>
    </div>
</div>

<!-- Upcoming Rent (Next 7 Days) -->
<div class="content-card" style="margin-bottom: 30px;">
    <div class="card-header" style="background: #fef3c7; border-left: 4px solid var(--warning-color);">
        <h2>📅 Rent Due Soon (Next 7 Days)</h2>
        <span class="badge badge-warning"><?php echo $upcoming_payments->num_rows; ?></span>
    </div>
    <div class="card-body">
        <?php if ($upcoming_payments->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tenant</th>
                            <th>Property</th>
                            <th>Due Date</th>
                            <th>Days Until Due</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($payment = $upcoming_payments->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($payment['first_name'] . ' ' . $payment['last_name']); ?></strong></td>
                                <td><?php echo htmlspecialchars($payment['property_name']); ?></td>
                                <td><?php echo formatDate($payment['due_date']); ?></td>
                                <td>
                                    <span class="badge badge-<?php echo $payment['days_until_due'] <= 3 ? 'warning' : 'info'; ?>">
                                        <?php echo $payment['days_until_due']; ?> days
                                    </span>
                                </td>
                                <td><strong><?php echo formatCurrency($payment['amount']); ?></strong></td>
                                <td>
                                    <span class="badge badge-warning"><?php echo $payment['status']; ?></span>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-muted">No payments due in the next 7 days.</p>
        <?php endif; ?>
    </div>
</div>

<!-- Expiring Leases -->
<div class="content-card">
    <div class="card-header" style="background: #dbeafe; border-left: 4px solid var(--info-color);">
        <h2>📋 Expiring Leases (Next 30 Days)</h2>
        <span class="badge badge-info"><?php echo $expiring_leases->num_rows; ?></span>
    </div>
    <div class="card-body">
        <?php if ($expiring_leases->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tenant</th>
                            <th>Property</th>
                            <th>Lease End Date</th>
                            <th>Days Until Expiry</th>
                            <th>Monthly Rent</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($tenant = $expiring_leases->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']); ?></strong></td>
                                <td><?php echo htmlspecialchars($tenant['property_name']); ?></td>
                                <td><?php echo formatDate($tenant['lease_end']); ?></td>
                                <td>
                                    <span class="badge badge-<?php echo $tenant['days_until_expiry'] <= 7 ? 'warning' : 'info'; ?>">
                                        <?php echo $tenant['days_until_expiry']; ?> days
                                    </span>
                                </td>
                                <td><?php echo formatCurrency($tenant['monthly_rent']); ?></td>
                                <td>
                                    <a href="../tenants/edit.php?id=<?php echo $tenant['id']; ?>" class="btn-link">Renew Lease</a>
                                    <a href="../tenants/view.php?id=<?php echo $tenant['id']; ?>" class="btn-link">View</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-muted">No leases expiring in the next 30 days.</p>
        <?php endif; ?>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
