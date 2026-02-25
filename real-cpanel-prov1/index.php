<?php
require_once 'config/config.php';

// If user is not logged in, redirect to landing page
if (!isLoggedIn()) {
    header('Location: ' . BASE_URL . '/landing.php');
    exit();
}

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Handle generate rent payments for all tenants
if (isset($_GET['generate_all_rent']) && $_GET['generate_all_rent'] == '1') {
    require_once 'includes/recurring_invoices.php';
    
    // Get all active tenants with lease_start
    $tenants = $conn->query("SELECT t.id FROM tenants t
        INNER JOIN properties p ON t.property_id = p.id
        WHERE p.user_id = $user_id AND t.status = 'Active' AND t.lease_start IS NOT NULL AND t.lease_start != ''");
    
    $total_generated = 0;
    while ($tenant = $tenants->fetch_assoc()) {
        $result = generateRecurringInvoices($tenant['id'], $conn);
        if ($result !== false) {
            $total_generated += $result;
        }
    }
    
    header('Location: index.php?rent_generated=1&count=' . $total_generated);
    exit();
}

// Get dashboard statistics
$stats = [];

// Total Properties
$result = $conn->query("SELECT COUNT(*) as total FROM properties WHERE user_id = $user_id");
$stats['total_properties'] = $result->fetch_assoc()['total'];

// Occupied Properties
$result = $conn->query("SELECT COUNT(*) as total FROM properties WHERE user_id = $user_id AND status = 'Occupied'");
$stats['occupied_properties'] = $result->fetch_assoc()['total'];

// Vacant Properties
$result = $conn->query("SELECT COUNT(*) as total FROM properties WHERE user_id = $user_id AND status = 'Vacant'");
$stats['vacant_properties'] = $result->fetch_assoc()['total'];

// Active Tenants
$result = $conn->query("SELECT COUNT(*) as total FROM tenants t 
    INNER JOIN properties p ON t.property_id = p.id 
    WHERE p.user_id = $user_id AND t.status = 'Active'");
$stats['active_tenants'] = $result->fetch_assoc()['total'];

// Check if owner_payments table exists
$check_owner_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_table = $check_owner_table->num_rows > 0;

// Total Monthly Income = All tenant rent (all statuses) + Other income - all on 1st of month
$current_month = date('Y-m');
$result = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Income' 
    AND DATE_FORMAT(transaction_date, '%Y-%m-01') = '$current_month-01'");
$stats['monthly_income'] = $result->fetch_assoc()['total'];

// Add ALL tenant rent payments (regardless of status - received or not received)
$result = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id
    AND DATE_FORMAT(rp.due_date, '%Y-%m-01') = '$current_month-01'");
$stats['monthly_income'] += $result->fetch_assoc()['total'];

// Total Monthly Expenses = All owner rent (all statuses) + Other expenses - all on 1st of month
$result = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Expense' 
    AND DATE_FORMAT(transaction_date, '%Y-%m-01') = '$current_month-01'");
$stats['monthly_expenses'] = $result->fetch_assoc()['total'];

// Add ALL owner rent payments (regardless of status - paid or not paid)
if ($has_owner_table) {
    $result = $conn->query("SELECT COALESCE(SUM(op.amount), 0) as total FROM owner_payments op
        WHERE op.user_id = $user_id
        AND DATE_FORMAT(op.payment_month, '%Y-%m-01') = '$current_month-01'");
    $stats['monthly_expenses'] += $result->fetch_assoc()['total'];
}

// Overdue Rent Payments (count) - includes both 'Overdue' status and 'Pending' with past due dates
$result = $conn->query("SELECT COUNT(*) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND (rp.status = 'Overdue' OR (rp.status = 'Pending' AND rp.due_date < CURDATE()))");
$stats['overdue_rent'] = $result->fetch_assoc()['total'];

// Total Property Value
$result = $conn->query("SELECT COALESCE(SUM(current_value), 0) as total FROM properties WHERE user_id = $user_id");
$stats['total_value'] = $result->fetch_assoc()['total'];

// Check if unit fields exist
$check_unit_fields = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit_fields->num_rows > 0;

// Unit-specific statistics
if ($has_unit_fields) {
    // Total Master Properties (non-units)
    $result = $conn->query("SELECT COUNT(*) as total FROM properties WHERE user_id = $user_id AND (parent_property_id IS NULL OR parent_property_id = 0) AND (is_unit IS NULL OR is_unit = 0)");
    $stats['total_master_properties'] = $result->fetch_assoc()['total'];
    
    // Total Units
    $result = $conn->query("SELECT COUNT(*) as total FROM properties WHERE user_id = $user_id AND ((is_unit = 1) OR (parent_property_id IS NOT NULL AND parent_property_id <> 0))");
    $stats['total_units'] = $result->fetch_assoc()['total'];
    
    // Vacant Units
    $result = $conn->query("SELECT COUNT(*) as total FROM properties WHERE user_id = $user_id AND status = 'Vacant' AND ((is_unit = 1) OR (parent_property_id IS NOT NULL AND parent_property_id <> 0))");
    $stats['vacant_units'] = $result->fetch_assoc()['total'];
    
    // Vacant Units Value (sum of default monthly rent for vacant units)
    $result = $conn->query("SELECT COALESCE(SUM(default_rent), 0) as total FROM properties WHERE user_id = $user_id AND status = 'Vacant' AND ((is_unit = 1) OR (parent_property_id IS NOT NULL AND parent_property_id <> 0))");
    if ($result !== false) {
        $row = $result->fetch_assoc();
        if ($row !== false && isset($row['total']) && $row['total'] !== null) {
            $stats['vacant_units_value'] = floatval($row['total']);
        } else {
            $stats['vacant_units_value'] = 0;
        }
    } else {
        $stats['vacant_units_value'] = 0;
    }
} else {
    $stats['total_master_properties'] = 0;
    $stats['total_units'] = 0;
    $stats['vacant_units'] = 0;
    $stats['vacant_units_value'] = 0;
}

// Recent Transactions
$recent_transactions = $conn->query("SELECT t.*, p.property_name, tn.first_name, tn.last_name 
    FROM transactions t
    LEFT JOIN properties p ON t.property_id = p.id
    LEFT JOIN tenants tn ON t.tenant_id = tn.id
    WHERE t.user_id = $user_id
    ORDER BY t.transaction_date DESC, t.created_at DESC
    LIMIT 10");

// Upcoming Rent Due
$upcoming_rent = $conn->query("SELECT rp.*, t.first_name, t.last_name, p.property_name
    FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND rp.status = 'Pending'
    ORDER BY rp.due_date ASC
    LIMIT 5");

// Rent Status Overview
$rent_received = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments rp
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND rp.status = 'Paid' 
    AND MONTH(rp.paid_date) = MONTH(CURRENT_DATE()) 
    AND YEAR(rp.paid_date) = YEAR(CURRENT_DATE())")->fetch_assoc()['total'];

// Overdue Rent Amount - includes both 'Overdue' status and 'Pending' with past due dates
$rent_overdue_amount = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments rp
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND (rp.status = 'Overdue' OR (rp.status = 'Pending' AND rp.due_date < CURDATE()))")->fetch_assoc()['total'];

$upcoming_rent_amount = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments rp
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND rp.status = 'Pending' AND rp.due_date >= CURDATE()
    AND rp.due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)")->fetch_assoc()['total'];

// Calculate Occupancy Rate
$occupied_count = $stats['occupied_properties'];
$total_count = $stats['total_properties'];
$occupancy_rate = $total_count > 0 ? round(($occupied_count / $total_count) * 100) : 0;

// Cashflow data for last 12 months
$cashflow_data = [];
for ($i = 11; $i >= 0; $i--) {
    $month_start = date('Y-m-01', strtotime("-$i months"));
    $month_end = date('Y-m-t', strtotime("-$i months"));
    $month_label = date('M Y', strtotime("-$i months"));
    
    $income = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
        WHERE user_id = $user_id AND type = 'Income' 
        AND transaction_date BETWEEN '$month_start' AND '$month_end'")->fetch_assoc()['total'];
    
    // Add rent payments to income
    $rent_income = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
        INNER JOIN tenants t ON rp.tenant_id = t.id
        INNER JOIN properties p ON rp.property_id = p.id
        WHERE p.user_id = $user_id AND rp.status = 'Paid' 
        AND rp.paid_date BETWEEN '$month_start' AND '$month_end'")->fetch_assoc()['total'];
    $income += $rent_income;
    
    $expenses = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
        WHERE user_id = $user_id AND type = 'Expense' 
        AND transaction_date BETWEEN '$month_start' AND '$month_end'")->fetch_assoc()['total'];
    
    $cashflow_data[] = [
        'month' => $month_label,
        'income' => $income,
        'expenses' => $expenses,
        'net' => $income - $expenses
    ];
}

// Expenses by Category (Last 30 days)
$expenses_by_category = $conn->query("SELECT category, SUM(amount) as total 
    FROM transactions 
    WHERE user_id = $user_id AND type = 'Expense' 
    AND transaction_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY category 
    ORDER BY total DESC 
    LIMIT 10");

// Pending Maintenance Requests
$pending_maintenance = $conn->query("SELECT COUNT(*) as total FROM maintenance_requests mr
    INNER JOIN properties p ON mr.property_id = p.id
    WHERE p.user_id = $user_id AND mr.status IN ('Pending', 'In Progress')")->fetch_assoc()['total'];

// Calculate Total Investment (Purchase Price)
$total_investment = $conn->query("SELECT COALESCE(SUM(purchase_price), 0) as total FROM properties WHERE user_id = $user_id")->fetch_assoc()['total'];

// Calculate Cash-on-Cash Return
$annual_cashflow = ($stats['monthly_income'] - $stats['monthly_expenses']) * 12;
$cash_on_cash_return = $total_investment > 0 ? round(($annual_cashflow / $total_investment) * 100, 2) : 0;

// Net Worth (Property Value - any debts + cash)
$net_worth = $stats['total_value'];

// Get maintenance requests for dashboard (keep connection open)
$maintenance_requests_query = $conn->query("SELECT mr.*, p.property_name, t.first_name, t.last_name
    FROM maintenance_requests mr
    INNER JOIN properties p ON mr.property_id = p.id
    LEFT JOIN tenants t ON mr.tenant_id = t.id
    WHERE p.user_id = $user_id AND mr.status IN ('Pending', 'In Progress')
    ORDER BY mr.created_at DESC
    LIMIT 5");

closeDBConnection($conn);

$page_title = 'Dashboard';
include 'includes/header.php';

// Show success message for rent generation
if (isset($_GET['rent_generated']) && $_GET['rent_generated'] == '1') {
    echo '<div class="alert alert-success" style="margin-bottom: 20px; padding: 12px 16px; background: #d1fae5; color: #065f46; border-radius: 6px; border: 1px solid #10b981;">
        <strong>✓ Success!</strong> Generated ' . intval($_GET['count'] ?? 0) . ' rent payment(s) for all active tenants.
    </div>';
}
?>

<div class="dashboard">
    <div class="page-header">
        <?php
        $user_name = $_SESSION['user_name'] ?? 'User';
        $first_name = !empty($user_name) ? explode(' ', $user_name)[0] : 'User';
        ?>
        <h1>Welcome back, <?php echo htmlspecialchars($first_name); ?>! 🎉</h1>
        <p>Here's what's happening with your properties today</p>
    </div>

    <!-- Statistics Cards -->
    <div class="stats-grid">
        <?php if ($has_unit_fields): ?>
        <div class="stat-card">
            <div class="stat-icon">🏠</div>
            <div class="stat-content">
                <h3><?php echo $stats['total_master_properties']; ?></h3>
                <p>Master Properties</p>
            </div>
        </div>
        <?php else: ?>
        <div class="stat-card">
            <div class="stat-icon">🏠</div>
            <div class="stat-content">
                <h3><?php echo $stats['total_properties']; ?></h3>
                <p>Total Properties</p>
            </div>
        </div>
        <?php endif; ?>

        <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
                <h3><?php echo $stats['active_tenants']; ?></h3>
                <p>Active Tenants</p>
            </div>
        </div>

        <div class="stat-card stat-income">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
                <h3><?php echo formatCurrency($stats['monthly_income']); ?></h3>
                <p>Monthly Income</p>
            </div>
        </div>

        <div class="stat-card stat-expense">
            <div class="stat-icon">💸</div>
            <div class="stat-content">
                <h3><?php echo formatCurrency($stats['monthly_expenses']); ?></h3>
                <p>Monthly Expenses</p>
            </div>
        </div>

        <div class="stat-card <?php echo ($stats['monthly_income'] - $stats['monthly_expenses']) >= 0 ? 'stat-income' : 'stat-expense'; ?>">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
                <h3><?php echo formatCurrency($stats['monthly_income'] - $stats['monthly_expenses']); ?></h3>
                <p>Net Profit (This Month)</p>
            </div>
        </div>

        <div class="stat-card stat-danger">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
                <h3><?php echo $stats['overdue_rent']; ?></h3>
                <p>Overdue Payments</p>
                <?php if ($stats['overdue_rent'] > 0): ?>
                    <p style="font-size: 12px; color: #ef4444; margin-top: 4px;"><?php echo formatCurrency($rent_overdue_amount); ?> total</p>
                <?php endif; ?>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
                <h3><?php echo $occupancy_rate; ?>%</h3>
                <p>Occupancy Rate</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">💎</div>
            <div class="stat-content">
                <h3><?php echo formatCurrency($net_worth); ?></h3>
                <p>Portfolio Value</p>
            </div>
        </div>

        <?php if ($has_unit_fields): ?>
        <div class="stat-card">
            <div class="stat-icon">🏢</div>
            <div class="stat-content">
                <h3><?php echo $stats['total_units']; ?></h3>
                <p>Total Units</p>
            </div>
        </div>

        <div class="stat-card stat-danger">
            <div class="stat-icon">🚪</div>
            <div class="stat-content">
                <h3><?php echo $stats['vacant_units']; ?></h3>
                <p>Vacant Units</p>
            </div>
        </div>

        <div class="stat-card stat-danger">
            <div class="stat-icon">💵</div>
            <div class="stat-content">
                <h3><?php echo formatCurrency($stats['vacant_units_value']); ?></h3>
                <p>Vacant Units Value</p>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <!-- Rent Status Overview -->
    <div class="stats-grid" style="margin-bottom: 30px;">
        <div class="stat-card stat-income">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
                <h3><?php echo formatCurrency($rent_received); ?></h3>
                <p>Rent Received (This Month)</p>
            </div>
        </div>
        <div class="stat-card stat-danger">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
                <h3><?php echo formatCurrency($rent_overdue_amount); ?></h3>
                <p>Overdue Rent</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-content">
                <h3><?php echo formatCurrency($upcoming_rent_amount); ?></h3>
                <p>Upcoming Rent (Next 30 Days)</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
                <h3><?php echo $cash_on_cash_return; ?>%</h3>
                <p>Cash-on-Cash Return</p>
            </div>
        </div>
        <div class="stat-card" style="cursor: pointer; border: 2px dashed #cbd5e1;" onclick="if(confirm('Generate rent payments for all active tenants from lease start to current month?')) window.location.href='?generate_all_rent=1';">
            <div class="stat-icon">🔄</div>
            <div class="stat-content">
                <h3 style="font-size: 18px; color: #4f46e5;">Generate Rent</h3>
                <p style="font-size: 12px; color: #64748b;">Click to generate all rent payments</p>
            </div>
        </div>
    </div>

    <!-- Cashflow Chart -->
    <div class="content-card" style="margin-bottom: 30px;">
        <div class="card-header">
            <h2>Cashflow (Last 12 Months)</h2>
        </div>
        <div class="card-body">
            <div class="cashflow-chart">
                <canvas id="cashflowChart" height="60"></canvas>
            </div>
        </div>
    </div>

    <!-- Main Content Grid -->
    <div class="dashboard-grid">
        <!-- Recent Transactions -->
        <div class="dashboard-card">
            <div class="card-header">
                <h2>Recent Transactions</h2>
                <a href="transactions/index.php" class="btn-link">View All</a>
            </div>
            <div class="card-body">
                <?php if ($recent_transactions->num_rows > 0): ?>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Property</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php while ($transaction = $recent_transactions->fetch_assoc()): ?>
                                    <tr>
                                        <td><?php echo formatDate($transaction['transaction_date']); ?></td>
                                        <td>
                                            <span class="badge badge-<?php echo $transaction['type'] == 'Income' ? 'success' : 'danger'; ?>">
                                                <?php echo $transaction['type']; ?>
                                            </span>
                                        </td>
                                        <td><?php echo htmlspecialchars($transaction['property_name'] ?? '-'); ?></td>
                                        <td class="<?php echo $transaction['type'] == 'Income' ? 'text-success' : 'text-danger'; ?>">
                                            <?php echo $transaction['type'] == 'Income' ? '+' : '-'; ?><?php echo formatCurrency($transaction['amount']); ?>
                                        </td>
                                    </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    </div>
                <?php else: ?>
                    <p class="text-muted">No transactions yet. <a href="transactions/add.php">Add your first transaction</a></p>
                <?php endif; ?>
            </div>
        </div>

        <!-- Upcoming Rent Due -->
        <div class="dashboard-card">
            <div class="card-header">
                <h2>Upcoming Rent Due</h2>
                <a href="rent/index.php" class="btn-link">View All</a>
            </div>
            <div class="card-body">
                <?php if ($upcoming_rent->num_rows > 0): ?>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Tenant</th>
                                    <th>Property</th>
                                    <th>Due Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php while ($rent = $upcoming_rent->fetch_assoc()): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($rent['first_name'] . ' ' . $rent['last_name']); ?></td>
                                        <td><?php echo htmlspecialchars($rent['property_name']); ?></td>
                                        <td><?php echo formatDate($rent['due_date']); ?></td>
                                        <td><?php echo formatCurrency($rent['amount']); ?></td>
                                        <td>
                                            <span class="badge badge-<?php 
                                                echo $rent['status'] == 'Paid' ? 'success' : 
                                                    ($rent['status'] == 'Overdue' ? 'danger' : 'warning'); 
                                            ?>">
                                                <?php echo $rent['status']; ?>
                                            </span>
                                        </td>
                                    </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    </div>
                <?php else: ?>
                    <p class="text-muted">No upcoming rent payments.</p>
                <?php endif; ?>
            </div>
        </div>

        <!-- Expenses by Category -->
        <div class="dashboard-card">
            <div class="card-header">
                <h2>Expenses by Category (Last 30 Days)</h2>
                <a href="reports/index.php" class="btn-link">View All</a>
            </div>
            <div class="card-body">
                <?php if ($expenses_by_category->num_rows > 0): ?>
                    <div class="expenses-list">
                        <?php 
                        $max_expense = 0;
                        while ($row = $expenses_by_category->fetch_assoc()) {
                            if ($row['total'] > $max_expense) $max_expense = $row['total'];
                        }
                        $expenses_by_category->data_seek(0);
                        while ($expense = $expenses_by_category->fetch_assoc()): 
                            $percentage = $max_expense > 0 ? ($expense['total'] / $max_expense) * 100 : 0;
                        ?>
                            <div class="expense-item">
                                <div class="expense-info">
                                    <span class="expense-category"><?php echo htmlspecialchars($expense['category']); ?></span>
                                    <span class="expense-amount"><?php echo formatCurrency($expense['total']); ?></span>
                                </div>
                                <div class="expense-bar">
                                    <div class="expense-bar-fill" style="width: <?php echo $percentage; ?>%"></div>
                                </div>
                            </div>
                        <?php endwhile; ?>
                    </div>
                <?php else: ?>
                    <p class="text-muted">No expenses recorded in the last 30 days.</p>
                <?php endif; ?>
            </div>
        </div>

        <!-- Maintenance Requests -->
        <div class="dashboard-card">
            <div class="card-header">
                <h2>Maintenance Requests</h2>
                <a href="maintenance/index.php" class="btn-link">View All</a>
            </div>
            <div class="card-body">
                <?php if ($maintenance_requests_query->num_rows > 0): ?>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Property</th>
                                    <th>Title</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php while ($mr = $maintenance_requests_query->fetch_assoc()): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($mr['property_name']); ?></td>
                                        <td><?php echo htmlspecialchars($mr['title']); ?></td>
                                        <td>
                                            <span class="badge badge-<?php 
                                                echo $mr['priority'] == 'Emergency' ? 'danger' : 
                                                    ($mr['priority'] == 'High' ? 'warning' : 'info'); 
                                            ?>">
                                                <?php echo htmlspecialchars($mr['priority']); ?>
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge badge-<?php 
                                                echo $mr['status'] == 'Completed' ? 'success' : 
                                                    ($mr['status'] == 'In Progress' ? 'warning' : 'info'); 
                                            ?>">
                                                <?php echo htmlspecialchars($mr['status']); ?>
                                            </span>
                                        </td>
                                    </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    </div>
                <?php else: ?>
                    <p class="text-muted">No pending maintenance requests.</p>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
<script>
// Cashflow Chart
const ctx = document.getElementById('cashflowChart').getContext('2d');
const cashflowData = <?php echo json_encode($cashflow_data); ?>;

new Chart(ctx, {
    type: 'bar',
    data: {
        labels: cashflowData.map(d => d.month),
        datasets: [
            {
                label: 'Income',
                data: cashflowData.map(d => d.income),
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            },
            {
                label: 'Expenses',
                data: cashflowData.map(d => -d.expenses),
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        const currency = '<?php echo getUserCurrency(); ?>';
                        const symbols = {
                            'QAR': 'ر.ق', 'SAR': 'ر.س', 'AED': 'د.إ', 'BHD': '.د.ب', 
                            'KWD': 'د.ك', 'OMR': 'ر.ع.', 'USD': '$', 'EUR': '€', 
                            'GBP': '£', 'CAD': 'C$', 'AUD': 'A$', 'JPY': '¥'
                        };
                        const symbol = symbols[currency] || '$';
                        const rtlCurrencies = ['QAR', 'SAR', 'AED', 'BHD', 'KWD', 'OMR'];
                        const amount = Math.abs(context.parsed.y).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        label += rtlCurrencies.includes(currency) ? amount + ' ' + symbol : symbol + amount;
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        const currency = '<?php echo getUserCurrency(); ?>';
                        const symbols = {
                            'QAR': 'ر.ق', 'SAR': 'ر.س', 'AED': 'د.إ', 'BHD': '.د.ب', 
                            'KWD': 'د.ك', 'OMR': 'ر.ع.', 'USD': '$', 'EUR': '€', 
                            'GBP': '£', 'CAD': 'C$', 'AUD': 'A$', 'JPY': '¥'
                        };
                        const symbol = symbols[currency] || '$';
                        const rtlCurrencies = ['QAR', 'SAR', 'AED', 'BHD', 'KWD', 'OMR'];
                        const amount = Math.abs(value).toLocaleString();
                        return rtlCurrencies.includes(currency) ? amount + ' ' + symbol : symbol + amount;
                    }
                }
            }
        }
    }
});
</script>

<?php include 'includes/footer.php'; ?>
