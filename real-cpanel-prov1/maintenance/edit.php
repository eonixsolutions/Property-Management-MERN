<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header('Location: index.php');
    exit();
}

$request_id = intval($_GET['id']);
$error = '';

// Get maintenance request details
$request = $conn->query("SELECT mr.*, p.user_id as property_owner
    FROM maintenance_requests mr
    INNER JOIN properties p ON mr.property_id = p.id
    WHERE mr.id = $request_id AND p.user_id = $user_id")->fetch_assoc();

if (!$request) {
    header('Location: index.php');
    exit();
}

// Get properties and tenants
$properties_result = getPropertiesForDropdown($conn, $user_id);
$tenants = $conn->query("SELECT t.id, t.first_name, t.last_name, p.property_name
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE p.user_id = $user_id
    ORDER BY t.first_name");

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $property_id = intval($_POST['property_id']);
    $tenant_id = !empty($_POST['tenant_id']) ? intval($_POST['tenant_id']) : null;
    $title = sanitizeInput($_POST['title']);
    $description = sanitizeInput($_POST['description']);
    $priority = $_POST['priority'];
    $status = $_POST['status'];
    $cost = !empty($_POST['cost']) ? floatval($_POST['cost']) : null;
    $completed_date = !empty($_POST['completed_date']) ? $_POST['completed_date'] : null;
    
    if (empty($property_id) || empty($title) || empty($description)) {
        $error = 'Please fill in all required fields';
    } else {
        // 9 parameters: property_id(i), tenant_id(i), title(s), description(s), priority(s), status(s), cost(d), completed_date(s), id(i)
        $stmt = $conn->prepare("UPDATE maintenance_requests SET property_id = ?, tenant_id = ?, title = ?, description = ?, priority = ?, status = ?, cost = ?, completed_date = ? WHERE id = ?");
        $stmt->bind_param("iissssdsi", $property_id, $tenant_id, $title, $description, $priority, $status, $cost, $completed_date, $request_id);
        
        if ($stmt->execute()) {
            header('Location: index.php?updated=1');
            exit();
        } else {
            $error = 'Error updating maintenance request. Please try again.';
        }
        
        $stmt->close();
    }
}

closeDBConnection($conn);

$page_title = 'Edit Maintenance Request';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Edit Maintenance Request</h1>
    <a href="index.php" class="btn-link">← Back to Maintenance</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-group">
                <label for="property_id">Property *</label>
                <select id="property_id" name="property_id" required>
                    <?php foreach ($properties_result as $property): ?>
                        <option value="<?php echo $property['id']; ?>" <?php echo ($request['property_id'] == $property['id']) ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($property['display_name']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="form-group">
                <label for="tenant_id">Tenant (Optional)</label>
                <select id="tenant_id" name="tenant_id">
                    <option value="">Select Tenant</option>
                    <?php while ($tenant = $tenants->fetch_assoc()): ?>
                        <option value="<?php echo $tenant['id']; ?>" <?php echo ($request['tenant_id'] == $tenant['id']) ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name'] . ' - ' . $tenant['property_name']); ?>
                        </option>
                    <?php endwhile; ?>
                </select>
            </div>
            
            <div class="form-group">
                <label for="title">Title *</label>
                <input type="text" id="title" name="title" value="<?php echo htmlspecialchars($request['title']); ?>" required>
            </div>
            
            <div class="form-group">
                <label for="description">Description *</label>
                <textarea id="description" name="description" rows="5" required><?php echo htmlspecialchars($request['description']); ?></textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="priority">Priority *</label>
                    <select id="priority" name="priority" required>
                        <option value="Low" <?php echo $request['priority'] == 'Low' ? 'selected' : ''; ?>>Low</option>
                        <option value="Medium" <?php echo $request['priority'] == 'Medium' ? 'selected' : ''; ?>>Medium</option>
                        <option value="High" <?php echo $request['priority'] == 'High' ? 'selected' : ''; ?>>High</option>
                        <option value="Emergency" <?php echo $request['priority'] == 'Emergency' ? 'selected' : ''; ?>>Emergency</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="status">Status *</label>
                    <select id="status" name="status" required>
                        <option value="Pending" <?php echo $request['status'] == 'Pending' ? 'selected' : ''; ?>>Pending</option>
                        <option value="In Progress" <?php echo $request['status'] == 'In Progress' ? 'selected' : ''; ?>>In Progress</option>
                        <option value="Completed" <?php echo $request['status'] == 'Completed' ? 'selected' : ''; ?>>Completed</option>
                        <option value="Cancelled" <?php echo $request['status'] == 'Cancelled' ? 'selected' : ''; ?>>Cancelled</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cost">Cost</label>
                    <input type="number" id="cost" name="cost" step="0.01" min="0" value="<?php echo $request['cost'] ?? ''; ?>">
                </div>
                
                <div class="form-group">
                    <label for="completed_date">Completed Date</label>
                    <input type="date" id="completed_date" name="completed_date" value="<?php echo $request['completed_date'] ?? ''; ?>">
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Request</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
