<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if user has admin privileges
$current_user = $conn->query("SELECT role FROM users WHERE id = $user_id")->fetch_assoc();
$is_admin = in_array($current_user['role'] ?? 'User', ['Super Admin', 'Admin', 'Manager']);

if (!$is_admin) {
    closeDBConnection($conn);
    header('Location: ../index.php?error=access_denied');
    exit();
}

// Handle delete
if (isset($_GET['delete']) && is_numeric($_GET['delete'])) {
    $delete_id = intval($_GET['delete']);
    
    // Prevent deleting yourself
    if ($delete_id == $user_id) {
        closeDBConnection($conn);
        header('Location: index.php?error=cannot_delete_self');
        exit();
    }
    
    // Check if deleting user is Super Admin or Admin
    if ($current_user['role'] == 'Super Admin' || $current_user['role'] == 'Admin') {
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param("i", $delete_id);
        $stmt->execute();
        $stmt->close();
        header('Location: index.php?deleted=1');
        exit();
    }
}

// Handle status toggle
if (isset($_GET['toggle_status']) && is_numeric($_GET['toggle_status'])) {
    $toggle_id = intval($_GET['toggle_status']);
    
    // Prevent toggling yourself
    if ($toggle_id == $user_id) {
        closeDBConnection($conn);
        header('Location: index.php?error=cannot_toggle_self');
        exit();
    }
    
    // Get current status
    $user_status = $conn->query("SELECT status FROM users WHERE id = $toggle_id")->fetch_assoc();
    $new_status = ($user_status['status'] == 'Active') ? 'Inactive' : 'Active';
    
    $stmt = $conn->prepare("UPDATE users SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $new_status, $toggle_id);
    $stmt->execute();
    $stmt->close();
    
    header('Location: index.php?updated=1');
    exit();
}

// Get search and filter parameters
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$role_filter = isset($_GET['role']) ? $conn->real_escape_string($_GET['role']) : '';
$status_filter = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : '';

// Build query
$where_clause = "1=1";

if (!empty($search)) {
    $where_clause .= " AND (first_name LIKE '%$search%' OR last_name LIKE '%$search%' OR email LIKE '%$search%')";
}

if (!empty($role_filter)) {
    $where_clause .= " AND role = '$role_filter'";
}

if (!empty($status_filter)) {
    $where_clause .= " AND status = '$status_filter'";
}

// Get all users
$users = $conn->query("SELECT * FROM users WHERE $where_clause ORDER BY created_at DESC");

// Get statistics
$total_users = $conn->query("SELECT COUNT(*) as total FROM users")->fetch_assoc()['total'];
$active_users = $conn->query("SELECT COUNT(*) as total FROM users WHERE status = 'Active'")->fetch_assoc()['total'];
$inactive_users = $conn->query("SELECT COUNT(*) as total FROM users WHERE status != 'Active'")->fetch_assoc()['total'];

closeDBConnection($conn);

$page_title = 'User Management';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>User Management</h1>
    <?php if ($current_user['role'] == 'Super Admin' || $current_user['role'] == 'Admin'): ?>
    <a href="add.php" class="btn btn-primary">+ Add User</a>
    <?php endif; ?>
</div>

<?php if (isset($_GET['deleted'])): ?>
    <div class="alert alert-success">User deleted successfully!</div>
<?php endif; ?>

<?php if (isset($_GET['added'])): ?>
    <div class="alert alert-success">User added successfully!</div>
<?php endif; ?>

<?php if (isset($_GET['updated'])): ?>
    <div class="alert alert-success">User updated successfully!</div>
<?php endif; ?>

<?php if (isset($_GET['error'])): ?>
    <div class="alert alert-error">
        <?php 
        $error = $_GET['error'];
        if ($error == 'access_denied'): 
            echo 'You do not have permission to access this page.';
        elseif ($error == 'cannot_delete_self'): 
            echo 'You cannot delete your own account.';
        elseif ($error == 'cannot_toggle_self'): 
            echo 'You cannot change your own status.';
        else:
            echo 'An error occurred.';
        endif;
        ?>
    </div>
<?php endif; ?>

<!-- Statistics -->
<div class="stats-grid" style="margin-bottom: 30px;">
    <div class="stat-card stat-income">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
            <h3><?php echo $total_users; ?></h3>
            <p>Total Users</p>
        </div>
    </div>
    <div class="stat-card stat-income">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
            <h3><?php echo $active_users; ?></h3>
            <p>Active Users</p>
        </div>
    </div>
    <div class="stat-card stat-expense">
        <div class="stat-icon">⏸️</div>
        <div class="stat-content">
            <h3><?php echo $inactive_users; ?></h3>
            <p>Inactive Users</p>
        </div>
    </div>
</div>

<div class="content-card">
    <div class="card-body">
        <!-- Search and Filter -->
        <form method="GET" action="" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="search" style="font-size: 12px; margin-bottom: 4px;">Search</label>
                    <input type="text" id="search" name="search" placeholder="Search by name or email..." value="<?php echo htmlspecialchars($search); ?>" style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="role_filter" style="font-size: 12px; margin-bottom: 4px;">Filter by Role</label>
                    <select id="role_filter" name="role" style="width: 100%;">
                        <option value="">All Roles</option>
                        <option value="Super Admin" <?php echo $role_filter == 'Super Admin' ? 'selected' : ''; ?>>Super Admin</option>
                        <option value="Admin" <?php echo $role_filter == 'Admin' ? 'selected' : ''; ?>>Admin</option>
                        <option value="Manager" <?php echo $role_filter == 'Manager' ? 'selected' : ''; ?>>Manager</option>
                        <option value="User" <?php echo $role_filter == 'User' ? 'selected' : ''; ?>>User</option>
                        <option value="Viewer" <?php echo $role_filter == 'Viewer' ? 'selected' : ''; ?>>Viewer</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="status_filter" style="font-size: 12px; margin-bottom: 4px;">Filter by Status</label>
                    <select id="status_filter" name="status" style="width: 100%;">
                        <option value="">All Status</option>
                        <option value="Active" <?php echo $status_filter == 'Active' ? 'selected' : ''; ?>>Active</option>
                        <option value="Inactive" <?php echo $status_filter == 'Inactive' ? 'selected' : ''; ?>>Inactive</option>
                        <option value="Suspended" <?php echo $status_filter == 'Suspended' ? 'selected' : ''; ?>>Suspended</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="btn btn-primary">🔍 Search</button>
                    <a href="index.php" class="btn">Clear</a>
                </div>
            </div>
        </form>

        <?php if ($users->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($user = $users->fetch_assoc()): ?>
                            <tr>
                                <td>
                                    <strong>
                                        <a href="view.php?id=<?php echo $user['id']; ?>" class="btn-link" style="font-weight: 600;">
                                            <?php echo htmlspecialchars($user['first_name'] . ' ' . $user['last_name']); ?>
                                        </a>
                                    </strong>
                                </td>
                                <td><?php echo htmlspecialchars($user['email']); ?></td>
                                <td><?php echo htmlspecialchars($user['phone'] ?? '-'); ?></td>
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
                                <td>
                                    <span class="badge badge-<?php 
                                        echo $user['status'] == 'Active' ? 'success' : 
                                            ($user['status'] == 'Suspended' ? 'danger' : 'secondary'); 
                                    ?>">
                                        <?php echo htmlspecialchars($user['status']); ?>
                                    </span>
                                </td>
                                <td><?php echo $user['last_login'] ? date('Y-m-d H:i', strtotime($user['last_login'])) : 'Never'; ?></td>
                                <td><?php echo formatDate($user['created_at']); ?></td>
                                <td>
                                    <a href="view.php?id=<?php echo $user['id']; ?>" class="btn-link">Profile</a>
                                    <?php if (in_array($user['role'], ['Manager', 'User'])): ?>
                                        <a href="../agents/profile.php?id=<?php echo $user['id']; ?>" class="btn-link" title="Agent Profile">Agent</a>
                                    <?php endif; ?>
                                    <?php if ($user['id'] != $user_id): ?>
                                        <?php if ($current_user['role'] == 'Super Admin' || $current_user['role'] == 'Admin'): ?>
                                            <?php if ($user['role'] != 'Super Admin' || $current_user['role'] == 'Super Admin'): ?>
                                                <a href="edit.php?id=<?php echo $user['id']; ?>" class="btn-link">Edit</a>
                                                <a href="?toggle_status=<?php echo $user['id']; ?>" class="btn-link" 
                                                   onclick="return confirm('Are you sure you want to toggle status for this user?')">
                                                    <?php echo $user['status'] == 'Active' ? 'Deactivate' : 'Activate'; ?>
                                                </a>
                                                <?php if ($current_user['role'] == 'Super Admin'): ?>
                                                    <a href="?delete=<?php echo $user['id']; ?>" class="btn-link text-danger" 
                                                       onclick="return confirm('Are you sure you want to delete this user? This action cannot be undone!')">
                                                        Delete
                                                    </a>
                                                <?php endif; ?>
                                            <?php endif; ?>
                                        <?php endif; ?>
                                    <?php else: ?>
                                        <span class="text-muted">You</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <div class="text-center" style="padding: 60px 20px;">
                <p class="text-muted" style="font-size: 18px; margin-bottom: 20px;">No users found</p>
                <?php if ($current_user['role'] == 'Super Admin' || $current_user['role'] == 'Admin'): ?>
                    <a href="add.php" class="btn btn-primary">Add First User</a>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php include '../includes/footer.php'; ?>

