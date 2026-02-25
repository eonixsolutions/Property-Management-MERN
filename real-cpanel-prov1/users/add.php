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

$error = '';

// Check if role column exists
$check_role = $conn->query("SHOW COLUMNS FROM users LIKE 'role'");
$has_role_field = $check_role->num_rows > 0;

if (!$has_role_field) {
    closeDBConnection($conn);
    die('<div class="alert alert-error">User management migration has not been run. Please <a href="../database/migrate_user_management.php">run the migration</a> first.</div>');
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $first_name = sanitizeInput($_POST['first_name']);
    $last_name = sanitizeInput($_POST['last_name']);
    $email = sanitizeInput($_POST['email']);
    $phone = sanitizeInput($_POST['phone']);
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    $role = $_POST['role'];
    $status = $_POST['status'];
    
    if (empty($first_name) || empty($last_name) || empty($email) || empty($password) || empty($confirm_password)) {
        $error = 'Please fill in all required fields';
    } elseif ($password != $confirm_password) {
        $error = 'Passwords do not match';
    } elseif (strlen($password) < 6) {
        $error = 'Password must be at least 6 characters long';
    } else {
        // Check if email already exists
        $check_email = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $check_email->bind_param("s", $email);
        $check_email->execute();
        $result = $check_email->get_result();
        
        if ($result->num_rows > 0) {
            $error = 'Email already exists';
        } else {
            // Hash password
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            
            $stmt = $conn->prepare("INSERT INTO users (email, password, first_name, last_name, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssss", $email, $hashed_password, $first_name, $last_name, $phone, $role, $status);
            
            if ($stmt->execute()) {
                $stmt->close();
                closeDBConnection($conn);
                header('Location: index.php?added=1');
                exit();
            } else {
                $error = 'Error adding user. Please try again.';
            }
        }
        
        $check_email->close();
    }
}

closeDBConnection($conn);

$page_title = 'Add User';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Add New User</h1>
    <a href="index.php" class="btn-link">← Back to Users</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-row">
                <div class="form-group">
                    <label for="first_name">First Name *</label>
                    <input type="text" id="first_name" name="first_name" required>
                </div>
                <div class="form-group">
                    <label for="last_name">Last Name *</label>
                    <input type="text" id="last_name" name="last_name" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="email">Email *</label>
                <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
                <label for="phone">Phone</label>
                <input type="text" id="phone" name="phone">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="password">Password *</label>
                    <input type="password" id="password" name="password" required minlength="6">
                    <small class="text-muted">Minimum 6 characters</small>
                </div>
                <div class="form-group">
                    <label for="confirm_password">Confirm Password *</label>
                    <input type="password" id="confirm_password" name="confirm_password" required minlength="6">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="role">Role *</label>
                    <select id="role" name="role" required>
                        <?php if ($current_user['role'] == 'Super Admin'): ?>
                            <option value="Super Admin">Super Admin</option>
                            <option value="Admin">Admin</option>
                        <?php endif; ?>
                        <option value="Manager">Manager</option>
                        <option value="User" selected>User</option>
                        <option value="Viewer">Viewer</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="status">Status *</label>
                    <select id="status" name="status" required>
                        <option value="Active" selected>Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Add User</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<div class="content-card" style="margin-top: 24px;">
    <div class="card-header">
        <h2>Role Permissions</h2>
    </div>
    <div class="card-body">
        <ul style="margin-left: 20px; line-height: 1.8;">
            <li><strong>Super Admin:</strong> Full access to everything</li>
            <li><strong>Admin:</strong> Can manage users, properties, tenants, all data</li>
            <li><strong>Manager:</strong> Can view users list, manage properties, tenants, and financial data</li>
            <li><strong>User:</strong> Standard access - manage own properties, tenants, transactions</li>
            <li><strong>Viewer:</strong> Read-only access to all data</li>
        </ul>
    </div>
</div>

<?php include '../includes/footer.php'; ?>

