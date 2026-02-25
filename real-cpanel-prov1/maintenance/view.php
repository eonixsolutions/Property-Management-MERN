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

// Get maintenance request details
$request = $conn->query("SELECT mr.*, p.property_name, p.address, t.first_name, t.last_name
    FROM maintenance_requests mr
    INNER JOIN properties p ON mr.property_id = p.id
    LEFT JOIN tenants t ON mr.tenant_id = t.id
    WHERE mr.id = $request_id AND p.user_id = $user_id")->fetch_assoc();

if (!$request) {
    header('Location: index.php');
    exit();
}

closeDBConnection($conn);

$page_title = 'View Maintenance Request';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1><?php echo htmlspecialchars($request['title']); ?></h1>
    <div>
        <a href="edit.php?id=<?php echo $request['id']; ?>" class="btn btn-primary">Edit Request</a>
        <a href="index.php" class="btn-link">← Back to Maintenance</a>
    </div>
</div>

<div class="content-card">
    <div class="card-header">
        <h2>Maintenance Request Details</h2>
    </div>
    <div class="card-body">
        <table class="data-table">
            <tr>
                <td><strong>Title</strong></td>
                <td><?php echo htmlspecialchars($request['title']); ?></td>
            </tr>
            <tr>
                <td><strong>Property</strong></td>
                <td><?php echo htmlspecialchars($request['property_name']); ?></td>
            </tr>
            <tr>
                <td><strong>Tenant</strong></td>
                <td><?php echo $request['first_name'] ? htmlspecialchars($request['first_name'] . ' ' . $request['last_name']) : '-'; ?></td>
            </tr>
            <tr>
                <td><strong>Priority</strong></td>
                <td>
                    <span class="badge badge-<?php 
                        echo $request['priority'] == 'Emergency' ? 'danger' : 
                            ($request['priority'] == 'High' ? 'warning' : 'info'); 
                    ?>">
                        <?php echo htmlspecialchars($request['priority']); ?>
                    </span>
                </td>
            </tr>
            <tr>
                <td><strong>Status</strong></td>
                <td>
                    <span class="badge badge-<?php 
                        echo $request['status'] == 'Completed' ? 'success' : 
                            ($request['status'] == 'In Progress' ? 'warning' : 'info'); 
                    ?>">
                        <?php echo htmlspecialchars($request['status']); ?>
                    </span>
                </td>
            </tr>
            <tr>
                <td><strong>Cost</strong></td>
                <td><?php echo $request['cost'] ? formatCurrency($request['cost']) : '-'; ?></td>
            </tr>
            <tr>
                <td><strong>Created</strong></td>
                <td><?php echo formatDate($request['created_at']); ?></td>
            </tr>
            <?php if ($request['completed_date']): ?>
            <tr>
                <td><strong>Completed Date</strong></td>
                <td><?php echo formatDate($request['completed_date']); ?></td>
            </tr>
            <?php endif; ?>
            <tr>
                <td><strong>Description</strong></td>
                <td><?php echo nl2br(htmlspecialchars($request['description'])); ?></td>
            </tr>
        </table>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
