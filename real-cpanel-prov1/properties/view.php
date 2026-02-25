<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header('Location: index.php');
    exit();
}

$property_id = intval($_GET['id']);

// Get property details
$stmt = $conn->prepare("SELECT * FROM properties WHERE id = ? AND user_id = ?");
$stmt->bind_param("ii", $property_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    header('Location: index.php');
    exit();
}

$property = $result->fetch_assoc();
$stmt->close();

// Get tenants for this property
$tenants = $conn->query("SELECT * FROM tenants WHERE property_id = $property_id ORDER BY move_in_date DESC");

// Get transactions for this property
$transactions = $conn->query("SELECT t.*, tn.first_name, tn.last_name 
    FROM transactions t
    LEFT JOIN tenants tn ON t.tenant_id = tn.id
    WHERE t.property_id = $property_id
    ORDER BY t.transaction_date DESC
    LIMIT 10");

// Check if unit fields exist
$check_unit_fields = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit_fields->num_rows > 0;

// Get units if this is a master property
$units = null;
$units_count = 0;
$parent_property = null;

if ($has_unit_fields) {
    // Get units with tenant counts and rent totals
    $units_result = $conn->query("SELECT p.id, p.property_name, p.unit_name, p.is_unit, p.status,
        (SELECT COUNT(*) FROM tenants WHERE property_id = p.id AND status = 'Active') as active_tenants,
        (SELECT COALESCE(SUM(monthly_rent), 0) FROM tenants WHERE property_id = p.id AND status = 'Active') as total_rent
        FROM properties p 
        WHERE p.parent_property_id = $property_id AND p.user_id = $user_id 
        ORDER BY p.unit_name");
    
    if ($units_result) {
        $units = $units_result;
        $units_count = $units->num_rows;
    }
    
    // Check if this property is a unit
    $has_parent = !empty($property['parent_property_id']) && $property['parent_property_id'] != 0;
    $is_unit_flag = isset($property['is_unit']) && $property['is_unit'] == 1;
    $is_unit_property = $has_parent || $is_unit_flag;
    
    // Only set parent_property if there's a valid parent_property_id
    if ($is_unit_property && $has_parent) {
        $parent_property = $conn->query("SELECT * FROM properties WHERE id = {$property['parent_property_id']} AND user_id = $user_id")->fetch_assoc();
    }
}

// Get property images if this is a unit
$property_images = null;
$has_images = false;
if ($has_unit_fields && $parent_property) {
    $check_images_table = $conn->query("SHOW TABLES LIKE 'property_images'");
    if ($check_images_table->num_rows > 0) {
        $property_images = $conn->query("SELECT * FROM property_images WHERE property_id = $property_id ORDER BY is_primary DESC, display_order ASC");
        $has_images = $property_images && $property_images->num_rows > 0;
    }
}

closeDBConnection($conn);

$page_title = 'View Property';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>
        <?php echo htmlspecialchars($property['property_name']); ?>
        <?php if ($has_unit_fields && $parent_property): ?>
            <span class="badge badge-info">Unit</span>
        <?php endif; ?>
    </h1>
    <div>
        <?php if ($has_unit_fields && !$parent_property): ?>
            <a href="add.php?parent_id=<?php echo $property['id']; ?>" class="btn" style="margin-right: 12px;">+ Add Unit</a>
        <?php endif; ?>
        <a href="edit.php?id=<?php echo $property['id']; ?>" class="btn btn-primary">Edit Property</a>
        <a href="index.php" class="btn-link">← Back to Properties</a>
    </div>
</div>

<?php if ($has_unit_fields && $parent_property): ?>
    <div class="alert alert-info">
        <strong>Unit Information:</strong> This property is a unit of 
        <a href="view.php?id=<?php echo $parent_property['id']; ?>"><?php echo htmlspecialchars($parent_property['property_name']); ?></a>
        <?php if (!empty($parent_property['owner_name'])): ?>
            (Owner: <?php echo htmlspecialchars($parent_property['owner_name']); ?> - 
            Rent: <?php echo formatCurrency($parent_property['monthly_rent_to_owner']); ?>/month)
        <?php endif; ?>
    </div>
    
    <!-- Unit Photos Section -->
    <div class="content-card" style="margin-bottom: 30px;">
        <div class="card-header">
            <h2>📸 Unit Photos</h2>
        </div>
        <div class="card-body">
            <!-- Image Upload Area -->
            <div id="uploadArea" style="margin-bottom: 24px; padding: 20px; border: 2px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; transition: all 0.3s;">
                <form id="imageUploadForm" enctype="multipart/form-data" style="margin: 0;">
                    <input type="hidden" name="property_id" value="<?php echo $property_id; ?>">
                    
                    <!-- Drag and Drop Zone -->
                    <div id="dropZone" style="padding: 40px; text-align: center; border: 2px dashed #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer; transition: all 0.3s;">
                        <div style="font-size: 48px; margin-bottom: 12px;">📸</div>
                        <div style="font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
                            Drag & drop photos here to auto-upload
                        </div>
                        <div style="font-size: 14px; color: #64748b; margin-bottom: 16px;">
                            Photos will upload automatically when dropped or selected
                        </div>
                        <input type="file" id="imageInput" name="image[]" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" multiple style="display: none;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('imageInput').click()" style="margin-right: 8px;">Choose Files</button>
                        <button type="submit" class="btn btn-primary" id="uploadBtn" disabled style="display: none;">Upload Photos</button>
                        <div style="font-size: 12px; color: #94a3b8; margin-top: 12px;">Max 5MB per file - JPEG, PNG, GIF, WebP</div>
                    </div>
                    
                    <!-- Selected Files List -->
                    <div id="selectedFiles" style="margin-top: 16px; display: none;"></div>
                    
                    <!-- Upload Progress -->
                    <div id="uploadProgress" style="margin-top: 16px; display: none;"></div>
                </form>
                <div id="uploadStatus" style="margin-top: 12px; display: none;"></div>
            </div>
            
            <!-- Images Gallery -->
            <div id="imagesGallery" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                <?php if ($has_images && $property_images): 
                    $property_images->data_seek(0); // Reset pointer
                    while ($image = $property_images->fetch_assoc()): 
                        $image_url = '../' . htmlspecialchars($image['image_path']);
                        $is_primary = $image['is_primary'] == 1;
                ?>
                    <div class="image-item" data-image-id="<?php echo $image['id']; ?>" style="position: relative; border: 2px solid <?php echo $is_primary ? '#4f46e5' : '#e2e8f0'; ?>; border-radius: 8px; overflow: hidden; background: #fff;">
                        <img src="<?php echo $image_url; ?>" alt="<?php echo htmlspecialchars($image['image_name']); ?>" style="width: 100%; height: 200px; object-fit: cover; display: block;">
                        <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px;">
                            <?php if ($is_primary): ?>
                                <span class="badge badge-primary" style="font-size: 11px;">Primary</span>
                            <?php else: ?>
                                <button class="set-primary-btn" data-image-id="<?php echo $image['id']; ?>" style="padding: 4px 8px; font-size: 11px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer;">Set Primary</button>
                            <?php endif; ?>
                            <button class="delete-image-btn" data-image-id="<?php echo $image['id']; ?>" style="padding: 4px 8px; font-size: 11px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                        </div>
                        <div style="padding: 8px; font-size: 12px; color: #64748b; background: #f8fafc;">
                            <?php echo htmlspecialchars($image['image_name']); ?>
                        </div>
                    </div>
                <?php endwhile; ?>
                <?php else: ?>
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
                        <p>No photos uploaded yet. Upload photos to showcase this unit.</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
<?php endif; ?>

<div class="dashboard-grid">
    <div class="content-card">
        <div class="card-header">
            <h2>Property Details</h2>
        </div>
        <div class="card-body">
            <table class="data-table">
                <tr>
                    <td><strong>Property Name</strong></td>
                    <td><?php echo htmlspecialchars($property['property_name']); ?></td>
                </tr>
                <tr>
                    <td><strong>Address</strong></td>
                    <td><?php echo htmlspecialchars($property['address']); ?></td>
                </tr>
                <tr>
                    <td><strong>City</strong></td>
                    <td><?php echo htmlspecialchars($property['city']); ?></td>
                </tr>
                <tr>
                    <td><strong>State</strong></td>
                    <td><?php echo htmlspecialchars($property['state'] ?? '-'); ?></td>
                </tr>
                <tr>
                    <td><strong>Zip Code</strong></td>
                    <td><?php echo htmlspecialchars($property['zip_code'] ?? '-'); ?></td>
                </tr>
                <tr>
                    <td><strong>Property Type</strong></td>
                    <td><?php echo htmlspecialchars($property['property_type']); ?></td>
                </tr>
                <tr>
                    <td><strong>Status</strong></td>
                    <td>
                        <span class="badge badge-<?php 
                            echo $property['status'] == 'Occupied' ? 'success' : 
                                ($property['status'] == 'Under Maintenance' ? 'warning' : 'info'); 
                        ?>">
                            <?php echo htmlspecialchars($property['status']); ?>
                        </span>
                    </td>
                </tr>
                <tr>
                    <td><strong>Bedrooms</strong></td>
                    <td><?php echo $property['bedrooms'] ?? '-'; ?></td>
                </tr>
                <tr>
                    <td><strong>Bathrooms</strong></td>
                    <td><?php echo $property['bathrooms'] ?? '-'; ?></td>
                </tr>
                <tr>
                    <td><strong>Square Feet</strong></td>
                    <td><?php echo $property['square_feet'] ? number_format($property['square_feet']) : '-'; ?></td>
                </tr>
                <tr>
                    <td><strong>Current Value</strong></td>
                    <td><?php echo formatCurrency($property['current_value'] ?? 0); ?></td>
                </tr>
                <?php if ($property['notes']): ?>
                <tr>
                    <td><strong>Notes</strong></td>
                    <td><?php echo nl2br(htmlspecialchars($property['notes'])); ?></td>
                </tr>
                <?php endif; ?>
            </table>
        </div>
    </div>

    <?php if ($has_unit_fields && $units && $units_count > 0): ?>
    <div class="content-card" style="margin-bottom: 30px;">
        <div class="card-header">
            <h2>🏗️ Property Units (<?php echo $units_count; ?>)</h2>
            <a href="add.php?parent_id=<?php echo $property['id']; ?>" class="btn-link">+ Add Unit</a>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Unit Name</th>
                            <th>Tenants</th>
                            <th>Total Rent</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php 
                        $total_units_rent = 0;
                        while ($unit = $units->fetch_assoc()): 
                            $total_rent = $unit['total_rent'] ?? 0;
                            $active_tenants = $unit['active_tenants'] ?? 0;
                            $unit_status = $unit['status'] ?? 'Vacant';
                            $total_units_rent += $total_rent;
                        ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($unit['unit_name'] ?? $unit['property_name'] ?? ''); ?></strong></td>
                                <td><?php echo $active_tenants; ?></td>
                                <td><?php echo formatCurrency($total_rent); ?></td>
                                <td>
                                    <span class="badge badge-<?php 
                                        echo $unit_status == 'Occupied' ? 'success' : 
                                            ($unit_status == 'Under Maintenance' ? 'warning' : 'info'); 
                                    ?>">
                                        <?php echo htmlspecialchars($unit_status); ?>
                                    </span>
                                </td>
                                <td>
                                    <a href="view.php?id=<?php echo $unit['id']; ?>" class="btn-link">View</a>
                                    <a href="edit.php?id=<?php echo $unit['id']; ?>" class="btn-link">Edit</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                    <tfoot>
                        <tr style="background: #f0f9ff; font-weight: 600;">
                            <td><strong>Total Units Rent</strong></td>
                            <td></td>
                            <td><strong><?php echo formatCurrency($total_units_rent); ?></strong></td>
                            <td></td>
                            <td></td>
                        </tr>
                        <?php if (!empty($property['owner_name']) && !empty($property['monthly_rent_to_owner'])): ?>
                        <tr style="background: #fef3c7; font-weight: 600;">
                            <td><strong>Owner Rent (Monthly)</strong></td>
                            <td></td>
                            <td><strong>-<?php echo formatCurrency($property['monthly_rent_to_owner']); ?></strong></td>
                            <td></td>
                            <td></td>
                        </tr>
                        <tr style="background: #d1fae5; font-weight: 600;">
                            <td><strong>Net Profit (Monthly)</strong></td>
                            <td></td>
                            <td><strong><?php echo formatCurrency($total_units_rent - $property['monthly_rent_to_owner']); ?></strong></td>
                            <td></td>
                            <td></td>
                        </tr>
                        <?php endif; ?>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <div class="content-card">
        <div class="card-header">
            <h2>Tenants</h2>
            <a href="../tenants/add.php?property_id=<?php echo $property['id']; ?>" class="btn-link">+ Add Tenant</a>
        </div>
        <div class="card-body">
            <?php if ($tenants->num_rows > 0): ?>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Monthly Rent</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while ($tenant = $tenants->fetch_assoc()): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']); ?></td>
                                    <td>
                                        <span class="badge badge-<?php echo $tenant['status'] == 'Active' ? 'success' : 'info'; ?>">
                                            <?php echo htmlspecialchars($tenant['status']); ?>
                                        </span>
                                    </td>
                                    <td><?php echo formatCurrency($tenant['monthly_rent']); ?></td>
                                    <td>
                                        <a href="../tenants/view.php?id=<?php echo $tenant['id']; ?>" class="btn-link">View</a>
                                    </td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <p class="text-muted">No tenants for this property.</p>
            <?php endif; ?>
        </div>
    </div>
</div>

<div class="content-card mt-20">
    <div class="card-header">
        <h2>Recent Transactions</h2>
        <a href="../transactions/add.php?property_id=<?php echo $property['id']; ?>" class="btn-link">+ Add Transaction</a>
    </div>
    <div class="card-body">
        <?php if ($transactions->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($transaction = $transactions->fetch_assoc()): ?>
                            <tr>
                                <td><?php echo formatDate($transaction['transaction_date']); ?></td>
                                <td>
                                    <span class="badge badge-<?php echo $transaction['type'] == 'Income' ? 'success' : 'danger'; ?>">
                                        <?php echo $transaction['type']; ?>
                                    </span>
                                </td>
                                <td><?php echo htmlspecialchars($transaction['category']); ?></td>
                                <td class="<?php echo $transaction['type'] == 'Income' ? 'text-success' : 'text-danger'; ?>">
                                    <?php echo $transaction['type'] == 'Income' ? '+' : '-'; ?><?php echo formatCurrency($transaction['amount']); ?>
                                </td>
                                <td><?php echo htmlspecialchars($transaction['description'] ?? '-'); ?></td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-muted">No transactions for this property.</p>
        <?php endif; ?>
    </div>
</div>

<?php if ($has_unit_fields && $parent_property): ?>
<script>
// Drag and Drop Handlers
const dropZone = document.getElementById('dropZone');
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const selectedFilesDiv = document.getElementById('selectedFiles');
const uploadBtn = document.getElementById('uploadBtn');
const uploadProgress = document.getElementById('uploadProgress');

if (dropZone && imageInput) {
    // Click to browse
    dropZone.addEventListener('click', () => imageInput.click());
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = '#4f46e5';
            dropZone.style.background = '#eef2ff';
            dropZone.style.borderWidth = '3px';
            dropZone.style.transform = 'scale(1.02)';
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = '#cbd5e1';
            dropZone.style.background = '#fff';
            dropZone.style.borderWidth = '2px';
            dropZone.style.transform = 'scale(1)';
        }, false);
    });
    
    // Handle dropped files - auto upload on drop
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            // Auto-upload immediately on drop
            handleFilesAndUpload(files);
        }
    }
    
    // Handle file input change - auto upload on selection
    imageInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            // Auto-upload immediately on file selection
            handleFilesAndUpload(this.files);
        }
    });
}

