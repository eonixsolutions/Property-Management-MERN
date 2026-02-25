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
    die('Cheque register table not found. Please run the migration: <a href="../database/migrate_cheque_register.php">Run Migration</a>');
}

$filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$tenant_id_filter = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
$property_id_filter = isset($_GET['property_id']) ? intval($_GET['property_id']) : 0;
$today = date('Y-m-d');
$seven_days = date('Y-m-d', strtotime('+7 days'));

// Build query based on filter
$where_clause = "p.user_id = $user_id";

if ($filter == 'pending') {
    $where_clause .= " AND tc.status = 'Pending' AND (tc.deposit_date IS NULL OR tc.deposit_date >= '$today')";
} elseif ($filter == 'upcoming') {
    $where_clause .= " AND tc.status IN ('Pending', 'Deposited') AND tc.deposit_date IS NOT NULL AND tc.deposit_date >= '$today' AND tc.deposit_date <= '$seven_days'";
} elseif ($filter == 'deposited') {
    $where_clause .= " AND tc.status = 'Deposited'";
} elseif ($filter == 'cleared') {
    $where_clause .= " AND tc.status = 'Cleared'";
} elseif ($filter == 'bounced') {
    $where_clause .= " AND tc.status = 'Bounced'";
}

// Add search filter
if (!empty($search)) {
    $where_clause .= " AND (tc.cheque_number LIKE '%$search%' OR t.first_name LIKE '%$search%' OR t.last_name LIKE '%$search%' OR p.property_name LIKE '%$search%' OR tc.bank_name LIKE '%$search%')";
}

// Add tenant filter
if ($tenant_id_filter > 0) {
    $where_clause .= " AND tc.tenant_id = $tenant_id_filter";
}

// Add property filter
if ($property_id_filter > 0) {
    $where_clause .= " AND tc.property_id = $property_id_filter";
}

