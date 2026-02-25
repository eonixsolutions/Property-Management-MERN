<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if user has admin privileges
$current_user = $conn->query("SELECT role FROM users WHERE id = $user_id")->fetch_assoc();
$is_admin = in_array($current_user['role'] ?? 'User', ['Super Admin', 'Admin', 'Manager']);

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    closeDBConnection($conn);
    header('Location: ../users/index.php');
    exit();
}

$agent_id = intval($_GET['id']);

// Get agent/user details
$agent = $conn->query("SELECT * FROM users WHERE id = $agent_id")->fetch_assoc();

if (!$agent) {
    closeDBConnection($conn);
    header('Location: ../users/index.php?error=not_found');
    exit();
}

// Check if viewing own profile or has admin access
if ($agent_id != $user_id && !$is_admin) {
    closeDBConnection($conn);
    header('Location: ../index.php?error=access_denied');
    exit();
}

// Get agent's statistics
$properties_count = $conn->query("SELECT COUNT(*) as total FROM properties WHERE user_id = $agent_id")->fetch_assoc()['total'];
$tenants_count = $conn->query("SELECT COUNT(*) as total FROM tenants t INNER JOIN properties p ON t.property_id = p.id WHERE p.user_id = $agent_id")->fetch_assoc()['total'];
$transactions_count = $conn->query("SELECT COUNT(*) as total FROM transactions WHERE user_id = $agent_id")->fetch_assoc()['total'];

// Get financial statistics
$income_total = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $agent_id AND type = 'Income'")->fetch_assoc()['total'];
$expense_total = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $agent_id AND type = 'Expense'")->fetch_assoc()['total'];

// Get recent activity
$recent_properties = $conn->query("SELECT * FROM properties WHERE user_id = $agent_id ORDER BY created_at DESC LIMIT 5");
$recent_tenants = $conn->query("SELECT t.*, p.property_name FROM tenants t INNER JOIN properties p ON t.property_id = p.id WHERE p.user_id = $agent_id ORDER BY t.created_at DESC LIMIT 5");

closeDBConnection($conn);

$page_title = 'Agent Profile';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>
        <?php echo htmlspecialchars($agent['first_name'] . ' ' . $agent['last_name']); ?>
        <?php if (in_array($agent['role'], ['Manager', 'User'])): ?>
            <span class="badge badge-info">Agent</span>
        <?php endif; ?>
    </h1>
    <div>
        <?php if ($agent_id != $user_id && ($current_user['role'] == 'Super Admin' || $current_user['role'] == 'Admin')): ?>
            <a href="../users/edit.php?id=<?php echo $agent['id']; ?>" class="btn btn-primary">Edit User</a>
        <?php endif; ?>
        <a href="../users/index.php" class="btn-link">← Back to Users</a>
    </div>
</div>