// Track if upload is in progress to prevent multiple simultaneous uploads
let isUploading = false;

// New function to handle files and auto-upload
function handleFilesAndUpload(files) {
    if (!files || files.length === 0) return;
    
    // Prevent multiple simultaneous uploads
    if (isUploading) {
        showStatus('Please wait for current upload to complete', 'info');
        return;
    }
    
    const validFiles = [];
    const errors = [];
    
    // Validate files
    Array.from(files).forEach((file, index) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!allowedTypes.includes(file.type)) {
            errors.push(`${file.name}: Invalid file type`);
            return;
        }
        
        if (file.size > maxSize) {
            errors.push(`${file.name}: File size exceeds 5MB`);
            return;
        }
        
        validFiles.push(file);
    });
    
    // Show errors if any
    if (errors.length > 0) {
        showStatus(errors.join('<br>'), 'error');
    }
    
    // If we have valid files, upload immediately
    if (validFiles.length > 0) {
        // Update file input with valid files
        const dataTransfer = new DataTransfer();
        validFiles.forEach(file => dataTransfer.items.add(file));
        imageInput.files = dataTransfer.files;
        
        // Show immediate feedback
        showStatus(`Uploading ${validFiles.length} photo(s)...`, 'info');
        uploadProgress.style.display = 'block';
        uploadProgress.innerHTML = `
            <div style="padding: 12px; background: #eef2ff; border-radius: 8px; border: 1px solid #c7d2fe;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 20px; height: 20px; border: 3px solid #4f46e5; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    <div style="color: #4f46e5; font-weight: 500;">Uploading ${validFiles.length} photo(s)...</div>
                </div>
            </div>
        `;
        
        // Add spin animation
        if (!document.getElementById('upload-spin-style')) {
            const style = document.createElement('style');
            style.id = 'upload-spin-style';
            style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        
        // Disable drop zone during upload
        dropZone.style.pointerEvents = 'none';
        dropZone.style.opacity = '0.6';
        dropZone.style.cursor = 'wait';
        
        // Start upload immediately
        isUploading = true;
        uploadFiles(validFiles).catch(() => {
            // Error already handled in uploadFiles
        }).finally(() => {
            isUploading = false;
        });
    } else {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Upload Photos';
        selectedFilesDiv.style.display = 'none';
    }
}

