<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Get search and filter parameters
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$type_filter = isset($_GET['document_type']) ? $conn->real_escape_string($_GET['document_type']) : '';
$property_filter = isset($_GET['property']) ? intval($_GET['property']) : 0;

// Build WHERE clause with filters
$where_clause = "d.user_id = $user_id";

if (!empty($search)) {
    $where_clause .= " AND (d.title LIKE '%$search%' OR d.document_type LIKE '%$search%' OR p.property_name LIKE '%$search%' OR CONCAT(t.first_name, ' ', t.last_name) LIKE '%$search%')";
}

if (!empty($type_filter)) {
    $where_clause .= " AND d.document_type = '$type_filter'";
}

if ($property_filter > 0) {
    $where_clause .= " AND d.property_id = $property_filter";
}

// Get all documents
$documents_query = "SELECT d.*, p.property_name, t.first_name, t.last_name
    FROM documents d
    LEFT JOIN properties p ON d.property_id = p.id
    LEFT JOIN tenants t ON d.tenant_id = t.id
    WHERE $where_clause
    ORDER BY d.upload_date DESC";

$documents = $conn->query($documents_query);

// Get distinct document types and properties for filters
$document_types = $conn->query("SELECT DISTINCT document_type FROM documents WHERE user_id = $user_id AND document_type IS NOT NULL AND document_type != '' ORDER BY document_type");
// Get properties for filter dropdown with parent property info
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

if ($has_unit_fields) {
    $properties_for_filter_query = "SELECT DISTINCT p.id, p.property_name, p.parent_property_id, p.unit_name, parent.property_name as parent_property_name 
                                     FROM properties p 
                                     INNER JOIN documents d ON p.id = d.property_id 
                                     LEFT JOIN properties parent ON p.parent_property_id = parent.id
                                     WHERE d.user_id = $user_id 
                                     ORDER BY COALESCE(parent.property_name, p.property_name), p.unit_name, p.property_name";
} else {
    $properties_for_filter_query = "SELECT DISTINCT p.id, p.property_name FROM properties p INNER JOIN documents d ON p.id = d.property_id WHERE d.user_id = $user_id ORDER BY p.property_name";
}
$properties_for_filter = $conn->query($properties_for_filter_query);

$page_title = 'Documents';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Documents</h1>
    <a href="upload.php" class="btn btn-primary">+ Upload Document</a>
</div>

<!-- Search and Filter -->
<div class="content-card" style="margin-bottom: 20px;">
    <div class="card-body">
        <form method="GET" action="" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="search" style="font-size: 12px; margin-bottom: 4px;">Search</label>
                    <input type="text" id="search" name="search" placeholder="Search by title, type, property, tenant..." value="<?php echo htmlspecialchars($search); ?>" style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="type_filter" style="font-size: 12px; margin-bottom: 4px;">Document Type</label>
                    <select id="type_filter" name="document_type" style="width: 100%;">
                        <option value="">All Types</option>
                        <?php while ($dt = $document_types->fetch_assoc()): ?>
                            <option value="<?php echo htmlspecialchars($dt['document_type']); ?>" <?php echo $type_filter == $dt['document_type'] ? 'selected' : ''; ?>><?php echo htmlspecialchars($dt['document_type']); ?></option>
                        <?php endwhile; ?>
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
                    <?php if (!empty($search) || !empty($type_filter) || $property_filter > 0): ?>
                        <a href="index.php" class="btn">Clear</a>
                    <?php endif; ?>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="content-card">
    <div class="card-body">
        <?php if ($documents->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Type</th>
                            <th>Property</th>
                            <th>Tenant</th>
                            <th>Upload Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($doc = $documents->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($doc['title']); ?></strong></td>
                                <td><?php echo htmlspecialchars($doc['document_type']); ?></td>
                                <td><?php echo htmlspecialchars($doc['property_name'] ?? '-'); ?></td>
                                <td><?php echo $doc['first_name'] ? htmlspecialchars($doc['first_name'] . ' ' . $doc['last_name']) : '-'; ?></td>
                                <td><?php echo formatDate($doc['upload_date']); ?></td>
                                <td>
                                    <a href="<?php echo BASE_URL . '/uploads/' . $doc['file_name']; ?>" target="_blank" class="btn-link">Download</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <div class="text-center" style="padding: 60px 20px;">
                <p class="text-muted" style="font-size: 18px; margin-bottom: 20px;">No documents uploaded</p>
                <a href="upload.php" class="btn btn-primary">Upload Your First Document</a>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>
