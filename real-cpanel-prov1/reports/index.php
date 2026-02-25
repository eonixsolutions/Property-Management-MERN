<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Get date range
$start_date = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-01-01');
$end_date = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-12-31');

// Check if owner_payments table exists
$check_owner_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_table = $check_owner_table->num_rows > 0;

// Total Income = All tenant rent (all statuses) + Other income - all on 1st of month
$total_income = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Income' 
    AND DATE_FORMAT(transaction_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];

// Add ALL tenant rent payments (regardless of status - received or not received)
$rent_income = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id
    AND DATE_FORMAT(rp.due_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];
$total_income += $rent_income;

// Total Expenses = All owner rent (all statuses) + Other expenses - all on 1st of month
$total_expenses = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Expense' 
    AND DATE_FORMAT(transaction_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];

// Add ALL owner rent payments (regardless of status - paid or not paid)
$total_owner_rent = 0;
if ($has_owner_table) {
    $total_owner_rent = $conn->query("SELECT COALESCE(SUM(op.amount), 0) as total FROM owner_payments op
        WHERE op.user_id = $user_id
        AND DATE_FORMAT(op.payment_month, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];
    $total_expenses += $total_owner_rent;
}

// Receivables = Tenant rent NOT received (Pending/Overdue rent payments) - all on 1st of month
$total_receivable = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND (rp.status = 'Pending' OR rp.status = 'Overdue')
    AND DATE_FORMAT(rp.due_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];

// Payables = Owner rent NOT paid (Pending/Overdue owner payments) - all on 1st of month
$total_payable = 0;
if ($has_owner_table) {
    $total_payable = $conn->query("SELECT COALESCE(SUM(op.amount), 0) as total FROM owner_payments op
        WHERE op.user_id = $user_id AND (op.status = 'Pending' OR op.status = 'Overdue')
        AND DATE_FORMAT(op.payment_month, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];
}

// Net profit = Total Income - Total Expenses (owner rent already included in expenses)
$net_profit = $total_income - $total_expenses;

// Get receivable by property (tenant rent not received - Pending/Overdue)
$receivable_by_category = $conn->query("SELECT p.property_name as category, SUM(rp.amount) as total 
    FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND (rp.status = 'Pending' OR rp.status = 'Overdue')
    AND DATE_FORMAT(rp.due_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')
    GROUP BY p.property_name
    ORDER BY total DESC");

// Get payable by property (owner rent not paid - Pending/Overdue)
$payable_by_category_query = "";
if ($has_owner_table) {
    $payable_by_category = $conn->query("SELECT p.property_name as category, SUM(op.amount) as total 
        FROM owner_payments op
        INNER JOIN properties p ON op.property_id = p.id
        WHERE op.user_id = $user_id AND (op.status = 'Pending' OR op.status = 'Overdue')
        AND DATE_FORMAT(op.payment_month, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')
        GROUP BY p.property_name
        ORDER BY total DESC");
} else {
    // Create empty result set if owner_payments table doesn't exist
    $payable_by_category = $conn->query("SELECT '' as category, 0 as total WHERE 1=0");
}

// Get monthly summary (receivable = tenant rent not received, payable = owner rent not paid) - all on 1st of month
$monthly_summary_query = "SELECT month, 
    SUM(receivable) as receivable, 
    SUM(payable) as payable";

if ($has_owner_table) {
    $monthly_summary_query .= ", SUM(owner_rent_paid) as owner_rent";
}

$monthly_summary_query .= "
    FROM (
        SELECT DATE_FORMAT(rp.due_date, '%Y-%m') as month,
            SUM(CASE WHEN rp.status IN ('Pending', 'Overdue') THEN rp.amount ELSE 0 END) as receivable,
            0 as payable";
            
if ($has_owner_table) {
    $monthly_summary_query .= ", 0 as owner_rent_paid";
}

$monthly_summary_query .= "
            FROM rent_payments rp
            INNER JOIN tenants tn ON rp.tenant_id = tn.id
            INNER JOIN properties p ON rp.property_id = p.id
            WHERE p.user_id = $user_id
            AND DATE_FORMAT(rp.due_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')
            GROUP BY DATE_FORMAT(rp.due_date, '%Y-%m')";
            
if ($has_owner_table) {
    $monthly_summary_query .= "
            
        UNION ALL
        
        SELECT DATE_FORMAT(op.payment_month, '%Y-%m') as month,
            0 as receivable,
            SUM(CASE WHEN op.status IN ('Pending', 'Overdue') THEN op.amount ELSE 0 END) as payable,
            SUM(CASE WHEN op.status = 'Paid' THEN op.amount ELSE 0 END) as owner_rent_paid
            FROM owner_payments op
            WHERE op.user_id = $user_id
            AND DATE_FORMAT(op.payment_month, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')
            GROUP BY DATE_FORMAT(op.payment_month, '%Y-%m')";
}

$monthly_summary_query .= "
    ) as monthly_data
    GROUP BY month
    ORDER BY month DESC";

$monthly_summary = $conn->query($monthly_summary_query);

// Check if owner columns exist in properties table
$check_owner_name = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner_columns = $check_owner_name->num_rows > 0;

// Check if unit fields exist
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

// Property performance (Income = all tenant rent + other income, Expenses = all owner rent + other expenses) - all on 1st of month
$property_performance_query = "SELECT p.property_name";

if ($has_owner_columns) {
    $property_performance_query .= ", p.owner_name, p.monthly_rent_to_owner";
}

if ($has_unit_fields) {
    $property_performance_query .= ", p.is_unit, p.parent_property_id, parent.property_name as parent_property_name";
}

// Income = All tenant rent (all statuses) + Other income transactions
$property_performance_query .= ",
    COALESCE(SUM(CASE WHEN t.type = 'Income' THEN t.amount ELSE 0 END), 0) as transactions_income,
    COALESCE(SUM(rp.amount), 0) as rent_income,
    (COALESCE(SUM(CASE WHEN t.type = 'Income' THEN t.amount ELSE 0 END), 0) + COALESCE(SUM(rp.amount), 0)) as income,
    COALESCE(SUM(CASE WHEN t.type = 'Expense' THEN t.amount ELSE 0 END), 0) as expenses";
    
// Expenses = All owner rent (all statuses) + Other expense transactions
if ($has_owner_table) {
    $property_performance_query .= ",
    COALESCE(SUM(op.amount), 0) as owner_rent,
    (COALESCE(SUM(CASE WHEN t.type = 'Expense' THEN t.amount ELSE 0 END), 0) + COALESCE(SUM(op.amount), 0)) as total_expenses";
}

$property_performance_query .= ",
    (COALESCE(SUM(CASE WHEN t.type = 'Income' THEN t.amount ELSE 0 END), 0) + COALESCE(SUM(rp.amount), 0)) 
    - (COALESCE(SUM(CASE WHEN t.type = 'Expense' THEN t.amount ELSE 0 END), 0)";
    
if ($has_owner_table) {
    $property_performance_query .= " + COALESCE(SUM(op.amount), 0)";
}

$property_performance_query .= ") as net
    FROM properties p";
    
if ($has_unit_fields) {
    $property_performance_query .= " LEFT JOIN properties parent ON p.parent_property_id = parent.id";
}

// Join transactions (all on 1st of month)
$property_performance_query .= "
    LEFT JOIN transactions t ON p.id = t.property_id 
        AND DATE_FORMAT(t.transaction_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')";
    
// Join ALL rent payments (all statuses, all on 1st of month)
$property_performance_query .= "
    LEFT JOIN rent_payments rp ON p.id = rp.property_id 
        AND DATE_FORMAT(rp.due_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')";
    
// Join ALL owner payments (all statuses, all on 1st of month)
if ($has_owner_table) {
    $property_performance_query .= "
    LEFT JOIN owner_payments op ON p.id = op.property_id 
        AND DATE_FORMAT(op.payment_month, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')";
}

$property_performance_query .= "
    WHERE p.user_id = $user_id";

// Group master properties only (exclude units from main list, show them grouped)
if ($has_unit_fields) {
    $property_performance_query .= " AND (p.is_unit = 0 OR p.is_unit IS NULL)";
}

if ($has_owner_columns) {
    $property_performance_query .= "
    GROUP BY p.id, p.property_name, p.owner_name, p.monthly_rent_to_owner";
    if ($has_unit_fields) {
        $property_performance_query .= ", p.is_unit, p.parent_property_id, parent.property_name";
    }
} else {
    $property_performance_query .= "
    GROUP BY p.id, p.property_name";
    if ($has_unit_fields) {
        $property_performance_query .= ", p.is_unit, p.parent_property_id, parent.property_name";
    }
}

$property_performance_query .= "
    ORDER BY net DESC";

$property_performance = $conn->query($property_performance_query);
// Connection will be closed after reports are displayed

$page_title = 'Reports';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Reports & Analytics</h1>
    <form method="GET" action="" style="display: flex; gap: 12px; align-items: center;">
        <label>From:</label>
        <input type="date" name="start_date" value="<?php echo htmlspecialchars($start_date); ?>" required style="padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; font-family: inherit;">
        <label>To:</label>
        <input type="date" name="end_date" value="<?php echo htmlspecialchars($end_date); ?>" required style="padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; font-family: inherit;">
        <button type="submit" class="btn btn-primary">Generate Report</button>
    </form>
</div>

<div class="stats-grid" style="margin-bottom: 30px;">
    <div class="stat-card stat-income">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_income); ?></h3>
            <p>Total Income (All on 1st of Month)</p>
            <small style="color: #10b981; font-size: 12px;">All Tenant Rent + Other Income</small>
        </div>
    </div>
    <div class="stat-card stat-expense">
        <div class="stat-icon">💸</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_expenses); ?></h3>
            <p>Total Expenses (All on 1st of Month)</p>
            <small style="color: #ef4444; font-size: 12px;">All Owner Rent + Other Expenses</small>
        </div>
    </div>
    <div class="stat-card stat-income" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);">
        <div class="stat-icon">📥</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_receivable); ?></h3>
            <p>Receivable (Not Received)</p>
            <small style="color: #3b82f6; font-size: 12px;">Tenant Rent Pending/Overdue</small>
        </div>
    </div>
    <div class="stat-card stat-expense" style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);">
        <div class="stat-icon">📤</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($total_payable); ?></h3>
            <p>Payable (Not Paid)</p>
            <small style="color: #dc2626; font-size: 12px;">Owner Rent Pending/Overdue</small>
        </div>
    </div>
    <div class="stat-card <?php echo $net_profit >= 0 ? 'stat-income' : 'stat-expense'; ?>">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
            <h3><?php echo formatCurrency($net_profit); ?></h3>
            <p>Net Profit (Income - Expenses)</p>
        </div>
    </div>
</div>

<div class="dashboard-grid">
    <div class="content-card">
        <div class="card-header">
            <h2>Receivables by Property (Tenant Rent Not Received - All on 1st of Month)</h2>
        </div>
        <div class="card-body">
            <?php if ($receivable_by_category->num_rows > 0): ?>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Property</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while ($row = $receivable_by_category->fetch_assoc()): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($row['category']); ?></td>
                                    <td class="text-success"><?php echo formatCurrency($row['total']); ?></td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <p class="text-muted">No receivables (all tenant rent has been received)</p>
            <?php endif; ?>
        </div>
    </div>

    <div class="content-card">
        <div class="card-header">
            <h2>Payables by Property (Owner Rent Not Paid - All on 1st of Month)</h2>
        </div>
        <div class="card-body">
            <?php if ($has_owner_table && $payable_by_category->num_rows > 0): ?>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Property</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while ($row = $payable_by_category->fetch_assoc()): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($row['category']); ?></td>
                                    <td class="text-danger"><?php echo formatCurrency($row['total']); ?></td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <p class="text-muted"><?php echo $has_owner_table ? 'No payables (all owner rent has been paid)' : 'Owner payments feature not available'; ?></p>
            <?php endif; ?>
        </div>
    </div>
</div>

<div class="content-card mt-20">
    <div class="card-header">
        <h2>Property Performance</h2>
    </div>
    <div class="card-body">
        <?php if ($property_performance->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Property</th>
                            <?php if ($has_owner_columns): ?>
                            <th>Owner</th>
                            <?php endif; ?>
                            <th>Income</th>
                            <th>Expenses</th>
                            <?php if ($has_owner_table): ?>
                            <th>Owner Rent (All Statuses)</th>
                            <?php endif; ?>
                            <th>Net Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php 
                        // Store property performance data in array for processing
                        $property_data = [];
                        while ($temp_row = $property_performance->fetch_assoc()) {
                            $property_data[] = $temp_row;
                        }
                        
                        // Process each property
                        foreach ($property_data as $row): 
                            // Get units for this master property if it has units
                            $units_rent = 0;
                            $units_data = [];
                            $units_rent_income = 0;
                            
                            if ($has_unit_fields && empty($row['is_unit'])) {
                                // Get property ID from property name (we'll match by name and user)
                                $master_name = $conn->real_escape_string($row['property_name']);
                                $prop_result = $conn->query("SELECT id FROM properties WHERE property_name = '$master_name' AND user_id = $user_id AND (is_unit = 0 OR is_unit IS NULL OR parent_property_id IS NULL) LIMIT 1");
                                if ($prop_result && $prop_result->num_rows > 0) {
                                    $prop_row = $prop_result->fetch_assoc();
                                    $prop_id = $prop_row['id'];
                                    
                                     // Get units with their financial data (all rent and owner payments, all on 1st of month)
                                     $units_query = "SELECT p.id, p.property_name, p.unit_name,
                                         COALESCE(SUM(tn.monthly_rent), 0) as units_rent,
                                         COALESCE(SUM(CASE WHEN t.type = 'Income' THEN t.amount ELSE 0 END), 0) as transactions_income,
                                         COALESCE(SUM(CASE WHEN t.type = 'Expense' THEN t.amount ELSE 0 END), 0) as expenses";
                                     if ($has_owner_table) {
                                         $units_query .= ",
                                         COALESCE(SUM(op.amount), 0) as owner_rent";
                                     }
                                     // Include ALL rent payments (all statuses)
                                     $units_query .= ",
                                         COALESCE(SUM(rp.amount), 0) as rent_income
                                         FROM properties p
                                         LEFT JOIN tenants tn ON p.id = tn.property_id AND tn.status = 'Active'
                                         LEFT JOIN transactions t ON p.id = t.property_id 
                                             AND DATE_FORMAT(t.transaction_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')
                                         LEFT JOIN rent_payments rp ON p.id = rp.property_id 
                                             AND DATE_FORMAT(rp.due_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')";
                                     if ($has_owner_table) {
                                         // Include ALL owner payments (all statuses)
                                         $units_query .= "
                                         LEFT JOIN owner_payments op ON p.id = op.property_id 
                                             AND DATE_FORMAT(op.payment_month, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')";
                                     }
                                     $units_query .= "
                                         WHERE p.parent_property_id = $prop_id
                                         GROUP BY p.id, p.property_name, p.unit_name";
                                    
                                    $units_result = $conn->query($units_query);
                                    $units_total_income = 0;
                                    $units_total_expenses = 0;
                                    $units_total_owner_rent = 0;
                                    
                                    if ($units_result) {
                                        while ($unit = $units_result->fetch_assoc()) {
                                            // Combine transactions income and rent income
                                            $unit['income'] = ($unit['transactions_income'] ?? 0) + ($unit['rent_income'] ?? 0);
                                            $units_data[] = $unit;
                                            $units_rent += $unit['units_rent'];
                                            $units_total_income += $unit['income'];
                                            $units_total_expenses += $unit['expenses'];
                                            if ($has_owner_table) {
                                                $units_total_owner_rent += $unit['owner_rent'] ?? 0;
                                            }
                                        }
                                    }
                                    
                                     // Calculate totals including units
                                     // Income = All tenant rent (all statuses) + Other income
                                     // Expenses = All owner rent (all statuses) + Other expenses
                                     $total_income_with_units = $row['income'] + $units_total_income;
                                     $total_expenses_with_units = ($row['expenses'] ?? 0) + ($row['owner_rent'] ?? 0) + $units_total_expenses + $units_total_owner_rent;
                                     
                                     $row['income'] = $total_income_with_units;
                                     $row['expenses'] = $total_expenses_with_units;
                                     $row['net'] = $total_income_with_units - $total_expenses_with_units;
                                     
                                     if ($has_owner_table) {
                                         $row['owner_rent'] = ($row['owner_rent'] ?? 0) + $units_total_owner_rent;
                                     }
                                }
                            }
                        ?>
                            <tr>
                                <td>
                                    <strong><?php echo htmlspecialchars($row['property_name']); ?></strong>
                                    <?php if ($has_unit_fields && !empty($row['is_unit'])): ?>
                                        <br><small style="color: #64748b;">Unit of: <?php echo htmlspecialchars($row['parent_property_name'] ?? 'Unknown'); ?></small>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($has_owner_columns): ?>
                                        <?php if (!empty($row['owner_name'])): ?>
                                            <span style="color: #6366f1;"><?php echo htmlspecialchars($row['owner_name']); ?></span>
                                            <?php if (!empty($row['monthly_rent_to_owner']) && $row['monthly_rent_to_owner'] > 0): ?>
                                                <br><small style="color: #64748b;"><?php echo formatCurrency($row['monthly_rent_to_owner']); ?>/mo</small>
                                            <?php endif; ?>
                                        <?php else: ?>
                                            <span style="color: #94a3b8;">Self-owned</span>
                                        <?php endif; ?>
                                    <?php else: ?>
                                        <span style="color: #94a3b8;">-</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-success">
                                    <?php echo formatCurrency($row['income']); ?>
                                    <?php if ($has_unit_fields && $units_rent > 0): ?>
                                        <br><small style="color: #10b981;">+ <?php echo count($units_data); ?> unit(s): <?php echo formatCurrency($units_rent); ?></small>
                                    <?php endif; ?>
                                </td>
                                 <td class="text-danger"><?php echo formatCurrency($row['expenses']); ?></td>
                                 <?php if ($has_owner_table): ?>
                                 <td class="text-warning"><?php echo formatCurrency($row['owner_rent'] ?? 0); ?></td>
                                 <?php endif; ?>
                                <td class="<?php echo $row['net'] >= 0 ? 'text-success' : 'text-danger'; ?>">
                                    <strong><?php echo formatCurrency($row['net']); ?></strong>
                                </td>
                            </tr>
                            <?php if ($has_unit_fields && count($units_data) > 0): ?>
                                 <?php foreach ($units_data as $unit): 
                                     // Calculate unit's total income (all rent + transactions)
                                     $unit_total_income = ($unit['transactions_income'] ?? 0) + ($unit['rent_income'] ?? 0);
                                     // Calculate unit's total expenses (all owner rent + other expenses)
                                     $unit_total_expenses = ($unit['expenses'] ?? 0) + ($unit['owner_rent'] ?? 0);
                                     $unit_net = $unit_total_income - $unit_total_expenses;
                                 ?>
                                <tr style="background: #f9fafb;">
                                    <td style="padding-left: 40px;">
                                        └─ <small><?php echo htmlspecialchars($unit['unit_name'] ?? $unit['property_name']); ?></small>
                                    </td>
                                    <td><small style="color: #94a3b8;">Unit</small></td>
                                     <td class="text-success"><small><?php echo formatCurrency($unit_total_income); ?></small></td>
                                     <td class="text-danger"><small><?php echo formatCurrency($unit_total_expenses); ?></small></td>
                                     <?php if ($has_owner_table): ?>
                                     <td class="text-warning"><small><?php echo formatCurrency($unit['owner_rent'] ?? 0); ?></small></td>
                                     <?php endif; ?>
                                    <td><small class="<?php echo $unit_net >= 0 ? 'text-success' : 'text-danger'; ?>"><?php echo formatCurrency($unit_net); ?></small></td>
                                </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-muted">No property performance data available</p>
        <?php endif; ?>
    </div>
</div>

<div class="content-card mt-20">
    <div class="card-header">
        <h2>Monthly Summary</h2>
    </div>
    <div class="card-body">
        <?php 
        // Store monthly summary in array first
        $monthly_data = [];
        while ($temp_row = $monthly_summary->fetch_assoc()) {
            $monthly_data[] = $temp_row;
        }
        
        if (count($monthly_data) > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Receivable (1st of Month)</th>
                            <th>Payable (1st of Month)</th>
                            <?php if ($has_owner_table): ?>
                            <th>Owner Rent (All Statuses)</th>
                            <?php endif; ?>
                            <th>Net Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        
                        // Get actual income and expenses for net profit calculation
                        $monthly_income_expenses = $conn->query("SELECT 
                            DATE_FORMAT(transaction_date, '%Y-%m') as month,
                            SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END) as income,
                            SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as expenses
                            FROM transactions 
                            WHERE user_id = $user_id 
                            AND DATE_FORMAT(transaction_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')
                            GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')");
                        
                        $monthly_rent_income = $conn->query("SELECT 
                            DATE_FORMAT(due_date, '%Y-%m') as month,
                            SUM(amount) as rent_income
                            FROM rent_payments rp
                            INNER JOIN tenants t ON rp.tenant_id = t.id
                            INNER JOIN properties p ON rp.property_id = p.id
                            WHERE p.user_id = $user_id AND rp.status = 'Paid'
                            AND DATE_FORMAT(rp.due_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')
                            GROUP BY DATE_FORMAT(rp.due_date, '%Y-%m')");
                        
                        // Create arrays for quick lookup
                        $income_data = [];
                        while ($r = $monthly_income_expenses->fetch_assoc()) {
                            $income_data[$r['month']] = ['income' => $r['income'], 'expenses' => $r['expenses']];
                        }
                        
                        $rent_data = [];
                        while ($r = $monthly_rent_income->fetch_assoc()) {
                            $rent_data[$r['month']] = $r['rent_income'];
                        }
                        
                        // Display monthly summary
                        foreach ($monthly_data as $row): 
                            $owner_rent = $has_owner_table ? ($row['owner_rent'] ?? 0) : 0;
                            $receivable_month = $row['receivable'] ?? 0;
                            $payable_month = $row['payable'] ?? 0;
                            
                            // Calculate net profit from actual income/expenses
                            $month = $row['month'];
                            $actual_income = isset($income_data[$month]) ? $income_data[$month]['income'] : 0;
                            $actual_expenses = isset($income_data[$month]) ? $income_data[$month]['expenses'] : 0;
                            $rent_income_month = isset($rent_data[$month]) ? $rent_data[$month] : 0;
                            $net = ($actual_income + $rent_income_month) - $actual_expenses - $owner_rent;
                        ?>
                            <tr>
                                <td><strong><?php echo date('F Y', strtotime($row['month'] . '-01')); ?></strong></td>
                                <td class="text-success"><?php echo formatCurrency($receivable_month); ?></td>
                                <td class="text-danger"><?php echo formatCurrency($payable_month); ?></td>
                                <?php if ($has_owner_table): ?>
                                <td class="text-warning"><?php echo formatCurrency($owner_rent); ?></td>
                                <?php endif; ?>
                                <td class="<?php echo $net >= 0 ? 'text-success' : 'text-danger'; ?>">
                                    <strong><?php echo formatCurrency($net); ?></strong>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-muted">No monthly data available</p>
        <?php endif; ?>
    </div>
</div>

<?php 
closeDBConnection($conn);
include '../includes/footer.php'; 
?>