// Keep old handleFiles for backward compatibility if needed
function handleFiles(files) {
    handleFilesAndUpload(files);
}

// Store files globally for removeFile to access
let currentFiles = [];

function displaySelectedFiles(files) {
    if (!files || files.length === 0) {
        selectedFilesDiv.style.display = 'none';
        currentFiles = [];
        return;
    }
    
    // Store current files
    currentFiles = Array.from(files);
    
    const fileList = currentFiles.map((file, index) => {
        const size = (file.size / 1024 / 1024).toFixed(2);
        return `
            <div id="file-item-${index}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #1e293b;">${escapeHtml(file.name)}</div>
                    <div style="font-size: 12px; color: #64748b;">${size} MB</div>
                </div>
                <button type="button" onclick="removeFile(${index})" style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Remove</button>
            </div>
        `;
    }).join('');
    
    selectedFilesDiv.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Selected Files (${files.length})</div>
        <div id="fileList">${fileList}</div>
    `;
    selectedFilesDiv.style.display = 'block';
}

function removeFile(index) {
    if (index < 0 || index >= currentFiles.length) return;
    
    // Remove file from array
    currentFiles.splice(index, 1);
    
    // Update file input
    const dt = new DataTransfer();
    currentFiles.forEach(file => dt.items.add(file));
    imageInput.files = dt.files;
    
    // Refresh display
    if (currentFiles.length > 0) {
        displaySelectedFiles(imageInput.files);
        uploadBtn.disabled = false;
        uploadBtn.textContent = currentFiles.length === 1 ? 'Upload Photo' : `Upload ${currentFiles.length} Photos`;
    } else {
        selectedFilesDiv.style.display = 'none';
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Upload Photos';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Upload function that can be called directly
async function uploadFiles(files) {
    if (!files || files.length === 0) {
        showStatus('Please select at least one image file', 'error');
        isUploading = false;
        return Promise.resolve();
    }
    
    const formData = new FormData();
    const propertyIdInput = document.querySelector('input[name="property_id"]');
    if (!propertyIdInput || !propertyIdInput.value) {
        showStatus('Error: Property ID not found', 'error');
        if (dropZone) {
            dropZone.style.pointerEvents = 'auto';
            dropZone.style.opacity = '1';
            dropZone.style.cursor = 'pointer';
        }
        isUploading = false;
        return Promise.resolve();
    }
    formData.append('property_id', propertyIdInput.value);
    
    // Add all files to FormData
    Array.from(files).forEach(file => {
        formData.append('image[]', file);
    });
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    const fileCount = files.length;
    
    try {
        const response = await fetch('upload_image.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const uploadedCount = data.uploaded_count || data.uploaded?.length || 0;
            const errorCount = data.error_count || 0;
            
            let message = `${uploadedCount} photo(s) uploaded successfully!`;
            if (errorCount > 0) {
                message += ` ${errorCount} file(s) failed.`;
                if (data.errors && data.errors.length > 0) {
                    message += '<br>' + data.errors.join('<br>');
                }
            }
            
            showStatus(message, errorCount > 0 ? 'error' : 'success');
            imageInput.value = '';
            selectedFilesDiv.style.display = 'none';
            uploadProgress.style.display = 'none';
            
            // Reset drop zone
            if (dropZone) {
                dropZone.style.pointerEvents = 'auto';
                dropZone.style.opacity = '1';
                dropZone.style.cursor = 'pointer';
            }
            
            // Reload page after 1.5 seconds to show new images
            setTimeout(() => location.reload(), 1500);
        } else {
            showStatus(data.error || 'Upload failed', 'error');
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload Photos';
            uploadProgress.style.display = 'none';
            
            // Reset drop zone
            if (dropZone) {
                dropZone.style.pointerEvents = 'auto';
                dropZone.style.opacity = '1';
                dropZone.style.cursor = 'pointer';
            }
        }
    } catch (error) {
        showStatus('Error uploading images: ' + error.message, 'error');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Photos';
        uploadProgress.style.display = 'none';
        
        // Reset drop zone
        if (dropZone) {
            dropZone.style.pointerEvents = 'auto';
            dropZone.style.opacity = '1';
            dropZone.style.cursor = 'pointer';
        }
    } finally {
        isUploading = false;
    }
}

// Image Upload Handler - form submit (fallback for button click)
document.getElementById('imageUploadForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const files = imageInput.files;
    if (files && files.length > 0) {
        uploadFiles(Array.from(files));
    }
});

// Set Primary Image
document.querySelectorAll('.set-primary-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
        const imageId = this.dataset.imageId;
        if (!confirm('Set this image as the primary photo?')) return;
        
        this.disabled = true;
        this.textContent = 'Setting...';
        
        try {
            const formData = new FormData();
            formData.append('image_id', imageId);
            
            const response = await fetch('set_primary_image.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                location.reload();
            } else {
                alert(data.error || 'Failed to set primary image');
                this.disabled = false;
                this.textContent = 'Set Primary';
            }
        } catch (error) {
            alert('Error: ' + error.message);
            this.disabled = false;
            this.textContent = 'Set Primary';
        }
    });
});

// Delete Image
document.querySelectorAll('.delete-image-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
        const imageId = this.dataset.imageId;
        if (!confirm('Are you sure you want to delete this image?')) return;
        
        const imageItem = this.closest('.image-item');
        this.disabled = true;
        this.textContent = 'Deleting...';
        
        try {
            const formData = new FormData();
            formData.append('image_id', imageId);
            
            const response = await fetch('delete_image.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                imageItem.style.opacity = '0.5';
                imageItem.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    imageItem.remove();
                    // If no images left, show message
                    const gallery = document.getElementById('imagesGallery');
                    if (gallery && gallery.querySelectorAll('.image-item').length === 0) {
                        gallery.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;"><p>No photos uploaded yet. Upload photos to showcase this unit.</p></div>';
                    }
                }, 300);
            } else {
                alert(data.error || 'Failed to delete image');
                this.disabled = false;
                this.textContent = 'Delete';
            }
        } catch (error) {
            alert('Error: ' + error.message);
            this.disabled = false;
            this.textContent = 'Delete';
        }
    });
});

function showStatus(message, type) {
    const uploadStatus = document.getElementById('uploadStatus');
    if (!uploadStatus) return;
    
    uploadStatus.style.display = 'block';
    let alertClass = 'alert';
    if (type === 'error') {
        alertClass = 'alert alert-error';
    } else if (type === 'success') {
        alertClass = 'alert alert-success';
    } else {
        alertClass = 'alert alert-info';
    }
    uploadStatus.className = alertClass;
    
    // Use innerHTML to support HTML content like <br> tags
    if (message && message.includes('<')) {
        uploadStatus.innerHTML = message;
    } else {
        uploadStatus.textContent = message;
    }
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            uploadStatus.style.display = 'none';
        }, 5000);
    }
}
</script>
<?php endif; ?>

<?php include '../includes/footer.php'; ?>
