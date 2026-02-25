<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Handle delete
if (isset($_GET['delete']) && is_numeric($_GET['delete'])) {
    $maintenance_id = intval($_GET['delete']);
    $stmt = $conn->prepare("DELETE FROM maintenance_requests WHERE id = ? AND property_id IN (SELECT id FROM properties WHERE user_id = ?)");
    $stmt->bind_param("ii", $maintenance_id, $user_id);
    $stmt->execute();
    $stmt->close();
    header('Location: index.php?deleted=1');
    exit();
}

// Get search and filter parameters
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$status_filter = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : '';
$priority_filter = isset($_GET['priority']) ? $conn->real_escape_string($_GET['priority']) : '';
$property_filter = isset($_GET['property']) ? intval($_GET['property']) : 0;

// Build WHERE clause with filters
$where_clause = "p.user_id = $user_id";

if (!empty($search)) {
    $where_clause .= " AND (mr.title LIKE '%$search%' OR mr.description LIKE '%$search%' OR p.property_name LIKE '%$search%' OR CONCAT(t.first_name, ' ', t.last_name) LIKE '%$search%')";
}

if (!empty($status_filter)) {
    $where_clause .= " AND mr.status = '$status_filter'";
}

if (!empty($priority_filter)) {
    $where_clause .= " AND mr.priority = '$priority_filter'";
}

if ($property_filter > 0) {
    $where_clause .= " AND mr.property_id = $property_filter";
}

// Get all maintenance requests
$requests_query = "SELECT mr.*, p.property_name, t.first_name, t.last_name
    FROM maintenance_requests mr
    INNER JOIN properties p ON mr.property_id = p.id
    LEFT JOIN tenants t ON mr.tenant_id = t.id
    WHERE $where_clause
    ORDER BY mr.created_at DESC";

$requests = $conn->query($requests_query);

// Get properties for filter dropdown with parent property info
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

if ($has_unit_fields) {
    $properties_for_filter_query = "SELECT DISTINCT p.id, p.property_name, p.parent_property_id, p.unit_name, parent.property_name as parent_property_name 
                                     FROM properties p 
                                     INNER JOIN maintenance_requests mr ON p.id = mr.property_id 
                                     LEFT JOIN properties parent ON p.parent_property_id = parent.id
                                     WHERE p.user_id = $user_id 
                                     ORDER BY COALESCE(parent.property_name, p.property_name), p.unit_name, p.property_name";
} else {
    $properties_for_filter_query = "SELECT DISTINCT p.id, p.property_name FROM properties p INNER JOIN maintenance_requests mr ON p.id = mr.property_id WHERE p.user_id = $user_id ORDER BY p.property_name";
}
$properties_for_filter = $conn->query($properties_for_filter_query);

$page_title = 'Maintenance';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Maintenance Requests</h1>
    <a href="add.php" class="btn btn-primary">+ Add Request</a>
</div>

<?php if (isset($_GET['deleted'])): ?>
    <div class="alert alert-success">Maintenance request deleted successfully!</div>
<?php endif; ?>

<!-- Search and Filter -->
<div class="content-card" style="margin-bottom: 20px;">
    <div class="card-body">
        <form method="GET" action="" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 12px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="search" style="font-size: 12px; margin-bottom: 4px;">Search</label>
                    <input type="text" id="search" name="search" placeholder="Search by title, property, tenant..." value="<?php echo htmlspecialchars($search); ?>" style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="status_filter" style="font-size: 12px; margin-bottom: 4px;">Status</label>
                    <select id="status_filter" name="status" style="width: 100%;">
                        <option value="">All Statuses</option>
                        <option value="Pending" <?php echo $status_filter == 'Pending' ? 'selected' : ''; ?>>Pending</option>
                        <option value="In Progress" <?php echo $status_filter == 'In Progress' ? 'selected' : ''; ?>>In Progress</option>
                        <option value="Completed" <?php echo $status_filter == 'Completed' ? 'selected' : ''; ?>>Completed</option>
                        <option value="Cancelled" <?php echo $status_filter == 'Cancelled' ? 'selected' : ''; ?>>Cancelled</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="priority_filter" style="font-size: 12px; margin-bottom: 4px;">Priority</label>
                    <select id="priority_filter" name="priority" style="width: 100%;">
                        <option value="">All Priorities</option>
                        <option value="Emergency" <?php echo $priority_filter == 'Emergency' ? 'selected' : ''; ?>>Emergency</option>
                        <option value="High" <?php echo $priority_filter == 'High' ? 'selected' : ''; ?>>High</option>
                        <option value="Medium" <?php echo $priority_filter == 'Medium' ? 'selected' : ''; ?>>Medium</option>
                        <option value="Low" <?php echo $priority_filter == 'Low' ? 'selected' : ''; ?>>Low</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="property_filter" style="font-size: 12px; margin-bottom: 4px;">Property</label>
                    <select id="property_filter" name="property" style="width: 100%;">
                        <option value="">All Properties</option>
                        <?php while ($prop = $properties_for_filter->fetch_assoc()): 
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
                    <?php if (!empty($search) || !empty($status_filter) || !empty($priority_filter) || $property_filter > 0): ?>
                        <a href="index.php" class="btn">Clear</a>
                    <?php endif; ?>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="content-card">
    <div class="card-body">
        <?php if ($requests->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Property</th>
                            <th>Tenant</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Cost</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($request = $requests->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($request['title']); ?></strong></td>
                                <td><?php echo htmlspecialchars($request['property_name']); ?></td>
                                <td><?php echo $request['first_name'] ? htmlspecialchars($request['first_name'] . ' ' . $request['last_name']) : '-'; ?></td>
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
                                            ($request['status'] == 'In Progress' ? 'warning' : 'info'); 
                                    ?>">
                                        <?php echo htmlspecialchars($request['status']); ?>
                                    </span>
                                </td>
                                <td><?php echo $request['cost'] ? formatCurrency($request['cost']) : '-'; ?></td>
                                <td><?php echo formatDate($request['created_at']); ?></td>
                                <td>
                                    <a href="view.php?id=<?php echo $request['id']; ?>" class="btn-link">View</a>
                                    <a href="edit.php?id=<?php echo $request['id']; ?>" class="btn-link">Edit</a>
                                    <a href="?delete=<?php echo $request['id']; ?>" 
                                       onclick="return confirmDelete('Are you sure you want to delete this request?')" 
                                       class="btn-link text-danger">Delete</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <div class="text-center" style="padding: 60px 20px;">
                <p class="text-muted" style="font-size: 18px; margin-bottom: 20px;">No maintenance requests</p>
                <a href="add.php" class="btn btn-primary">Add Maintenance Request</a>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>
