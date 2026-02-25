<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Handle delete
if (isset($_GET['delete']) && is_numeric($_GET['delete'])) {
    $property_id = intval($_GET['delete']);
    $stmt = $conn->prepare("DELETE FROM properties WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $property_id, $user_id);
    $stmt->execute();
    $stmt->close();
    header('Location: index.php?deleted=1');
    exit();
}

// Get search and filter parameters
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$status_filter = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : '';
$property_type_filter = isset($_GET['property_type']) ? $conn->real_escape_string($_GET['property_type']) : '';

$page_title = 'Properties';
include '../includes/header.php';

// Check if unit fields exist (after header to keep connection open)
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

// Build WHERE clause with filters
$where_clause = "p.user_id = $user_id";

if (!empty($search)) {
    $where_clause .= " AND (p.property_name LIKE '%$search%' OR p.address LIKE '%$search%' OR p.city LIKE '%$search%' OR p.property_type LIKE '%$search%')";
}

if (!empty($status_filter)) {
    $where_clause .= " AND p.status = '$status_filter'";
}

if (!empty($property_type_filter)) {
    $where_clause .= " AND p.property_type = '$property_type_filter'";
}

// Get all properties grouped hierarchically
if ($has_unit_fields) {
    // First get master properties (properties that are NOT units)
    $master_where = $where_clause . " AND (p.parent_property_id IS NULL OR p.parent_property_id = 0 OR p.is_unit = 0)";
    
    $master_query = "SELECT p.*, 
        (SELECT COUNT(*) FROM tenants WHERE property_id = p.id AND status = 'Active') as active_tenants,
        (SELECT SUM(monthly_rent) FROM tenants WHERE property_id = p.id AND status = 'Active') as monthly_rent,
        (SELECT COUNT(*) FROM properties WHERE parent_property_id = p.id) as unit_count
        FROM properties p 
        WHERE $master_where 
        ORDER BY p.created_at DESC";
    
    $master_properties_result = $conn->query($master_query);
    $master_properties = [];
    while ($row = $master_properties_result->fetch_assoc()) {
        // Get units for this master property
        $unit_query = "SELECT p.*, 
            (SELECT COUNT(*) FROM tenants WHERE property_id = p.id AND status = 'Active') as active_tenants,
            (SELECT SUM(monthly_rent) FROM tenants WHERE property_id = p.id AND status = 'Active') as monthly_rent
            FROM properties p 
            WHERE p.parent_property_id = {$row['id']} AND p.user_id = $user_id
            ORDER BY p.created_at DESC";
        $units_result = $conn->query($unit_query);
        $row['units'] = [];
        while ($unit = $units_result->fetch_assoc()) {
            $row['units'][] = $unit;
        }
        
        $master_properties[] = $row;
    }
    
    // Also get standalone units (units whose parent doesn't exist or is filtered out)
    // This is handled in the query above since we're joining
    
} else {
    // Old query without unit support
    $properties_query = "SELECT p.*, 
        (SELECT COUNT(*) FROM tenants WHERE property_id = p.id AND status = 'Active') as active_tenants,
        (SELECT SUM(monthly_rent) FROM tenants WHERE property_id = p.id AND status = 'Active') as monthly_rent
        FROM properties p 
        WHERE $where_clause 
        ORDER BY p.created_at DESC";
    
    $master_properties_result = $conn->query($properties_query);
    $master_properties = [];
    while ($row = $master_properties_result->fetch_assoc()) {
        $row['units'] = [];
        $master_properties[] = $row;
    }
}

$has_unit_fields_static = $has_unit_fields; // For use in template

// Get distinct property types and statuses for filter dropdowns
$property_types = $conn->query("SELECT DISTINCT property_type FROM properties WHERE user_id = $user_id AND property_type IS NOT NULL AND property_type != '' ORDER BY property_type");
$statuses = ['Occupied', 'Vacant', 'Under Maintenance'];
?>

<div class="page-actions">
    <h1>Properties</h1>
    <a href="add.php" class="btn btn-primary">+ Add Property</a>
</div>

<?php if (isset($_GET['deleted'])): ?>
    <div class="alert alert-success">Property deleted successfully!</div>
<?php endif; ?>

<?php if (isset($_GET['added'])): ?>
    <div class="alert alert-success">Property added successfully!</div>
<?php endif; ?>

<?php if (isset($_GET['updated'])): ?>
    <div class="alert alert-success">Property updated successfully!</div>
<?php endif; ?>

<!-- Search and Filter -->
<div class="content-card" style="margin-bottom: 20px;">
    <div class="card-body">
        <form method="GET" action="" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="search" style="font-size: 12px; margin-bottom: 4px;">Search</label>
                    <input type="text" id="search" name="search" placeholder="Search by name, address, city..." value="<?php echo htmlspecialchars($search); ?>" style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="status_filter" style="font-size: 12px; margin-bottom: 4px;">Status</label>
                    <select id="status_filter" name="status" style="width: 100%;">
                        <option value="">All Statuses</option>
                        <?php foreach ($statuses as $status): ?>
                            <option value="<?php echo htmlspecialchars($status); ?>" <?php echo $status_filter == $status ? 'selected' : ''; ?>><?php echo htmlspecialchars($status); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="property_type_filter" style="font-size: 12px; margin-bottom: 4px;">Property Type</label>
                    <select id="property_type_filter" name="property_type" style="width: 100%;">
                        <option value="">All Types</option>
                        <?php while ($pt = $property_types->fetch_assoc()): ?>
                            <option value="<?php echo htmlspecialchars($pt['property_type']); ?>" <?php echo $property_type_filter == $pt['property_type'] ? 'selected' : ''; ?>><?php echo htmlspecialchars($pt['property_type']); ?></option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="btn btn-primary">🔍 Search</button>
                    <?php if (!empty($search) || !empty($status_filter) || !empty($property_type_filter)): ?>
                        <a href="index.php" class="btn">Clear</a>
                    <?php endif; ?>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="content-card">
    <div class="card-body">
        <?php if (count($master_properties) > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Property Name</th>
                            <?php if ($has_unit_fields_static): ?>
                            <th>Type</th>
                            <?php endif; ?>
                            <th>Address</th>
                            <th>Property Type</th>
                            <th>Status</th>
                            <th>Tenants</th>
                            <th>Monthly Rent</th>
                            <th>Current Value</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
<?php 
foreach ($master_properties as $property): 
    $unit_count = !empty($property['unit_count']) ? $property['unit_count'] : 0;
    $has_units = $unit_count > 0;
?>
                            <tr class="master-property-row" data-master-id="<?php echo $property['id']; ?>">
                                <td>
                                    <?php if ($has_unit_fields_static && $has_units): ?>
                                        <span class="toggle-units" style="cursor: pointer; user-select: none; margin-right: 8px;">▶</span>
                                    <?php endif; ?>
                                    <strong><?php echo htmlspecialchars($property['property_name']); ?></strong>
                                </td>
                                <?php if ($has_unit_fields_static): ?>
                                <td>
                                    <span class="badge" style="background: #6366f1;">Master</span>
                                    <?php if ($unit_count > 0): ?>
                                        <span class="badge" style="background: #3b82f6; margin-left: 4px;"><?php echo $unit_count; ?> unit(s)</span>
                                    <?php endif; ?>
                                </td>
                                <?php endif; ?>
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
                                <td><?php echo $property['active_tenants']; ?></td>
                                <td><?php echo formatCurrency($property['monthly_rent'] ?? 0); ?></td>
                                <td><?php echo formatCurrency($property['current_value'] ?? 0); ?></td>
                                <td>
                                    <a href="view.php?id=<?php echo $property['id']; ?>" class="btn-link">View</a>
                                    <a href="edit.php?id=<?php echo $property['id']; ?>" class="btn-link">Edit</a>
                                    <?php if ($has_unit_fields_static): ?>
                                    <a href="add.php?parent_id=<?php echo $property['id']; ?>" class="btn-link" title="Add Unit">+ Unit</a>
                                    <?php endif; ?>
                                    <a href="?delete=<?php echo $property['id']; ?>" 
                                       onclick="return confirmDelete('Are you sure you want to delete this property?')" 
                                       class="btn-link text-danger">Delete</a>
                                </td>
                            </tr>
                            <?php if ($has_unit_fields_static && !empty($property['units'])): foreach ($property['units'] as $unit): ?>
                            <tr class="unit-row" data-master-id="<?php echo $property['id']; ?>" style="display: none; background: #f9fafb;">
                                <td style="padding-left: 40px;">
                                    <span style="margin-right: 10px;">└─</span>
                                    <strong><?php echo htmlspecialchars($unit['unit_name'] ?? $unit['property_name']); ?></strong>
                                </td>
                                <td>
                                    <span class="badge badge-info">Unit</span>
                                </td>
                                <td><?php echo htmlspecialchars($unit['address'] . ', ' . $unit['city']); ?></td>
                                <td><?php echo htmlspecialchars($unit['property_type']); ?></td>
                                <td>
                                    <span class="badge badge-<?php 
                                        echo $unit['status'] == 'Occupied' ? 'success' : 
                                            ($unit['status'] == 'Under Maintenance' ? 'warning' : 'info'); 
                                    ?>">
                                        <?php echo htmlspecialchars($unit['status']); ?>
                                    </span>
                                </td>
                                <td><?php echo $unit['active_tenants']; ?></td>
                                <td><?php echo formatCurrency($unit['monthly_rent'] ?? 0); ?></td>
                                <td><?php echo formatCurrency($unit['current_value'] ?? 0); ?></td>
                                <td>
                                    <a href="view.php?id=<?php echo $unit['id']; ?>" class="btn-link">View</a>
                                    <a href="edit.php?id=<?php echo $unit['id']; ?>" class="btn-link">Edit</a>
                                    <a href="?delete=<?php echo $unit['id']; ?>" 
                                       onclick="return confirmDelete('Are you sure you want to delete this unit?')" 
                                       class="btn-link text-danger">Delete</a>
                                </td>
                            </tr>
                            <?php endforeach; endif; ?>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <div class="text-center" style="padding: 60px 20px;">
                <p class="text-muted" style="font-size: 18px; margin-bottom: 20px;">No properties yet</p>
                <a href="add.php" class="btn btn-primary">Add Your First Property</a>
            </div>
        <?php endif; ?>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.toggle-units').forEach(function(toggle) {
        toggle.addEventListener('click', function() {
            const masterId = this.closest('tr').dataset.masterId;
            const unitRows = document.querySelectorAll('tr.unit-row[data-master-id="' + masterId + '"]');
            const isExpanded = this.textContent === '▼';
            
            // Toggle icon
            this.textContent = isExpanded ? '▶' : '▼';
            
            // Toggle unit rows visibility
            unitRows.forEach(function(row) {
                row.style.display = isExpanded ? 'none' : 'table-row';
            });
        });
    });
});
</script>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>
