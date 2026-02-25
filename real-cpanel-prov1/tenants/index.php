<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Handle delete
if (isset($_GET['delete']) && is_numeric($_GET['delete'])) {
    $tenant_id = intval($_GET['delete']);
    
    // Get property_id before deleting
    $tenant_result = $conn->query("SELECT property_id FROM tenants WHERE id = $tenant_id AND property_id IN (SELECT id FROM properties WHERE user_id = $user_id)");
    
    if ($tenant_result && $tenant_result->num_rows > 0) {
        $tenant_data = $tenant_result->fetch_assoc();
        $property_id = $tenant_data['property_id'];
        
        // Delete the tenant
        $stmt = $conn->prepare("DELETE FROM tenants WHERE id = ? AND property_id IN (SELECT id FROM properties WHERE user_id = ?)");
        $stmt->bind_param("ii", $tenant_id, $user_id);
        $stmt->execute();
        $stmt->close();
        
        // Update property status based on remaining active tenants
        if ($property_id) {
            updatePropertyStatusBasedOnTenants($conn, $property_id);
        }
    }
    
    header('Location: index.php?deleted=1');
    exit();
}

// Get search and filter parameters
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$status_filter = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : '';
$property_filter = isset($_GET['property']) ? intval($_GET['property']) : 0;

// Build WHERE clause with filters
$where_clause = "p.user_id = $user_id";

if (!empty($search)) {
    $where_clause .= " AND (t.first_name LIKE '%$search%' OR t.last_name LIKE '%$search%' OR t.email LIKE '%$search%' OR t.phone LIKE '%$search%' OR p.property_name LIKE '%$search%')";
}

if (!empty($status_filter)) {
    $where_clause .= " AND t.status = '$status_filter'";
}

if ($property_filter > 0) {
    $where_clause .= " AND t.property_id = $property_filter";
}

// Get all tenants
$tenants_query = "SELECT t.*, p.property_name, p.address 
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE $where_clause
    ORDER BY t.created_at DESC";

$tenants = $conn->query($tenants_query);

// Get properties for filter dropdown
// Get properties for filter dropdown with parent property info
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

if ($has_unit_fields) {
    $properties_for_filter_query = "SELECT DISTINCT p.id, p.property_name, p.parent_property_id, p.unit_name, parent.property_name as parent_property_name 
                                     FROM properties p 
                                     INNER JOIN tenants t ON p.id = t.property_id 
                                     LEFT JOIN properties parent ON p.parent_property_id = parent.id
                                     WHERE p.user_id = $user_id 
                                     ORDER BY COALESCE(parent.property_name, p.property_name), p.unit_name, p.property_name";
} else {
    $properties_for_filter_query = "SELECT DISTINCT p.id, p.property_name FROM properties p INNER JOIN tenants t ON p.id = t.property_id WHERE p.user_id = $user_id ORDER BY p.property_name";
}
$properties_for_filter = $conn->query($properties_for_filter_query);

$page_title = 'Tenants';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Tenants</h1>
    <div style="display: flex; gap: 8px;">
        <a href="add.php" class="btn btn-primary">+ Add Tenant</a>
        <a href="../contracts/index.php" class="btn btn-success">📄 Generate Contract</a>
    </div>
</div>

<?php if (isset($_GET['deleted'])): ?>
    <div class="alert alert-success">Tenant deleted successfully!</div>
<?php endif; ?>

<?php if (isset($_GET['added'])): ?>
    <div class="alert alert-success">Tenant added successfully!</div>
<?php endif; ?>

<?php if (isset($_GET['updated'])): ?>
    <div class="alert alert-success">Tenant updated successfully!</div>
<?php endif; ?>

<!-- Search and Filter -->
<div class="content-card" style="margin-bottom: 20px;">
    <div class="card-body">
        <form method="GET" action="" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="search" style="font-size: 12px; margin-bottom: 4px;">Search</label>
                    <input type="text" id="search" name="search" placeholder="Search by name, email, phone, property..." value="<?php echo htmlspecialchars($search); ?>" style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="status_filter" style="font-size: 12px; margin-bottom: 4px;">Status</label>
                    <select id="status_filter" name="status" style="width: 100%;">
                        <option value="">All Statuses</option>
                        <option value="Active" <?php echo $status_filter == 'Active' ? 'selected' : ''; ?>>Active</option>
                        <option value="Past" <?php echo $status_filter == 'Past' ? 'selected' : ''; ?>>Past</option>
                        <option value="Pending" <?php echo $status_filter == 'Pending' ? 'selected' : ''; ?>>Pending</option>
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
                    <?php if (!empty($search) || !empty($status_filter) || $property_filter > 0): ?>
                        <a href="index.php" class="btn">Clear</a>
                    <?php endif; ?>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="content-card">
    <div class="card-body">
        <?php if ($tenants->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Property</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Monthly Rent</th>
                            <th>Status</th>
                            <th>Move In Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($tenant = $tenants->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']); ?></strong></td>
                                <td><?php echo htmlspecialchars($tenant['property_name']); ?></td>
                                <td><?php echo htmlspecialchars($tenant['email'] ?? '-'); ?></td>
                                <td><?php echo htmlspecialchars($tenant['phone'] ?? '-'); ?></td>
                                <td><?php echo formatCurrency($tenant['monthly_rent']); ?></td>
                                <td>
                                    <span class="badge badge-<?php 
                                        echo $tenant['status'] == 'Active' ? 'success' : 
                                            ($tenant['status'] == 'Past' ? 'info' : 'warning'); 
                                    ?>">
                                        <?php echo htmlspecialchars($tenant['status']); ?>
                                    </span>
                                </td>
                                <td><?php echo formatDate($tenant['move_in_date'] ?? ''); ?></td>
                                <td>
                                    <a href="view.php?id=<?php echo $tenant['id']; ?>" class="btn-link">View</a>
                                    <a href="edit.php?id=<?php echo $tenant['id']; ?>" class="btn-link">Edit</a>
                                    <a href="../contracts/index.php?tenant_id=<?php echo $tenant['id']; ?>" class="btn-link" title="Generate Lease Contract">📄 Contract</a>
                                    <a href="?delete=<?php echo $tenant['id']; ?>" 
                                       onclick="return confirmDelete('Are you sure you want to delete this tenant?')" 
                                       class="btn-link text-danger">Delete</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <div class="text-center" style="padding: 60px 20px;">
                <p class="text-muted" style="font-size: 18px; margin-bottom: 20px;">No tenants yet</p>
                <a href="add.php" class="btn btn-primary">Add Your First Tenant</a>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>
