<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Get date for trial balance (default to today)
$as_of_date = isset($_GET['as_of_date']) ? $_GET['as_of_date'] : date('Y-m-d');

$check_owner_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_table = $check_owner_table->num_rows > 0;

// Initialize arrays for accounts
$accounts = [];

// ASSETS (Debit balances)
// Cash
$cash_debit = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Income' 
    AND transaction_date <= '$as_of_date'")->fetch_assoc()['total'] - 
    $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Expense' 
    AND transaction_date <= '$as_of_date'")->fetch_assoc()['total'];

$paid_rent = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND rp.status = 'Paid' 
    AND rp.paid_date <= '$as_of_date'")->fetch_assoc()['total'];
$cash_debit += $paid_rent;

$owner_rent_paid = 0;
if ($has_owner_table) {
    $owner_rent_paid = $conn->query("SELECT COALESCE(SUM(op.amount), 0) as total FROM owner_payments op
        WHERE op.user_id = $user_id AND op.status = 'Paid'
        AND op.paid_date <= '$as_of_date'")->fetch_assoc()['total'];
    $cash_debit -= $owner_rent_paid;
}

if ($cash_debit > 0) {
    $accounts[] = ['account' => 'Cash', 'debit' => $cash_debit, 'credit' => 0, 'type' => 'Asset'];
} else {
    $accounts[] = ['account' => 'Cash', 'debit' => 0, 'credit' => abs($cash_debit), 'type' => 'Asset'];
}

// Accounts Receivable
$ar_balance = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND (rp.status = 'Pending' OR rp.status = 'Overdue')
    AND rp.due_date <= '$as_of_date'")->fetch_assoc()['total'];
if ($ar_balance > 0) {
    $accounts[] = ['account' => 'Accounts Receivable', 'debit' => $ar_balance, 'credit' => 0, 'type' => 'Asset'];
}

// Fixed Assets - Property Value
$property_value = $conn->query("SELECT COALESCE(SUM(current_value), 0) as total FROM properties 
    WHERE user_id = $user_id")->fetch_assoc()['total'];
if ($property_value > 0) {
    $accounts[] = ['account' => 'Property Value', 'debit' => $property_value, 'credit' => 0, 'type' => 'Asset'];
}

// LIABILITIES (Credit balances)
// Accounts Payable
$ap_balance = 0;
if ($has_owner_table) {
    $ap_balance = $conn->query("SELECT COALESCE(SUM(op.amount), 0) as total FROM owner_payments op
        WHERE op.user_id = $user_id AND (op.status = 'Pending' OR op.status = 'Overdue')
        AND op.payment_month <= '$as_of_date'")->fetch_assoc()['total'];
    if ($ap_balance > 0) {
        $accounts[] = ['account' => 'Accounts Payable', 'debit' => 0, 'credit' => $ap_balance, 'type' => 'Liability'];
    }
}

// EQUITY (Credit balances)
// Retained Earnings
$total_income = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Income' 
    AND transaction_date <= '$as_of_date'")->fetch_assoc()['total'];

$all_rent_income = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id
    AND rp.due_date <= '$as_of_date'")->fetch_assoc()['total'];
$total_income += $all_rent_income;

$total_expenses = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Expense' 
    AND transaction_date <= '$as_of_date'")->fetch_assoc()['total'];

$all_owner_rent = 0;
if ($has_owner_table) {
    $all_owner_rent = $conn->query("SELECT COALESCE(SUM(op.amount), 0) as total FROM owner_payments op
        WHERE op.user_id = $user_id
        AND op.payment_month <= '$as_of_date'")->fetch_assoc()['total'];
    $total_expenses += $all_owner_rent;
}

$retained_earnings = $total_income - $total_expenses;
if ($retained_earnings > 0) {
    $accounts[] = ['account' => 'Retained Earnings', 'debit' => 0, 'credit' => $retained_earnings, 'type' => 'Equity'];
} else {
    $accounts[] = ['account' => 'Retained Earnings', 'debit' => abs($retained_earnings), 'credit' => 0, 'type' => 'Equity'];
}

// Calculate totals
$total_debits = array_sum(array_column($accounts, 'debit'));
$total_credits = array_sum(array_column($accounts, 'credit'));

closeDBConnection($conn);

$page_title = 'Trial Balance';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Trial Balance</h1>
    <form method="GET" action="" style="display: flex; gap: 12px; align-items: center;">
        <label>As of Date:</label>
        <input type="date" name="as_of_date" value="<?php echo htmlspecialchars($as_of_date); ?>" required style="padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; font-family: inherit;">
        <button type="submit" class="btn btn-primary">Generate</button>
    </form>
</div>

<div class="content-card">
    <div class="card-header">
        <h2>Trial Balance as of <?php echo date('F d, Y', strtotime($as_of_date)); ?></h2>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Account</th>
                        <th>Type</th>
                        <th style="text-align: right;">Debit</th>
                        <th style="text-align: right;">Credit</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    $current_type = '';
                    foreach ($accounts as $account): 
                        if ($current_type != $account['type']):
                            $current_type = $account['type'];
                    ?>
                            <tr style="background: #f9fafb;">
                                <td colspan="4" style="font-weight: 700; padding: 12px; color: <?php 
                                    echo $account['type'] == 'Asset' ? '#1e40af' : ($account['type'] == 'Liability' ? '#dc2626' : '#059669'); 
                                ?>;">
                                    <?php echo strtoupper($account['type']); ?>
                                </td>
                            </tr>
                    <?php endif; ?>
                        <tr>
                            <td style="padding-left: 30px;"><?php echo htmlspecialchars($account['account']); ?></td>
                            <td><?php echo htmlspecialchars($account['type']); ?></td>
                            <td style="text-align: right; font-weight: <?php echo $account['debit'] > 0 ? '500' : '400'; ?>;">
                                <?php echo $account['debit'] > 0 ? formatCurrency($account['debit']) : '-'; ?>
                            </td>
                            <td style="text-align: right; font-weight: <?php echo $account['credit'] > 0 ? '500' : '400'; ?>;">
                                <?php echo $account['credit'] > 0 ? formatCurrency($account['credit']) : '-'; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
                <tfoot>
                    <tr style="background: #f3f4f6; border-top: 3px solid #1e40af;">
                        <td colspan="2" style="font-weight: 700; padding: 15px; font-size: 16px;">TOTAL</td>
                        <td style="text-align: right; font-weight: 700; padding: 15px; font-size: 16px; color: #1e40af;">
                            <?php echo formatCurrency($total_debits); ?>
                        </td>
                        <td style="text-align: right; font-weight: 700; padding: 15px; font-size: 16px; color: #1e40af;">
                            <?php echo formatCurrency($total_credits); ?>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <?php if (abs($total_debits - $total_credits) > 0.01): ?>
            <div style="margin-top: 30px; padding: 15px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b;">
                <strong>⚠️ Trial Balance does not balance!</strong> Difference: <?php echo formatCurrency(abs($total_debits - $total_credits)); ?>
            </div>
        <?php else: ?>
            <div style="margin-top: 30px; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; color: #166534;">
                <strong>✓ Trial Balance is balanced!</strong> Total Debits = Total Credits
            </div>
        <?php endif; ?>
    </div>
</div>

<div style="margin-top: 20px;">
    <a href="index.php" class="btn-link">← Back to Accounting</a>
</div>

<?php include '../includes/footer.php'; ?>

