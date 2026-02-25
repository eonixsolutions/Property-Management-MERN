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
    die('Cheque register table not found. Please run the migration: <a href="../database/migrate_cheque_register.php">Run Migration</a>');
}

$filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$property_id_filter = isset($_GET['property_id']) ? intval($_GET['property_id']) : 0;
$today = date('Y-m-d');
$seven_days = date('Y-m-d', strtotime('+7 days'));

// Build query based on filter
$where_clause = "p.user_id = $user_id";

if ($filter == 'issued') {
    $where_clause .= " AND oc.status = 'Issued'";
} elseif ($filter == 'upcoming') {
    $where_clause .= " AND oc.status = 'Issued' AND oc.cheque_date >= '$today' AND oc.cheque_date <= '$seven_days'";
} elseif ($filter == 'cleared') {
    $where_clause .= " AND oc.status = 'Cleared'";
} elseif ($filter == 'bounced') {
    $where_clause .= " AND oc.status = 'Bounced'";
} elseif ($filter == 'cancelled') {
    $where_clause .= " AND oc.status = 'Cancelled'";
}

// Add search filter
if (!empty($search)) {
    $where_clause .= " AND (oc.cheque_number LIKE '%$search%' OR p.property_name LIKE '%$search%'";
    // Check if owner fields exist for search
    $check_owner_temp = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
    if ($check_owner_temp->num_rows > 0) {
        $where_clause .= " OR p.owner_name LIKE '%$search%'";
    }
    $where_clause .= " OR oc.bank_name LIKE '%$search%')";
}

// Add property filter
if ($property_id_filter > 0) {
    $where_clause .= " AND oc.property_id = $property_id_filter";
}

// Check if owner fields exist
$check_owner = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner_fields = $check_owner->num_rows > 0;