<div class="dashboard-grid">
    <!-- Agent Information -->
    <div class="content-card">
        <div class="card-header">
            <h2>Agent Information</h2>
        </div>
        <div class="card-body">
            <table class="data-table">
                <tr>
                    <td><strong>Name</strong></td>
                    <td><?php echo htmlspecialchars($agent['first_name'] . ' ' . $agent['last_name']); ?></td>
                </tr>
                <tr>
                    <td><strong>Email</strong></td>
                    <td><a href="mailto:<?php echo htmlspecialchars($agent['email']); ?>"><?php echo htmlspecialchars($agent['email']); ?></a></td>
                </tr>
                <tr>
                    <td><strong>Phone</strong></td>
                    <td><?php echo !empty($agent['phone']) ? '<a href="tel:' . htmlspecialchars($agent['phone']) . '">' . htmlspecialchars($agent['phone']) . '</a>' : '-'; ?></td>
                </tr>
                <tr>
                    <td><strong>Role</strong></td>
                    <td>
                        <span class="badge badge-<?php 
                            echo $agent['role'] == 'Super Admin' ? 'danger' :
                                ($agent['role'] == 'Admin' ? 'warning' :
                                ($agent['role'] == 'Manager' ? 'info' :
                                ($agent['role'] == 'User' ? 'success' : 'secondary')));
                        ?>">
                            <?php echo htmlspecialchars($agent['role']); ?>
                        </span>
                    </td>
                </tr>
                <tr>
                    <td><strong>Status</strong></td>
                    <td>
                        <span class="badge badge-<?php 
                            echo $agent['status'] == 'Active' ? 'success' : 
                                ($agent['status'] == 'Suspended' ? 'danger' : 'secondary'); 
                        ?>">
                            <?php echo htmlspecialchars($agent['status']); ?>
                        </span>
                    </td>
                </tr>
                <tr>
                    <td><strong>Last Login</strong></td>
                    <td><?php echo $agent['last_login'] ? date('Y-m-d H:i', strtotime($agent['last_login'])) : 'Never'; ?></td>
                </tr>
                <tr>
                    <td><strong>Account Created</strong></td>
                    <td><?php echo date('Y-m-d H:i', strtotime($agent['created_at'])); ?></td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Agent Statistics -->
    <div class="content-card">
        <div class="card-header">
            <h2>Performance Statistics</h2>
        </div>
        <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #4f46e5;">
                        <?php echo $properties_count; ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Properties Managed</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #10b981;">
                        <?php echo $tenants_count; ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Tenants</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">
                        <?php echo $transactions_count; ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Transactions</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #10b981;">
                        <?php echo formatCurrency($income_total); ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Total Income</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #ef4444;">
                        <?php echo formatCurrency($expense_total); ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Total Expenses</div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Recent Properties -->
<?php if ($recent_properties && $recent_properties->num_rows > 0): ?>
<div class="content-card" style="margin-top: 24px;">
    <div class="card-header">
        <h2>Recent Properties</h2>
        <a href="../properties/index.php" class="btn-link">View All</a>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Property Name</th>
                        <th>Address</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php while ($property = $recent_properties->fetch_assoc()): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($property['property_name']); ?></strong></td>
                            <td><?php echo htmlspecialchars($property['address'] . ', ' . $property['city']); ?></td>
                            <td><?php echo htmlspecialchars($property['property_type']); ?></td>
                            <td>
                                <span class="badge badge-<?php 
                                    echo $property['status'] == 'Occupied' ? 'success' : 
                                        ($property['status'] == 'Under Maintenance' ? 'warning' : 'info'); 
                                ?>">
                                    <?php echo htmlspecialchars($property['status']); ?>
                                </span>
                            </td>
                            <td>
                                <a href="../properties/view.php?id=<?php echo $property['id']; ?>" class="btn-link">View</a>
                            </td>
                        </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php endif; ?>

<!-- Recent Tenants -->
<?php if ($recent_tenants && $recent_tenants->num_rows > 0): ?>
<div class="content-card" style="margin-top: 24px;">
    <div class="card-header">
        <h2>Recent Tenants</h2>
        <a href="../tenants/index.php" class="btn-link">View All</a>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Property</th>
                        <th>Monthly Rent</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php while ($tenant = $recent_tenants->fetch_assoc()): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']); ?></strong></td>
                            <td><?php echo htmlspecialchars($tenant['property_name']); ?></td>
                            <td><?php echo formatCurrency($tenant['monthly_rent']); ?></td>
                            <td>
                                <span class="badge badge-<?php echo $tenant['status'] == 'Active' ? 'success' : 'info'; ?>">
                                    <?php echo htmlspecialchars($tenant['status']); ?>
                                </span>
                            </td>
                            <td>
                                <a href="../tenants/view.php?id=<?php echo $tenant['id']; ?>" class="btn-link">View</a>
                            </td>
                        </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php endif; ?>

<?php include '../includes/footer.php'; ?>

