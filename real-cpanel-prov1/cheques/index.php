<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if cheque tables exist
$check_tenant_cheques = $conn->query("SHOW TABLES LIKE 'tenant_cheques'");
$check_owner_cheques = $conn->query("SHOW TABLES LIKE 'owner_cheques'");
$has_tenant_cheques = $check_tenant_cheques->num_rows > 0;
$has_owner_cheques = $check_owner_cheques->num_rows > 0;

if (!$has_tenant_cheques || !$has_owner_cheques) {
    closeDBConnection($conn);
    die('Cheque register tables not found. Please run the migration: <a href="../database/migrate_cheque_register.php">Run Migration</a>');
}

$today = date('Y-m-d');
$seven_days = date('Y-m-d', strtotime('+7 days'));

// Get statistics
$tenant_stats = [
    'total' => $conn->query("SELECT COUNT(*) as count FROM tenant_cheques tc
        INNER JOIN properties p ON tc.property_id = p.id
        WHERE p.user_id = $user_id")->fetch_assoc()['count'],
    'pending' => $conn->query("SELECT COUNT(*) as count FROM tenant_cheques tc
        INNER JOIN properties p ON tc.property_id = p.id
        WHERE p.user_id = $user_id AND tc.status = 'Pending'")->fetch_assoc()['count'],
    'upcoming' => $conn->query("SELECT COUNT(*) as count FROM tenant_cheques tc
        INNER JOIN properties p ON tc.property_id = p.id
        WHERE p.user_id = $user_id AND tc.status IN ('Pending', 'Deposited') 
        AND tc.deposit_date IS NOT NULL AND tc.deposit_date >= '$today' AND tc.deposit_date <= '$seven_days'")->fetch_assoc()['count'],
    'cleared' => $conn->query("SELECT COUNT(*) as count FROM tenant_cheques tc
        INNER JOIN properties p ON tc.property_id = p.id
        WHERE p.user_id = $user_id AND tc.status = 'Cleared'")->fetch_assoc()['count']
];

$owner_stats = [
    'total' => $conn->query("SELECT COUNT(*) as count FROM owner_cheques oc
        INNER JOIN properties p ON oc.property_id = p.id
        WHERE p.user_id = $user_id")->fetch_assoc()['count'],
    'issued' => $conn->query("SELECT COUNT(*) as count FROM owner_cheques oc
        INNER JOIN properties p ON oc.property_id = p.id
        WHERE p.user_id = $user_id AND oc.status = 'Issued'")->fetch_assoc()['count'],
    'upcoming' => $conn->query("SELECT COUNT(*) as count FROM owner_cheques oc
        INNER JOIN properties p ON oc.property_id = p.id
        WHERE p.user_id = $user_id AND oc.status = 'Issued' 
        AND oc.cheque_date >= '$today' AND oc.cheque_date <= '$seven_days'")->fetch_assoc()['count'],
    'cleared' => $conn->query("SELECT COUNT(*) as count FROM owner_cheques oc
        INNER JOIN properties p ON oc.property_id = p.id
        WHERE p.user_id = $user_id AND oc.status = 'Cleared'")->fetch_assoc()['count']
];

closeDBConnection($conn);

$page_title = 'Cheque Register';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Cheque Register</h1>
</div>

<div class="dashboard-grid">
    <!-- Tenant Cheques -->
    <div class="content-card">
        <div class="card-header">
            <h2>💳 Tenant Cheques</h2>
            <a href="tenants.php" class="btn-link">View All</a>
        </div>
        <div class="card-body">
            <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 20px;">
                <div class="stat-card stat-income" style="padding: 15px;">
                    <div class="stat-icon">📝</div>
                    <div class="stat-content">
                        <h3><?php echo $tenant_stats['total']; ?></h3>
                        <p>Total Cheques</p>
                    </div>
                </div>
                <div class="stat-card stat-warning" style="padding: 15px;">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <h3><?php echo $tenant_stats['pending']; ?></h3>
                        <p>Pending</p>
                    </div>
                </div>
                <div class="stat-card stat-info" style="padding: 15px;">
                    <div class="stat-icon">📅</div>
                    <div class="stat-content">
                        <h3><?php echo $tenant_stats['upcoming']; ?></h3>
                        <p>Upcoming (7 days)</p>
                    </div>
                </div>
                <div class="stat-card stat-success" style="padding: 15px;">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <h3><?php echo $tenant_stats['cleared']; ?></h3>
                        <p>Cleared</p>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <a href="tenants.php" class="btn btn-primary">View All Tenant Cheques</a>
                <a href="add_tenant_cheque.php" class="btn">+ Add Single</a>
                <a href="add_multiple_tenant_cheques.php" class="btn btn-primary">+ Add Multiple</a>
            </div>
        </div>
    </div>

    <!-- Owner Cheques -->
    <div class="content-card">
        <div class="card-header">
            <h2>🏦 Owner Cheques</h2>
            <a href="owners.php" class="btn-link">View All</a>
        </div>
        <div class="card-body">
            <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 20px;">
                <div class="stat-card stat-expense" style="padding: 15px;">
                    <div class="stat-icon">💳</div>
                    <div class="stat-content">
                        <h3><?php echo $owner_stats['total']; ?></h3>
                        <p>Total Cheques</p>
                    </div>
                </div>
                <div class="stat-card stat-warning" style="padding: 15px;">
                    <div class="stat-icon">📤</div>
                    <div class="stat-content">
                        <h3><?php echo $owner_stats['issued']; ?></h3>
                        <p>Issued</p>
                    </div>
                </div>
                <div class="stat-card stat-info" style="padding: 15px;">
                    <div class="stat-icon">📅</div>
                    <div class="stat-content">
                        <h3><?php echo $owner_stats['upcoming']; ?></h3>
                        <p>Upcoming (7 days)</p>
                    </div>
                </div>
                <div class="stat-card stat-success" style="padding: 15px;">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <h3><?php echo $owner_stats['cleared']; ?></h3>
                        <p>Cleared</p>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <a href="owners.php" class="btn btn-primary">View All Owner Cheques</a>
                <a href="add_owner_cheque.php" class="btn">+ Issue Single</a>
                <a href="add_multiple_owner_cheques.php" class="btn btn-primary">+ Issue Multiple</a>
            </div>
        </div>
    </div>
</div>

<div class="content-card mt-20">
    <div class="card-header">
        <h2>📋 Quick Actions</h2>
    </div>
    <div class="card-body">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            <a href="tenants.php?filter=pending" class="btn" style="text-align: left; padding: 15px;">
                <strong>Pending Tenant Cheques</strong><br>
                <small>View cheques waiting to be deposited</small>
            </a>
            <a href="tenants.php?filter=upcoming" class="btn" style="text-align: left; padding: 15px;">
                <strong>Upcoming Deposits</strong><br>
                <small>Cheques due in next 7 days</small>
            </a>
            <a href="owners.php?filter=issued" class="btn" style="text-align: left; padding: 15px;">
                <strong>Issued Owner Cheques</strong><br>
                <small>Cheques issued but not cleared</small>
            </a>
            <a href="owners.php?filter=upcoming" class="btn" style="text-align: left; padding: 15px;">
                <strong>Upcoming Owner Cheques</strong><br>
                <small>Cheques due in next 7 days</small>
            </a>
        </div>
    </div>
</div>

<?php include '../includes/footer.php'; ?>

