<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

$error = '';
$success = '';

// Get properties and tenants
$properties_result = getPropertiesForDropdown($conn, $user_id);
$tenants = $conn->query("SELECT t.id, t.first_name, t.last_name, p.property_name
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE p.user_id = $user_id
    ORDER BY t.first_name");

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_FILES['document'])) {
    $property_id = !empty($_POST['property_id']) ? intval($_POST['property_id']) : null;
    $tenant_id = !empty($_POST['tenant_id']) ? intval($_POST['tenant_id']) : null;
    $document_type = $_POST['document_type'];
    $title = sanitizeInput($_POST['title']);
    
    if (empty($title) || empty($document_type) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
        $error = 'Please fill in all required fields and select a file';
    } else {
        $file = $_FILES['document'];
        $allowed_types = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt'];
        $file_ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if (!in_array($file_ext, $allowed_types)) {
            $error = 'Invalid file type. Allowed types: ' . implode(', ', $allowed_types);
        } elseif ($file['size'] > 10485760) { // 10MB limit
            $error = 'File size too large. Maximum size is 10MB';
        } else {
            $file_name = uniqid() . '_' . basename($file['name']);
            $upload_path = '../uploads/' . $file_name;
            
            if (move_uploaded_file($file['tmp_name'], $upload_path)) {
                $stmt = $conn->prepare("INSERT INTO documents (user_id, property_id, tenant_id, document_type, title, file_path, file_name, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $file_path = 'uploads/' . $file_name;
                $file_size = $file['size'];
                $stmt->bind_param("iiissssi", $user_id, $property_id, $tenant_id, $document_type, $title, $file_path, $file_name, $file_size);
                
                if ($stmt->execute()) {
                    $success = 'Document uploaded successfully!';
                    // Clear form
                    $_POST = [];
                } else {
                    $error = 'Error saving document to database.';
                    unlink($upload_path); // Delete uploaded file
                }
                
                $stmt->close();
            } else {
                $error = 'Error uploading file. Please try again.';
            }
        }
    }
}

closeDBConnection($conn);

$page_title = 'Upload Document';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Upload Document</h1>
    <a href="index.php" class="btn-link">← Back to Documents</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<?php if ($success): ?>
    <div class="alert alert-success"><?php echo $success; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="" enctype="multipart/form-data">
            <div class="form-group">
                <label for="title">Document Title *</label>
                <input type="text" id="title" name="title" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="document_type">Document Type *</label>
                    <select id="document_type" name="document_type" required>
                        <option value="">Select Type</option>
                        <option value="Lease Agreement">Lease Agreement</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Receipt">Receipt</option>
                        <option value="Contract">Contract</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="document">File *</label>
                    <input type="file" id="document" name="document" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt" required>
                    <small class="text-muted">Max size: 10MB. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT</small>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="property_id">Property (Optional)</label>
                    <select id="property_id" name="property_id">
                        <option value="">Select Property</option>
                        <?php foreach ($properties_result as $property): ?>
                            <option value="<?php echo $property['id']; ?>">
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
                            <option value="<?php echo $tenant['id']; ?>">
                                <?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name'] . ' - ' . $tenant['property_name']); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Upload Document</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
