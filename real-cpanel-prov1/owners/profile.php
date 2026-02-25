<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if owner fields exist
$check_owner_fields = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner_fields = $check_owner_fields->num_rows > 0;

if (!$has_owner_fields) {
    closeDBConnection($conn);
    header('Location: index.php?error=owner_fields_not_available');
    exit();
}

if (!isset($_GET['owner']) || empty($_GET['owner'])) {
    closeDBConnection($conn);
    header('Location: index.php');
    exit();
}

$owner_name = urldecode($_GET['owner']);

// Get owner information from first property (they should all have same owner info)
$owner_name_escaped = $conn->real_escape_string($owner_name);
$owner_info_result = $conn->query("SELECT owner_name, owner_contact, owner_email, owner_phone, 
    AVG(monthly_rent_to_owner) as avg_monthly_rent
    FROM properties 
    WHERE user_id = $user_id AND owner_name = '$owner_name_escaped'
    GROUP BY owner_name, owner_contact, owner_email, owner_phone
    LIMIT 1");
$owner_info = $owner_info_result ? $owner_info_result->fetch_assoc() : null;

if (!$owner_info) {
    closeDBConnection($conn);
    header('Location: index.php?error=owner_not_found');
    exit();
}

// Get all properties for this owner
$properties = $conn->query("SELECT p.*, 
    (SELECT COUNT(*) FROM tenants WHERE property_id = p.id AND status = 'Active') as active_tenants,
    (SELECT SUM(monthly_rent) FROM tenants WHERE property_id = p.id AND status = 'Active') as total_rent
    FROM properties p
    WHERE p.user_id = $user_id AND p.owner_name = '$owner_name_escaped'
    ORDER BY p.property_name");

// Get owner payments statistics
$check_owner_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_table = $check_owner_table->num_rows > 0;

$owner_payments_stats = null;
$total_paid = 0;
$total_pending = 0;
$recent_payments = null;

if ($has_owner_table && $properties && $properties->num_rows > 0) {
    // Get properties IDs for this owner
    $property_ids = [];
    $properties->data_seek(0); // Reset to beginning
    while ($prop = $properties->fetch_assoc()) {
        $property_ids[] = $prop['id'];
    }
    $properties->data_seek(0); // Reset pointer again
    
    if (!empty($property_ids)) {
        $ids_string = implode(',', array_map('intval', $property_ids));
        
        // Get payment statistics
        $stats_result = $conn->query("SELECT 
            SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) as total_paid,
            SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END) as total_pending,
            COUNT(*) as total_payments
            FROM owner_payments 
            WHERE property_id IN ($ids_string)");
        
        if ($stats_result && $stats_result->num_rows > 0) {
            $owner_payments_stats = $stats_result->fetch_assoc();
            $total_paid = $owner_payments_stats['total_paid'] ?? 0;
            $total_pending = $owner_payments_stats['total_pending'] ?? 0;
        }
        
        // Get recent payments
        $recent_payments = $conn->query("SELECT op.*, p.property_name
            FROM owner_payments op
            INNER JOIN properties p ON op.property_id = p.id
            WHERE op.property_id IN ($ids_string)
            ORDER BY op.payment_month DESC, op.status ASC
            LIMIT 10");
    }
}

// Calculate totals
$total_properties = $properties ? $properties->num_rows : 0;
$total_monthly_rent = 0;
$total_value = 0;

if ($properties && $total_properties > 0) {
    $properties->data_seek(0);
    while ($prop = $properties->fetch_assoc()) {
        $total_monthly_rent += $prop['monthly_rent_to_owner'] ?? 0;
        $total_value += $prop['current_value'] ?? 0;
    }
    $properties->data_seek(0); // Reset again
}

closeDBConnection($conn);

$page_title = 'Owner Profile';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1><?php echo htmlspecialchars($owner_info['owner_name']); ?></h1>
    <div>
        <a href="index.php" class="btn-link">← Back to Owner Payments</a>
    </div>
</div>

<div class="dashboard-grid">
    <!-- Owner Information -->
    <div class="content-card">
        <div class="card-header">
            <h2>Owner Information</h2>
        </div>
        <div class="card-body">
            <table class="data-table">
                <tr>
                    <td><strong>Owner Name</strong></td>
                    <td><?php echo htmlspecialchars($owner_info['owner_name']); ?></td>
                </tr>
                <?php if (!empty($owner_info['owner_contact'])): ?>
                <tr>
                    <td><strong>Contact</strong></td>
                    <td><?php echo htmlspecialchars($owner_info['owner_contact']); ?></td>
                </tr>
                <?php endif; ?>
                <?php if (!empty($owner_info['owner_email'])): ?>
                <tr>
                    <td><strong>Email</strong></td>
                    <td><a href="mailto:<?php echo htmlspecialchars($owner_info['owner_email']); ?>"><?php echo htmlspecialchars($owner_info['owner_email']); ?></a></td>
                </tr>
                <?php endif; ?>
                <?php if (!empty($owner_info['owner_phone'])): ?>
                <tr>
                    <td><strong>Phone</strong></td>
                    <td><a href="tel:<?php echo htmlspecialchars($owner_info['owner_phone']); ?>"><?php echo htmlspecialchars($owner_info['owner_phone']); ?></a></td>
                </tr>
                <?php endif; ?>
                <tr>
                    <td><strong>Average Monthly Rent</strong></td>
                    <td><strong><?php echo formatCurrency($owner_info['avg_monthly_rent'] ?? 0); ?></strong></td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Owner Statistics -->
    <div class="content-card">
        <div class="card-header">
            <h2>Owner Statistics</h2>
        </div>
        <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #4f46e5;">
                        <?php echo $total_properties; ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Properties</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #10b981;">
                        <?php echo formatCurrency($total_monthly_rent); ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Total Monthly Rent</div>
                </div>
                <?php if ($has_owner_table && $owner_payments_stats): ?>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #10b981;">
                        <?php echo formatCurrency($total_paid); ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Total Paid</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">
                        <?php echo formatCurrency($total_pending); ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Pending Payments</div>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Owner Properties -->
<div class="content-card" style="margin-top: 24px;">
    <div class="card-header">
        <h2>Properties (<?php echo $total_properties; ?>)</h2>
    </div>
    <div class="card-body">
        <?php if ($total_properties > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Property Name</th>
                            <th>Address</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Monthly Rent to Owner</th>
                            <th>Active Tenants</th>
                            <th>Total Rent</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($properties && $total_properties > 0): ?>
                        <?php while ($property = $properties->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($property['property_name']); ?></strong></td>
                                <td><?php echo htmlspecialchars($property['address'] . ', ' . $property['city']); ?></td>
                                <td><?php echo htmlspecialchars($property['property_type']); ?></td>
                                <td>
                                    <span class="badge badge-<?php 
                                        echo $property['status'] == 'Occupied' ? 'success' : 
                                            ($property['status'] == 'Under Maintenance' ? 'warning' : 'info'); 
                                    ?>">
                                        <?php echo htmlspecialchars($property['status']); ?>
                                    </span>
                                </td>
                                <td><?php echo formatCurrency($property['monthly_rent_to_owner'] ?? 0); ?></td>
                                <td><?php echo $property['active_tenants'] ?? 0; ?></td>
                                <td><?php echo formatCurrency($property['total_rent'] ?? 0); ?></td>
                                <td>
                                    <a href="../properties/view.php?id=<?php echo $property['id']; ?>" class="btn-link">View</a>
                                    <a href="../properties/edit.php?id=<?php echo $property['id']; ?>" class="btn-link">Edit</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-muted">No properties found for this owner.</p>
        <?php endif; ?>
    </div>
</div>

<?php if ($has_owner_table && $recent_payments && $recent_payments->num_rows > 0): ?>
<!-- Recent Owner Payments -->
<div class="content-card" style="margin-top: 24px;">
    <div class="card-header">
        <h2>Recent Owner Payments</h2>
        <a href="index.php" class="btn-link">View All</a>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Property</th>
                        <th>Payment Month</th>
                        <th>Amount</th>
                        <th>Paid Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php while ($payment = $recent_payments->fetch_assoc()): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($payment['property_name']); ?></strong></td>
                            <td><?php echo date('F Y', strtotime($payment['payment_month'])); ?></td>
                            <td><strong><?php echo formatCurrency($payment['amount']); ?></strong></td>
                            <td><?php echo $payment['paid_date'] ? formatDate($payment['paid_date']) : '-'; ?></td>
                            <td>
                                <span class="badge badge-<?php echo $payment['status'] == 'Paid' ? 'success' : 'warning'; ?>">
                                    <?php echo htmlspecialchars($payment['status']); ?>
                                </span>
                            </td>
                            <td>
                                <a href="edit.php?id=<?php echo $payment['id']; ?>" class="btn-link">Edit</a>
                            </td>
                        </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php endif; ?>

<?php include '../includes/footer.php'; ?>

