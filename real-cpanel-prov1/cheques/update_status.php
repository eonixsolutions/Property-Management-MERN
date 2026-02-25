<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

$type = isset($_GET['type']) ? $_GET['type'] : '';
$cheque_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$status = isset($_GET['status']) ? $_GET['status'] : '';

if (!$cheque_id || !$type || !$status) {
    header('Location: ' . ($type == 'owner' ? 'owners.php' : 'tenants.php'));
    exit();
}

if ($type == 'tenant') {
    // Verify cheque belongs to user
    $check = $conn->query("SELECT tc.id FROM tenant_cheques tc
        INNER JOIN properties p ON tc.property_id = p.id
        WHERE tc.id = $cheque_id AND p.user_id = $user_id");
    
    if ($check->num_rows > 0) {
        $stmt = $conn->prepare("UPDATE tenant_cheques SET status = ? WHERE id = ?");
        $stmt->bind_param("si", $status, $cheque_id);
        $stmt->execute();
        $stmt->close();
    }
    
    closeDBConnection($conn);
    header('Location: tenants.php?updated=1');
} else {
    // Verify cheque belongs to user
    $check = $conn->query("SELECT oc.id FROM owner_cheques oc
        INNER JOIN properties p ON oc.property_id = p.id
        WHERE oc.id = $cheque_id AND p.user_id = $user_id");
    
    if ($check->num_rows > 0) {
        $stmt = $conn->prepare("UPDATE owner_cheques SET status = ? WHERE id = ?");
        $stmt->bind_param("si", $status, $cheque_id);
        $stmt->execute();
        $stmt->close();
    }
    
    closeDBConnection($conn);
    header('Location: owners.php?updated=1');
}

exit();
?>