if ($has_owner_fields) {
    $cheques = $conn->query("SELECT oc.*, p.property_name, p.owner_name
        FROM owner_cheques oc
        INNER JOIN properties p ON oc.property_id = p.id
        WHERE $where_clause
        ORDER BY oc.cheque_date ASC, oc.issue_date ASC");
} else {
    $cheques = $conn->query("SELECT oc.*, p.property_name
        FROM owner_cheques oc
        INNER JOIN properties p ON oc.property_id = p.id
        WHERE $where_clause
        ORDER BY oc.cheque_date ASC, oc.issue_date ASC");
}

// Statistics
$total_issued = $conn->query("SELECT COALESCE(SUM(cheque_amount), 0) as total FROM owner_cheques oc
    INNER JOIN properties p ON oc.property_id = p.id
    WHERE p.user_id = $user_id AND oc.status = 'Issued'")->fetch_assoc()['total'];

$total_cleared = $conn->query("SELECT COALESCE(SUM(cheque_amount), 0) as total FROM owner_cheques oc
    INNER JOIN properties p ON oc.property_id = p.id
    WHERE p.user_id = $user_id AND oc.status = 'Cleared'")->fetch_assoc()['total'];

// Get properties for filter
// Get properties for filter with parent property info
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

if ($has_unit_fields) {
    $all_properties_query = "SELECT DISTINCT p.id, p.property_name, p.parent_property_id, p.unit_name, parent.property_name as parent_property_name
                              FROM properties p
                              INNER JOIN owner_cheques oc ON p.id = oc.property_id
                              LEFT JOIN properties parent ON p.parent_property_id = parent.id
                              WHERE p.user_id = $user_id
                              ORDER BY COALESCE(parent.property_name, p.property_name), p.unit_name, p.property_name";
} else {
    $all_properties_query = "SELECT DISTINCT p.id, p.property_name
                              FROM properties p
                              INNER JOIN owner_cheques oc ON p.id = oc.property_id
                              WHERE p.user_id = $user_id
                              ORDER BY p.property_name";
}
$all_properties = $conn->query($all_properties_query);

$page_title = 'Owner Cheques';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Owner Cheques Register</h1>
    <div>
        <div style="display: inline-block; margin-right: 12px;">
            <a href="owners.php" class="btn <?php echo $filter == 'all' ? 'btn-primary' : ''; ?>" style="margin-right: 8px;">All</a>
            <a href="owners.php?filter=issued" class="btn <?php echo $filter == 'issued' ? 'btn-warning' : ''; ?>" style="margin-right: 8px;">Issued</a>
            <a href="owners.php?filter=upcoming" class="btn <?php echo $filter == 'upcoming' ? 'btn-info' : ''; ?>" style="margin-right: 8px;">Upcoming</a>
            <a href="owners.php?filter=cleared" class="btn <?php echo $filter == 'cleared' ? 'btn-success' : ''; ?>">Cleared</a>
        </div>
        <a href="add_owner_cheque.php" class="btn btn-primary">+ Issue Cheque</a>
        <a href="add_multiple_owner_cheques.php" class="btn" style="margin-left: 8px;">+ Issue Multiple</a>
    </div>
</div>

<div class="stats-grid" style="margin-bottom: 30px;">
    <div class="stat-card stat-expense">
        <div class="stat-icon">💳</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_issued); ?></h3>
            <p>Issued Cheques</p>
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
            <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 12px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="search" style="font-size: 12px; margin-bottom: 4px;">Search</label>
                    <input type="text" id="search" name="search" placeholder="Search by cheque #, property, owner, or bank..." value="<?php echo htmlspecialchars($search); ?>" style="width: 100%;">
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
                    <a href="owners.php" class="btn">Clear</a>
                </div>
            </div>
        </form>

        <?php if ($cheques->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Cheque #</th>
                            <th>Property</th>
                            <?php if ($has_owner_fields): ?>
                            <th>Owner</th>
                            <?php endif; ?>
                            <th>Amount</th>
                            <th>Cheque Date</th>
                            <th>Issue Date</th>
                            <th>Bank</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($cheque = $cheques->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($cheque['cheque_number']); ?></strong></td>
                                <td><?php echo htmlspecialchars($cheque['property_name']); ?></td>
                                <?php if ($has_owner_fields): ?>
                                <td><?php echo htmlspecialchars($cheque['owner_name'] ?? '-'); ?></td>
                                <?php endif; ?>
                                <td class="text-danger"><strong><?php echo formatCurrency($cheque['cheque_amount']); ?></strong></td>
                                <td>
                                    <?php 
                                    $cheque_date = new DateTime($cheque['cheque_date']);
                                    $today_obj = new DateTime();
                                    $days_diff = $today_obj->diff($cheque_date)->days;
                                    $is_upcoming = $cheque_date >= $today_obj && $cheque_date <= (new DateTime('+7 days'));
                                    ?>
                                    <span class="<?php echo $is_upcoming ? 'text-warning' : ''; ?>">
                                        <?php echo formatDate($cheque['cheque_date']); ?>
                                        <?php if ($is_upcoming && $cheque['status'] == 'Issued'): ?>
                                            <br><small class="text-warning">(<?php echo $days_diff; ?> days)</small>
                                        <?php endif; ?>
                                    </span>
                                </td>
                                <td><?php echo $cheque['issue_date'] ? formatDate($cheque['issue_date']) : '-'; ?></td>
                                <td><?php echo htmlspecialchars($cheque['bank_name'] ?? '-'); ?></td>
                                <td>
                                    <span class="badge badge-<?php 
                                        echo $cheque['status'] == 'Cleared' ? 'success' : 
                                            ($cheque['status'] == 'Bounced' ? 'danger' : 
                                            ($cheque['status'] == 'Cancelled' ? 'secondary' : 'warning')); 
                                    ?>">
                                        <?php echo htmlspecialchars($cheque['status']); ?>
                                    </span>
                                </td>
                                <td>
                                    <a href="edit_owner_cheque.php?id=<?php echo $cheque['id']; ?>" class="btn-link">Edit</a>
                                    <?php if ($cheque['status'] == 'Issued'): ?>
                                        <a href="update_status.php?type=owner&id=<?php echo $cheque['id']; ?>&status=Cleared" class="btn-link" onclick="return confirm('Mark this cheque as cleared?')">Mark Cleared</a>
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
                <a href="add_owner_cheque.php" class="btn btn-primary">Issue First Cheque</a>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>