$cheques = $conn->query("SELECT tc.*, t.first_name, t.last_name, t.email, t.phone, p.property_name
    FROM tenant_cheques tc
    INNER JOIN tenants t ON tc.tenant_id = t.id
    INNER JOIN properties p ON tc.property_id = p.id
    WHERE $where_clause
    ORDER BY tc.deposit_date ASC, tc.cheque_date ASC");

// Statistics
$total_pending = $conn->query("SELECT COALESCE(SUM(cheque_amount), 0) as total FROM tenant_cheques tc
    INNER JOIN properties p ON tc.property_id = p.id
    WHERE p.user_id = $user_id AND tc.status = 'Pending'")->fetch_assoc()['total'];

$total_deposited = $conn->query("SELECT COALESCE(SUM(cheque_amount), 0) as total FROM tenant_cheques tc
    INNER JOIN properties p ON tc.property_id = p.id
    WHERE p.user_id = $user_id AND tc.status = 'Deposited'")->fetch_assoc()['total'];

$total_cleared = $conn->query("SELECT COALESCE(SUM(cheque_amount), 0) as total FROM tenant_cheques tc
    INNER JOIN properties p ON tc.property_id = p.id
    WHERE p.user_id = $user_id AND tc.status = 'Cleared'")->fetch_assoc()['total'];

// Get tenants and properties for filters
$all_tenants = $conn->query("SELECT DISTINCT t.id, t.first_name, t.last_name
    FROM tenants t
    INNER JOIN tenant_cheques tc ON t.id = tc.tenant_id
    INNER JOIN properties p ON tc.property_id = p.id
    WHERE p.user_id = $user_id
    ORDER BY t.first_name, t.last_name");

// Get properties for filter with parent property info
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

if ($has_unit_fields) {
    $all_properties_query = "SELECT DISTINCT p.id, p.property_name, p.parent_property_id, p.unit_name, parent.property_name as parent_property_name
                              FROM properties p
                              INNER JOIN tenant_cheques tc ON p.id = tc.property_id
                              LEFT JOIN properties parent ON p.parent_property_id = parent.id
                              WHERE p.user_id = $user_id
                              ORDER BY COALESCE(parent.property_name, p.property_name), p.unit_name, p.property_name";
} else {
    $all_properties_query = "SELECT DISTINCT p.id, p.property_name
                              FROM properties p
                              INNER JOIN tenant_cheques tc ON p.id = tc.property_id
                              WHERE p.user_id = $user_id
                              ORDER BY p.property_name";
}
$all_properties = $conn->query($all_properties_query);

$page_title = 'Tenant Cheques';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Tenant Cheques Register</h1>
    <div>
        <div style="display: inline-block; margin-right: 12px;">
            <a href="tenants.php" class="btn <?php echo $filter == 'all' ? 'btn-primary' : ''; ?>" style="margin-right: 8px;">All</a>
            <a href="tenants.php?filter=pending" class="btn <?php echo $filter == 'pending' ? 'btn-warning' : ''; ?>" style="margin-right: 8px;">Pending</a>
            <a href="tenants.php?filter=upcoming" class="btn <?php echo $filter == 'upcoming' ? 'btn-info' : ''; ?>" style="margin-right: 8px;">Upcoming</a>
            <a href="tenants.php?filter=deposited" class="btn <?php echo $filter == 'deposited' ? 'btn-primary' : ''; ?>" style="margin-right: 8px;">Deposited</a>
            <a href="tenants.php?filter=cleared" class="btn <?php echo $filter == 'cleared' ? 'btn-success' : ''; ?>">Cleared</a>
        </div>
        <a href="add_tenant_cheque.php" class="btn btn-primary">+ Add Cheque</a>
        <a href="add_multiple_tenant_cheques.php" class="btn" style="margin-left: 8px;">+ Add Multiple</a>
    </div>
</div>

<div class="stats-grid" style="margin-bottom: 30px;">
    <div class="stat-card stat-income">
        <div class="stat-icon">💳</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_pending); ?></h3>
            <p>Pending Cheques</p>
        </div>
    </div>
    <div class="stat-card" style="background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);">
        <div class="stat-icon">📥</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_deposited); ?></h3>
            <p>Deposited (Not Cleared)</p>
        </div>
    </div>
    <div class="stat-card stat-income">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_cleared); ?></h3>
            <p>Cleared Cheques</p>
        </div>
    </div>
</div>

<div class="content-card">
    <div class="card-body">
        <!-- Search and Filter -->
        <form method="GET" action="" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="search" style="font-size: 12px; margin-bottom: 4px;">Search</label>
                    <input type="text" id="search" name="search" placeholder="Search by cheque #, tenant, property, or bank..." value="<?php echo htmlspecialchars($search); ?>" style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="tenant_filter" style="font-size: 12px; margin-bottom: 4px;">Filter by Tenant</label>
                    <select id="tenant_filter" name="tenant_id" style="width: 100%;">
                        <option value="0">All Tenants</option>
                        <?php 
                        while ($tenant = $all_tenants->fetch_assoc()): 
                            $selected = ($tenant_id_filter == $tenant['id']) ? 'selected' : '';
                        ?>
                            <option value="<?php echo $tenant['id']; ?>" <?php echo $selected; ?>>
                                <?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="property_filter" style="font-size: 12px; margin-bottom: 4px;">Filter by Property</label>
                    <select id="property_filter" name="property_id" style="width: 100%;">
                        <option value="0">All Properties</option>
                        <?php 
                        while ($property = $all_properties->fetch_assoc()): 
                            $selected = ($property_id_filter == $property['id']) ? 'selected' : '';
                            $display_name = $property['property_name'];
                            if ($has_unit_fields && !empty($property['parent_property_id']) && !empty($property['parent_property_name'])) {
                                $unit_display = !empty($property['unit_name']) ? $property['unit_name'] : $property['property_name'];
                                $display_name = $property['parent_property_name'] . ' - ' . $unit_display;
                            }
                        ?>
                            <option value="<?php echo $property['id']; ?>" <?php echo $selected; ?>>
                                <?php echo htmlspecialchars($display_name); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="btn btn-primary">🔍 Search</button>
                    <a href="tenants.php" class="btn">Clear</a>
                </div>
            </div>
        </form>

        <?php if ($cheques->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Cheque #</th>
                            <th>Tenant</th>
                            <th>Property</th>
                            <th>Amount</th>
                            <th>Cheque Date</th>
                            <th>Deposit Date</th>
                            <th>Bank</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($cheque = $cheques->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($cheque['cheque_number']); ?></strong></td>
                                <td><?php echo htmlspecialchars($cheque['first_name'] . ' ' . $cheque['last_name']); ?></td>
                                <td><?php echo htmlspecialchars($cheque['property_name']); ?></td>
                                <td class="text-success"><strong><?php echo formatCurrency($cheque['cheque_amount']); ?></strong></td>
                                <td><?php echo formatDate($cheque['cheque_date']); ?></td>
                                <td>
                                    <?php if ($cheque['deposit_date']): ?>
                                        <?php 
                                        $deposit_date = new DateTime($cheque['deposit_date']);
                                        $today_obj = new DateTime();
                                        $days_diff = $today_obj->diff($deposit_date)->days;
                                        $is_overdue = $deposit_date < $today_obj && $cheque['status'] == 'Pending';
                                        $is_upcoming = $deposit_date >= $today_obj && $deposit_date <= (new DateTime('+7 days'));
                                        ?>
                                        <span class="<?php echo $is_overdue ? 'text-danger' : ($is_upcoming ? 'text-warning' : ''); ?>">
                                            <?php echo formatDate($cheque['deposit_date']); ?>
                                            <?php if ($is_overdue): ?>
                                                <br><small class="text-danger">(Overdue)</small>
                                            <?php elseif ($is_upcoming): ?>
                                                <br><small class="text-warning">(<?php echo $days_diff; ?> days)</small>
                                            <?php endif; ?>
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
                                    <a href="edit_tenant_cheque.php?id=<?php echo $cheque['id']; ?>" class="btn-link">Edit</a>
                                    <?php if ($cheque['status'] == 'Pending' && $cheque['deposit_date']): ?>
                                        <a href="update_status.php?type=tenant&id=<?php echo $cheque['id']; ?>&status=Deposited" class="btn-link" onclick="return confirm('Mark this cheque as deposited?')">Mark Deposited</a>
                                    <?php elseif ($cheque['status'] == 'Deposited'): ?>
                                        <a href="update_status.php?type=tenant&id=<?php echo $cheque['id']; ?>&status=Cleared" class="btn-link" onclick="return confirm('Mark this cheque as cleared?')">Mark Cleared</a>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <div class="text-center" style="padding: 60px 20px;">
                <p class="text-muted" style="font-size: 18px; margin-bottom: 20px;">No cheques found</p>
                <a href="add_tenant_cheque.php" class="btn btn-primary">Add First Cheque</a>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>
