<?php
require_once '../config/config.php';

// This endpoint is called by JavaScript to keep the session alive
// It simply updates the last_activity time by accessing the config

if (isLoggedIn()) {
    // The config.php file already updates last_activity on each request
    // Just return success
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'Session extended']);
} else {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
}
?>

