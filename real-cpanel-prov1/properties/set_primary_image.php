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

// Verify image belongs to user's property
$check_image = $conn->query("
    SELECT pi.*, p.user_id 
    FROM property_images pi
    INNER JOIN properties p ON pi.property_id = p.id
    WHERE pi.id = $image_id AND p.user_id = $user_id
");

if (!$check_image || $check_image->num_rows == 0) {
    echo json_encode(['success' => false, 'error' => 'Image not found or access denied']);
    closeDBConnection($conn);
    exit;
}

$image_data = $check_image->fetch_assoc();
$property_id = $image_data['property_id'];

// Remove primary from all images of this property
$conn->query("UPDATE property_images SET is_primary = 0 WHERE property_id = $property_id");

// Set this image as primary
$stmt = $conn->prepare("UPDATE property_images SET is_primary = 1 WHERE id = ?");
$stmt->bind_param("i", $image_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to set primary image']);
}

$stmt->close();
closeDBConnection($conn);
?>

