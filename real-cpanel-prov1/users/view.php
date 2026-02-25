<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if user has admin or manager privileges
$current_user = $conn->query("SELECT role FROM users WHERE id = $user_id")->fetch_assoc();
$is_admin = in_array($current_user['role'] ?? 'User', ['Super Admin', 'Admin', 'Manager']);

if (!$is_admin) {
    closeDBConnection($conn);
    header('Location: ../index.php?error=access_denied');
    exit();
}

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    closeDBConnection($conn);
    header('Location: index.php');
    exit();
}

$view_user_id = intval($_GET['id']);

// Get user details
$user = $conn->query("SELECT * FROM users WHERE id = $view_user_id")->fetch_assoc();

if (!$user) {
    closeDBConnection($conn);
    header('Location: index.php');
    exit();
}

// Get user's statistics
$properties_count = $conn->query("SELECT COUNT(*) as total FROM properties WHERE user_id = $view_user_id")->fetch_assoc()['total'];
$tenants_count = $conn->query("SELECT COUNT(*) as total FROM tenants t INNER JOIN properties p ON t.property_id = p.id WHERE p.user_id = $view_user_id")->fetch_assoc()['total'];
$transactions_count = $conn->query("SELECT COUNT(*) as total FROM transactions WHERE user_id = $view_user_id")->fetch_assoc()['total'];

// Get financial statistics
$income_total = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $view_user_id AND type = 'Income'")->fetch_assoc()['total'];
$expense_total = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $view_user_id AND type = 'Expense'")->fetch_assoc()['total'];

// Get recent activity
$recent_properties = $conn->query("SELECT * FROM properties WHERE user_id = $view_user_id ORDER BY created_at DESC LIMIT 5");
$recent_transactions = $conn->query("SELECT * FROM transactions WHERE user_id = $view_user_id ORDER BY transaction_date DESC LIMIT 10");

closeDBConnection($conn);

$page_title = 'View User';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1><?php echo htmlspecialchars($user['first_name'] . ' ' . $user['last_name']); ?></h1>
    <div>
        <?php if ($view_user_id != $user_id && ($current_user['role'] == 'Super Admin' || $current_user['role'] == 'Admin')): ?>
            <a href="edit.php?id=<?php echo $user['id']; ?>" class="btn btn-primary">Edit User</a>
        <?php endif; ?>
        <a href="index.php" class="btn-link">← Back to Users</a>
    </div>
</div>

<div class="dashboard-grid">
    <!-- User Information -->
    <div class="content-card">
        <div class="card-header">
            <h2>User Information</h2>
        </div>
        <div class="card-body">
            <table class="data-table">
                <tr>
                    <td><strong>Name</strong></td>
                    <td><?php echo htmlspecialchars($user['first_name'] . ' ' . $user['last_name']); ?></td>
                </tr>
                <tr>
                    <td><strong>Email</strong></td>
                    <td><?php echo htmlspecialchars($user['email']); ?></td>
                </tr>
                <tr>
                    <td><strong>Phone</strong></td>
                    <td><?php echo htmlspecialchars($user['phone'] ?? '-'); ?></td>
                </tr>
                <tr>
                    <td><strong>Role</strong></td>
                    <td>
                        <span class="badge badge-<?php 
                            echo $user['role'] == 'Super Admin' ? 'danger' :
                                ($user['role'] == 'Admin' ? 'warning' :
                                ($user['role'] == 'Manager' ? 'info' :
                                ($user['role'] == 'User' ? 'success' : 'secondary')));
                        ?>">
                            <?php echo htmlspecialchars($user['role']); ?>
                        </span>
                    </td>
                </tr>
                <tr>
                    <td><strong>Status</strong></td>
                    <td>
                        <span class="badge badge-<?php 
                            echo $user['status'] == 'Active' ? 'success' : 
                                ($user['status'] == 'Suspended' ? 'danger' : 'secondary'); 
                        ?>">
                            <?php echo htmlspecialchars($user['status']); ?>
                        </span>
                    </td>
                </tr>
                <tr>
                    <td><strong>Last Login</strong></td>
                    <td><?php echo $user['last_login'] ? date('Y-m-d H:i', strtotime($user['last_login'])) : 'Never'; ?></td>
                </tr>
                <tr>
                    <td><strong>Email Verified</strong></td>
                    <td><?php echo $user['email_verified'] ? '✅ Yes' : '❌ No'; ?></td>
                </tr>
                <tr>
                    <td><strong>Account Created</strong></td>
                    <td><?php echo date('Y-m-d H:i', strtotime($user['created_at'])); ?></td>
                </tr>
                <tr>
                    <td><strong>Last Updated</strong></td>
                    <td><?php echo date('Y-m-d H:i', strtotime($user['updated_at'])); ?></td>
                </tr>
            </table>
        </div>
    </div>

    <!-- User Statistics -->
    <div class="content-card">
        <div class="card-header">
            <h2>User Statistics</h2>
        </div>
        <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px;">
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #4f46e5;">
                        <?php echo $properties_count; ?>
                    </div>
                    <div style="color: #64748b; margin-top: 8px;">Properties</div>
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

<!-- Recent Activity -->
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
                        <th>Created</th>
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
                            <td><?php echo date('Y-m-d', strtotime($property['created_at'])); ?></td>
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

<?php if ($recent_transactions && $recent_transactions->num_rows > 0): ?>
<div class="content-card" style="margin-top: 24px;">
    <div class="card-header">
        <h2>Recent Transactions</h2>
        <a href="../transactions/index.php" class="btn-link">View All</a>
    </div>
    <div class="card-body">
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
                    <?php while ($transaction = $recent_transactions->fetch_assoc()): ?>
                        <tr>
                            <td><?php echo formatDate($transaction['transaction_date']); ?></td>
                            <td>
                                <span class="badge badge-<?php echo $transaction['type'] == 'Income' ? 'success' : 'danger'; ?>">
                                    <?php echo htmlspecialchars($transaction['type']); ?>
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
    </div>
</div>
<?php endif; ?>

<!-- Role Permissions Reference -->
<div class="content-card" style="margin-top: 24px;">
    <div class="card-header">
        <h2>Role Permissions</h2>
    </div>
    <div class="card-body">
        <?php 
        $role_permissions = [
            'Super Admin' => 'Full system access including user management, all CRUD operations, and system settings.',
            'Admin' => 'Can manage users (except Super Admins), properties, tenants, and all financial data.',
            'Manager' => 'Can view user list, manage properties, tenants, transactions, and reports.',
            'User' => 'Standard access to manage own properties, tenants, and transactions. Cannot access user management.',
            'Viewer' => 'Read-only access to all data. Cannot make any changes to the system.'
        ];
        ?>
        <table class="data-table">
            <?php foreach ($role_permissions as $role => $permission): ?>
            <tr>
                <td style="width: 150px;"><strong><?php echo $role; ?></strong></td>
                <td><?php echo $permission; ?></td>
            </tr>
            <?php endforeach; ?>
        </table>
    </div>
</div>

<?php include '../includes/footer.php'; ?>

