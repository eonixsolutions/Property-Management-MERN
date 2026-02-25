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

// REVENUE
// Rent Income (all tenant rent - all statuses)
$rent_income = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id
    AND DATE_FORMAT(rp.due_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];

// Other Income
$other_income = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Income' 
    AND DATE_FORMAT(transaction_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];

$total_revenue = $rent_income + $other_income;

// EXPENSES
// Owner Rent (all owner rent - all statuses)
$owner_rent = 0;
if ($has_owner_table) {
    $owner_rent = $conn->query("SELECT COALESCE(SUM(op.amount), 0) as total FROM owner_payments op
        WHERE op.user_id = $user_id
        AND DATE_FORMAT(op.payment_month, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];
}

// Other Expenses
$other_expenses = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Expense' 
    AND DATE_FORMAT(transaction_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')")->fetch_assoc()['total'];

$total_expenses = $owner_rent + $other_expenses;

// Net Profit
$net_profit = $total_revenue - $total_expenses;

// Get income by category
$income_by_category = $conn->query("SELECT category, SUM(amount) as total 
    FROM transactions 
    WHERE user_id = $user_id AND type = 'Income' 
    AND DATE_FORMAT(transaction_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')
    GROUP BY category
    ORDER BY total DESC");

// Get expenses by category
$expenses_by_category = $conn->query("SELECT category, SUM(amount) as total 
    FROM transactions 
    WHERE user_id = $user_id AND type = 'Expense' 
    AND DATE_FORMAT(transaction_date, '%Y-%m-01') BETWEEN DATE_FORMAT('$start_date', '%Y-%m-01') AND DATE_FORMAT('$end_date', '%Y-%m-01')
    GROUP BY category
    ORDER BY total DESC");

closeDBConnection($conn);

$page_title = 'Profit & Loss Statement';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Profit & Loss Statement</h1>
    <form method="GET" action="" style="display: flex; gap: 12px; align-items: center;">
        <label>From:</label>
        <input type="date" name="start_date" value="<?php echo htmlspecialchars($start_date); ?>" required style="padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; font-family: inherit;">
        <label>To:</label>
        <input type="date" name="end_date" value="<?php echo htmlspecialchars($end_date); ?>" required style="padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; font-family: inherit;">
        <button type="submit" class="btn btn-primary">Generate</button>
    </form>
</div>

<div class="content-card">
    <div class="card-header">
        <h2>Profit & Loss Statement</h2>
        <p style="color: #64748b; margin-top: 5px;">For the period <?php echo date('F d, Y', strtotime($start_date)); ?> to <?php echo date('F d, Y', strtotime($end_date)); ?></p>
    </div>
    <div class="card-body">
        <div style="max-width: 800px; margin: 0 auto;">
            <!-- REVENUE -->
            <div style="margin-bottom: 30px;">
                <h3 style="color: #059669; margin-bottom: 15px; font-size: 18px;">REVENUE</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; padding-left: 20px; border-bottom: 1px solid #e5e7eb;">Rent Income</td>
                        <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;"><?php echo formatCurrency($rent_income); ?></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; padding-left: 20px; border-bottom: 1px solid #e5e7eb;">Other Income</td>
                        <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;"><?php echo formatCurrency($other_income); ?></td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; font-weight: 700; font-size: 16px; color: #059669;">Total Revenue</td>
                        <td style="text-align: right; padding: 12px 0; font-weight: 700; font-size: 16px; color: #059669; border-top: 2px solid #059669;"><?php echo formatCurrency($total_revenue); ?></td>
                    </tr>
                </table>
            </div>

            <!-- EXPENSES -->
            <div style="margin-bottom: 30px;">
                <h3 style="color: #dc2626; margin-bottom: 15px; font-size: 18px;">EXPENSES</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <?php if ($has_owner_table): ?>
                    <tr>
                        <td style="padding: 8px 0; padding-left: 20px; border-bottom: 1px solid #e5e7eb;">Owner Rent</td>
                        <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;"><?php echo formatCurrency($owner_rent); ?></td>
                    </tr>
                    <?php endif; ?>
                    <tr>
                        <td style="padding: 8px 0; padding-left: 20px; border-bottom: 1px solid #e5e7eb;">Other Expenses</td>
                        <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;"><?php echo formatCurrency($other_expenses); ?></td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; font-weight: 700; font-size: 16px; color: #dc2626;">Total Expenses</td>
                        <td style="text-align: right; padding: 12px 0; font-weight: 700; font-size: 16px; color: #dc2626; border-top: 2px solid #dc2626;"><?php echo formatCurrency($total_expenses); ?></td>
                    </tr>
                </table>
            </div>

            <!-- NET PROFIT -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 3px solid #1e40af;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 15px 0; font-size: 20px; font-weight: 700; color: <?php echo $net_profit >= 0 ? '#059669' : '#dc2626'; ?>;">Net Profit / (Loss)</td>
                        <td style="text-align: right; padding: 15px 0; font-size: 20px; font-weight: 700; color: <?php echo $net_profit >= 0 ? '#059669' : '#dc2626'; ?>;"><?php echo formatCurrency($net_profit); ?></td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Detailed Breakdown -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px;">
            <div class="content-card">
                <div class="card-header">
                    <h3>Income by Category</h3>
                </div>
                <div class="card-body">
                    <?php if ($income_by_category->num_rows > 0): ?>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php while ($row = $income_by_category->fetch_assoc()): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($row['category']); ?></td>
                                        <td class="text-success"><?php echo formatCurrency($row['total']); ?></td>
                                    </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    <?php else: ?>
                        <p class="text-muted">No income categories</p>
                    <?php endif; ?>
                </div>
            </div>

            <div class="content-card">
                <div class="card-header">
                    <h3>Expenses by Category</h3>
                </div>
                <div class="card-body">
                    <?php if ($expenses_by_category->num_rows > 0): ?>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php while ($row = $expenses_by_category->fetch_assoc()): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($row['category']); ?></td>
                                        <td class="text-danger"><?php echo formatCurrency($row['total']); ?></td>
                                    </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    <?php else: ?>
                        <p class="text-muted">No expense categories</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<div style="margin-top: 20px;">
    <a href="index.php" class="btn-link">← Back to Accounting</a>
</div>

<?php include '../includes/footer.php'; ?>

