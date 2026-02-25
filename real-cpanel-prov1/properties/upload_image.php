<?php
require_once '../config/config.php';
requireLogin();

header('Content-Type: application/json');

$conn = getDBConnection();
$user_id = getCurrentUserId();

$property_id = isset($_POST['property_id']) ? intval($_POST['property_id']) : 0;

// Verify property belongs to user
$check_property = $conn->query("SELECT id, parent_property_id, is_unit FROM properties WHERE id = $property_id AND user_id = $user_id");
if (!$check_property || $check_property->num_rows == 0) {
    echo json_encode(['success' => false, 'error' => 'Property not found or access denied']);
    closeDBConnection($conn);
    exit;
}

$property_data = $check_property->fetch_assoc();

// Check if this is a unit (not a master property)
// A property is a unit if:
// 1. It has a parent_property_id (not null and not 0), OR
// 2. The is_unit flag is set to 1
$has_parent = !empty($property_data['parent_property_id']) && $property_data['parent_property_id'] != 0;
$is_unit_flag = isset($property_data['is_unit']) && $property_data['is_unit'] == 1;
$is_unit = $has_parent || $is_unit_flag;

// Only allow images on units, not master properties
if (!$is_unit) {
    echo json_encode([
        'success' => false, 
        'error' => 'Photos can only be added to units, not master properties. Please edit the unit to add photos.'
    ]);
    closeDBConnection($conn);
    exit;
}

// Check if property_images table exists
$check_table = $conn->query("SHOW TABLES LIKE 'property_images'");
if ($check_table->num_rows == 0) {
    // Create table if it doesn't exist
    $create_table = "CREATE TABLE IF NOT EXISTS property_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        image_name VARCHAR(255) NOT NULL,
        is_primary TINYINT(1) DEFAULT 0,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        KEY idx_property_images_property (property_id),
        KEY idx_property_images_primary (is_primary),
        KEY idx_property_images_order (display_order)
    )";
    $conn->query($create_table);
}

// Handle both single and multiple file uploads
$uploaded_files = [];
$errors = [];

// Check if we have files
if (!isset($_FILES['image'])) {
    echo json_encode(['success' => false, 'error' => 'No files uploaded']);
    closeDBConnection($conn);
    exit;
}

$files = $_FILES['image'];
$allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$max_size = 5 * 1024 * 1024; // 5MB

// Handle single or multiple files
$file_count = is_array($files['name']) ? count($files['name']) : 1;

// Create uploads/properties directory if it doesn't exist
$upload_dir = __DIR__ . '/../uploads/properties/';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Get existing count and max display order once
$check_existing = $conn->query("SELECT COUNT(*) as count FROM property_images WHERE property_id = $property_id");
$existing_count = $check_existing->fetch_assoc()['count'];
$get_order = $conn->query("SELECT MAX(display_order) as max_order FROM property_images WHERE property_id = $property_id");
$max_order = $get_order->fetch_assoc()['max_order'] ?? 0;
$current_display_order = $max_order;

// Process each file
for ($i = 0; $i < $file_count; $i++) {
    // Handle both single and multiple file formats
    $file_name = is_array($files['name']) ? $files['name'][$i] : $files['name'];
    $file_tmp = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
    $file_size = is_array($files['size']) ? $files['size'][$i] : $files['size'];
    $file_error = is_array($files['error']) ? $files['error'][$i] : $files['error'];
    $file_type = is_array($files['type']) ? $files['type'][$i] : $files['type'];
    
    // Check for upload errors
    if ($file_error !== UPLOAD_ERR_OK) {
        $errors[] = $file_name . ': Upload error';
        continue;
    }
    
    // Validate file type
    if (!in_array($file_type, $allowed_types)) {
        $errors[] = $file_name . ': Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.';
        continue;
    }
    
    // Validate file size
    if ($file_size > $max_size) {
        $errors[] = $file_name . ': File size exceeds 5MB limit.';
        continue;
    }
    
    // Generate unique filename
    $file_extension = pathinfo($file_name, PATHINFO_EXTENSION);
    $unique_filename = uniqid('prop_' . $property_id . '_', true) . '.' . $file_extension;
    $upload_path = $upload_dir . $unique_filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file_tmp, $upload_path)) {
        $errors[] = $file_name . ': Failed to save file';
        continue;
    }
    
    // Get relative path for database
    $relative_path = 'uploads/properties/' . $unique_filename;
    
    // Check if this is the first image (make it primary)
    $is_primary = ($existing_count == 0 && $i == 0) ? 1 : 0;
    $current_display_order++;
    $display_order = $current_display_order;
    
    // Insert into database
    $stmt = $conn->prepare("INSERT INTO property_images (property_id, image_path, image_name, is_primary, display_order) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("issii", $property_id, $relative_path, $file_name, $is_primary, $display_order);
    
    if ($stmt->execute()) {
        $image_id = $conn->insert_id;
        $uploaded_files[] = [
            'image_id' => $image_id,
            'image_path' => $relative_path,
            'image_name' => $file_name,
            'is_primary' => $is_primary
        ];
        $existing_count++; // Increment for next iteration
    } else {
        // Delete uploaded file if database insert fails
        unlink($upload_path);
        $errors[] = $file_name . ': Failed to save image record';
    }
    
    $stmt->close();
}

// Return response
if (count($uploaded_files) > 0) {
    echo json_encode([
        'success' => true,
        'uploaded' => $uploaded_files,
        'errors' => $errors,
        'uploaded_count' => count($uploaded_files),
        'error_count' => count($errors)
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => count($errors) > 0 ? implode(', ', $errors) : 'No files were uploaded successfully',
        'errors' => $errors
    ]);
}
closeDBConnection($conn);
?>

