<?php
require_once '../config/config.php';
requireLogin();

header('Content-Type: application/json');

$conn = getDBConnection();
$user_id = getCurrentUserId();

$image_id = isset($_POST['image_id']) ? intval($_POST['image_id']) : 0;

if ($image_id == 0) {
    echo json_encode(['success' => false, 'error' => 'Invalid image ID']);
    closeDBConnection($conn);
    exit;
}

// Get image info and verify property belongs to user
$image_query = $conn->query("
    SELECT pi.*, p.user_id 
    FROM property_images pi
    INNER JOIN properties p ON pi.property_id = p.id
    WHERE pi.id = $image_id AND p.user_id = $user_id
");

if (!$image_query || $image_query->num_rows == 0) {
    echo json_encode(['success' => false, 'error' => 'Image not found or access denied']);
    closeDBConnection($conn);
    exit;
}

$image = $image_query->fetch_assoc();

// Delete file from filesystem
$file_path = __DIR__ . '/../' . $image['image_path'];
if (file_exists($file_path)) {
    unlink($file_path);
}

// Delete from database
$stmt = $conn->prepare("DELETE FROM property_images WHERE id = ?");
$stmt->bind_param("i", $image_id);

if ($stmt->execute()) {
    // If this was the primary image, set another one as primary
    if ($image['is_primary']) {
        $update_primary = $conn->query("
            UPDATE property_images 
            SET is_primary = 1 
            WHERE property_id = {$image['property_id']} 
            ORDER BY display_order ASC 
            LIMIT 1
        ");
    }
    
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to delete image']);
}

$stmt->close();
closeDBConnection($conn);
?>

