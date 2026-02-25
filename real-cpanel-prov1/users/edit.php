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

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    closeDBConnection($conn);
    header('Location: index.php');
    exit();
}

$edit_user_id = intval($_GET['id']);

// Get user details
$user = $conn->query("SELECT * FROM users WHERE id = $edit_user_id")->fetch_assoc();

if (!$user) {
    closeDBConnection($conn);
    header('Location: index.php');
    exit();
}

// Prevent users from editing themselves through this page (they should use profile)
if ($edit_user_id == $user_id) {
    closeDBConnection($conn);
    header('Location: index.php?error=cannot_edit_self');
    exit();
}

// Check if role column exists
$check_role = $conn->query("SHOW COLUMNS FROM users LIKE 'role'");
$has_role_field = $check_role->num_rows > 0;

if (!$has_role_field) {
    closeDBConnection($conn);
    die('<div class="alert alert-error">User management migration has not been run. Please <a href="../database/migrate_user_management.php">run the migration</a> first.</div>');
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $first_name = sanitizeInput($_POST['first_name']);
    $last_name = sanitizeInput($_POST['last_name']);
    $email = sanitizeInput($_POST['email']);
    $phone = sanitizeInput($_POST['phone']);
    $role = $_POST['role'];
    $status = $_POST['status'];
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    
    if (empty($first_name) || empty($last_name) || empty($email)) {
        $error = 'Please fill in all required fields';
    } else {
        // Check if email already exists (for another user)
        $check_email = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $check_email->bind_param("si", $email, $edit_user_id);
        $check_email->execute();
        $result = $check_email->get_result();
        
        if ($result->num_rows > 0) {
            $error = 'Email already exists';
        } else {
            // If password is provided, validate and update it
            $update_password = !empty($password);
            if ($update_password) {
                if ($password != $confirm_password) {
                    $error = 'Passwords do not match';
                } elseif (strlen($password) < 6) {
                    $error = 'Password must be at least 6 characters long';
                } else {
                    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $conn->prepare("UPDATE users SET email = ?, password = ?, first_name = ?, last_name = ?, phone = ?, role = ?, status = ? WHERE id = ?");
                    $stmt->bind_param("sssssssi", $email, $hashed_password, $first_name, $last_name, $phone, $role, $status, $edit_user_id);
                }
            } else {
                $stmt = $conn->prepare("UPDATE users SET email = ?, first_name = ?, last_name = ?, phone = ?, role = ?, status = ? WHERE id = ?");
                $stmt->bind_param("ssssssi", $email, $first_name, $last_name, $phone, $role, $status, $edit_user_id);
            }
            
            if (empty($error)) {
                if ($stmt->execute()) {
                    $stmt->close();
                    closeDBConnection($conn);
                    header('Location: index.php?updated=1');
                    exit();
                } else {
                    $error = 'Error updating user. Please try again.';
                }
            }
        }
        
        $check_email->close();
    }
}

closeDBConnection($conn);

$page_title = 'Edit User';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Edit User</h1>
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
                    <input type="text" id="first_name" name="first_name" value="<?php echo htmlspecialchars($user['first_name']); ?>" required>
                </div>
                <div class="form-group">
                    <label for="last_name">Last Name *</label>
                    <input type="text" id="last_name" name="last_name" value="<?php echo htmlspecialchars($user['last_name']); ?>" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="email">Email *</label>
                <input type="email" id="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" required>
            </div>
            
            <div class="form-group">
                <label for="phone">Phone</label>
                <input type="text" id="phone" name="phone" value="<?php echo htmlspecialchars($user['phone'] ?? ''); ?>">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" minlength="6">
                    <small class="text-muted">Leave blank to keep existing password</small>
                </div>
                <div class="form-group">
                    <label for="confirm_password">Confirm Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" minlength="6">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="role">Role *</label>
                    <select id="role" name="role" required>
                        <?php if ($current_user['role'] == 'Super Admin'): ?>
                            <option value="Super Admin" <?php echo $user['role'] == 'Super Admin' ? 'selected' : ''; ?>>Super Admin</option>
                            <option value="Admin" <?php echo $user['role'] == 'Admin' ? 'selected' : ''; ?>>Admin</option>
                        <?php endif; ?>
                        <option value="Manager" <?php echo $user['role'] == 'Manager' ? 'selected' : ''; ?>>Manager</option>
                        <option value="User" <?php echo $user['role'] == 'User' ? 'selected' : ''; ?>>User</option>
                        <option value="Viewer" <?php echo $user['role'] == 'Viewer' ? 'selected' : ''; ?>>Viewer</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="status">Status *</label>
                    <select id="status" name="status" required>
                        <option value="Active" <?php echo $user['status'] == 'Active' ? 'selected' : ''; ?>>Active</option>
                        <option value="Inactive" <?php echo $user['status'] == 'Inactive' ? 'selected' : ''; ?>>Inactive</option>
                        <?php if ($current_user['role'] == 'Super Admin'): ?>
                        <option value="Suspended" <?php echo $user['status'] == 'Suspended' ? 'selected' : ''; ?>>Suspended</option>
                        <?php endif; ?>
                    </select>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update User</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<?php include '../includes/footer.php'; ?>

