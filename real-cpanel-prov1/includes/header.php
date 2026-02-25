<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($page_title) ? $page_title . ' - ' : ''; ?>Real Estate Management</title>
    <link rel="stylesheet" href="<?php echo BASE_URL; ?>/assets/css/style.css">
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <h1>🏠 Real Estate</h1>
            </div>
            
            <nav class="sidebar-nav">
                <a href="<?php echo BASE_URL; ?>/index.php" class="nav-item <?php echo basename($_SERVER['PHP_SELF']) == 'index.php' ? 'active' : ''; ?>">
                    <span class="nav-icon">📊</span>
                    <span>Dashboard</span>
                </a>
                
                <a href="<?php echo BASE_URL; ?>/properties/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'properties') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">🏘️</span>
                    <span>Properties</span>
                </a>
                
                <a href="<?php echo BASE_URL; ?>/tenants/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'tenants') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">👥</span>
                    <span>Tenants</span>
                </a>
                
                <a href="<?php echo BASE_URL; ?>/contracts/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'contracts') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">📄</span>
                    <span>Lease Contracts</span>
                </a>
                
                <a href="<?php echo BASE_URL; ?>/rent/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'rent') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">💵</span>
                    <span>Rent Collection</span>
                </a>
                
                <a href="<?php echo BASE_URL; ?>/transactions/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'transactions') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">💳</span>
                    <span>Income & Expenses</span>
                </a>
                
                <a href="<?php echo BASE_URL; ?>/maintenance/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'maintenance') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">🔧</span>
                    <span>Maintenance</span>
                </a>
                
                <?php 
                // Check if owner_payments table exists (only if user is logged in)
                if (function_exists('getDBConnection') && function_exists('isLoggedIn') && isLoggedIn()) {
                    try {
                        $header_conn = getDBConnection();
                        $check_owner_table = $header_conn->query("SHOW TABLES LIKE 'owner_payments'");
                        $has_owner_table = $check_owner_table->num_rows > 0;
                        closeDBConnection($header_conn);
                        if ($has_owner_table):
                        ?>
                        <a href="<?php echo BASE_URL; ?>/owners/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'owners') !== false ? 'active' : ''; ?>">
                            <span class="nav-icon">🏢</span>
                            <span>Owner Payments</span>
                        </a>
                        <?php 
                        endif;
                    } catch (Exception $e) {
                        // Silently fail if table doesn't exist
                    }
                }
                ?>
                
                <a href="<?php echo BASE_URL; ?>/reports/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'reports') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">📈</span>
                    <span>Reports</span>
                </a>
                
                <a href="<?php echo BASE_URL; ?>/accounting/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'accounting') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">📋</span>
                    <span>Accounting</span>
                </a>
                
                <?php 
                // Check if cheque tables exist
                if (function_exists('getDBConnection') && function_exists('isLoggedIn') && isLoggedIn()) {
                    try {
                        $header_conn = getDBConnection();
                        $check_tenant_cheques = $header_conn->query("SHOW TABLES LIKE 'tenant_cheques'");
                        $check_owner_cheques = $header_conn->query("SHOW TABLES LIKE 'owner_cheques'");
                        $has_cheque_tables = $check_tenant_cheques->num_rows > 0 && $check_owner_cheques->num_rows > 0;
                        closeDBConnection($header_conn);
                        if ($has_cheque_tables):
                        ?>
                        <a href="<?php echo BASE_URL; ?>/cheques" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'cheques') !== false ? 'active' : ''; ?>">
                            <span class="nav-icon">💳</span>
                            <span>Cheque Register</span>
                        </a>
                        <?php 
                        endif;
                    } catch (Exception $e) {
                        // Silently fail if tables don't exist
                    }
                }
                ?>
                
                <a href="<?php echo BASE_URL; ?>/documents/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'documents') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">📄</span>
                    <span>Documents</span>
                </a>
                
                <a href="<?php echo BASE_URL; ?>/users/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], '/users') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">👤</span>
                    <span>Users</span>
                </a>
                
                <a href="<?php echo BASE_URL; ?>/settings/index.php" class="nav-item <?php echo strpos($_SERVER['REQUEST_URI'], 'settings') !== false ? 'active' : ''; ?>">
                    <span class="nav-icon">⚙️</span>
                    <span>Settings</span>
                </a>
            </nav>
            
            <div class="sidebar-footer">
                <div class="user-info">
                    <?php
                    // Ensure user_name and user_email are set in session
                    if (!isset($_SESSION['user_name']) || !isset($_SESSION['user_email'])) {
                        if (function_exists('getDBConnection') && function_exists('getCurrentUserId')) {
                            $conn = getDBConnection();
                            $user_id = getCurrentUserId();
                            if ($user_id) {
                                $user_result = $conn->query("SELECT first_name, last_name, email FROM users WHERE id = $user_id LIMIT 1");
                                if ($user_result && $user_result->num_rows > 0) {
                                    $user_data = $user_result->fetch_assoc();
                                    $_SESSION['user_name'] = trim($user_data['first_name'] . ' ' . $user_data['last_name']);
                                    $_SESSION['user_email'] = $user_data['email'];
                                }
                                closeDBConnection($conn);
                            }
                        }
                    }
                    $user_name = $_SESSION['user_name'] ?? 'User';
                    $user_email = $_SESSION['user_email'] ?? '';
                    $avatar_letter = !empty($user_name) ? strtoupper(substr($user_name, 0, 1)) : 'U';
                    ?>
                    <div class="user-avatar"><?php echo $avatar_letter; ?></div>
                    <div class="user-details">
                        <div class="user-name"><?php echo htmlspecialchars($user_name); ?></div>
                        <div class="user-email"><?php echo htmlspecialchars($user_email); ?></div>
                    </div>
                </div>
                <a href="<?php echo BASE_URL; ?>/auth/logout.php" class="nav-item">
                    <span class="nav-icon">🚪</span>
                    <span>Logout</span>
                </a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <?php 
            // Load notifications
            require_once __DIR__ . '/notifications.php';
            $notifications = getNotifications(getCurrentUserId());
            $notification_count = getNotificationCount(getCurrentUserId());
            ?>
            
            <!-- Notification Bell -->
            <?php if ($notification_count > 0): ?>
            <div class="notification-container">
                <button class="notification-bell" onclick="toggleNotifications()" id="notificationBtn">
                    <span class="bell-icon">🔔</span>
                    <span class="notification-badge"><?php echo $notification_count; ?></span>
                </button>
                
                <div class="notification-dropdown" id="notificationDropdown">
                    <div class="notification-header">
                        <h3>Notifications</h3>
                        <span class="notification-count-badge"><?php echo $notification_count; ?></span>
                    </div>
                    <div class="notification-list">
                        <?php foreach ($notifications as $notif): ?>
                        <a href="<?php echo $notif['link']; ?>" class="notification-item notification-<?php echo $notif['type']; ?>">
                            <div class="notification-icon"><?php echo $notif['icon']; ?></div>
                            <div class="notification-content">
                                <div class="notification-title"><?php echo htmlspecialchars($notif['title']); ?></div>
                                <div class="notification-message"><?php echo htmlspecialchars($notif['message']); ?></div>
                            </div>
                            <div class="notification-count"><?php echo $notif['count']; ?></div>
                        </a>
                        <?php endforeach; ?>
                    </div>
                    <div class="notification-footer">
                        <a href="<?php echo BASE_URL; ?>/notifications/index.php">View All Notifications</a>
                    </div>
                </div>
            </div>
            <?php endif; ?>
