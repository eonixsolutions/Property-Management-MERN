<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Get date for balance sheet (default to today)
$as_of_date = isset($_GET['as_of_date']) ? $_GET['as_of_date'] : date('Y-m-d');

// ASSETS
// Current Assets
$cash = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Income' 
    AND transaction_date <= '$as_of_date'")->fetch_assoc()['total'] - 
    $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
    WHERE user_id = $user_id AND type = 'Expense' 
    AND transaction_date <= '$as_of_date'")->fetch_assoc()['total'];

// Add paid rent received
$paid_rent = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND rp.status = 'Paid' 
    AND rp.paid_date <= '$as_of_date'")->fetch_assoc()['total'];
$cash += $paid_rent;

// Subtract owner rent paid
$check_owner_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_table = $check_owner_table->num_rows > 0;
$owner_rent_paid = 0;
if ($has_owner_table) {
    $owner_rent_paid = $conn->query("SELECT COALESCE(SUM(op.amount), 0) as total FROM owner_payments op
        WHERE op.user_id = $user_id AND op.status = 'Paid'
        AND op.paid_date <= '$as_of_date'")->fetch_assoc()['total'];
    $cash -= $owner_rent_paid;
}

// Accounts Receivable (Tenant rent not received)
$accounts_receivable = $conn->query("SELECT COALESCE(SUM(rp.amount), 0) as total FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND (rp.status = 'Pending' OR rp.status = 'Overdue')
    AND rp.due_date <= '$as_of_date'")->fetch_assoc()['total'];

// Fixed Assets (Property values)
$fixed_assets = $conn->query("SELECT COALESCE(SUM(current_value), 0) as total FROM properties 
    WHERE user_id = $user_id")->fetch_assoc()['total'];

$total_assets = $cash + $accounts_receivable + $fixed_assets;

// LIABILITIES
// Accounts Payable (Owner rent not paid)
$accounts_payable = 0;
if ($has_owner_table) {
    $accounts_payable = $conn->query("SELECT COALESCE(SUM(op.amount), 0) as total FROM owner_payments op
        WHERE op.user_id = $user_id AND (op.status = 'Pending' OR op.status = 'Overdue')
        AND op.payment_month <= '$as_of_date'")->fetch_assoc()['total'];
}

$total_liabilities = $accounts_payable;

// EQUITY
// Retained Earnings (Net profit from beginning to date)
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
$total_equity = $retained_earnings;

$total_liabilities_equity = $total_liabilities + $total_equity;

closeDBConnection($conn);

$page_title = 'Balance Sheet';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Balance Sheet</h1>
    <form method="GET" action="" style="display: flex; gap: 12px; align-items: center;">
        <label>As of Date:</label>
        <input type="date" name="as_of_date" value="<?php echo htmlspecialchars($as_of_date); ?>" required style="padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; font-family: inherit;">
        <button type="submit" class="btn btn-primary">Generate</button>
    </form>
</div>

<div class="content-card">
    <div class="card-header">
        <h2>Balance Sheet as of <?php echo date('F d, Y', strtotime($as_of_date)); ?></h2>
    </div>
    <div class="card-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px;">
            <!-- ASSETS -->
            <div>
                <h3 style="color: #1e40af; margin-bottom: 20px; font-size: 18px;">ASSETS</h3>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #3b82f6; margin-bottom: 10px; font-size: 16px;">Current Assets</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Cash</td>
                            <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;"><?php echo formatCurrency($cash); ?></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Accounts Receivable</td>
                            <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;"><?php echo formatCurrency($accounts_receivable); ?></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600;">Total Current Assets</td>
                            <td style="text-align: right; padding: 8px 0; font-weight: 600; border-top: 2px solid #1e40af;"><?php echo formatCurrency($cash + $accounts_receivable); ?></td>
                        </tr>
                    </table>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="color: #3b82f6; margin-bottom: 10px; font-size: 16px;">Fixed Assets</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Property Value</td>
                            <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;"><?php echo formatCurrency($fixed_assets); ?></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600;">Total Fixed Assets</td>
                            <td style="text-align: right; padding: 8px 0; font-weight: 600; border-top: 2px solid #1e40af;"><?php echo formatCurrency($fixed_assets); ?></td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 3px solid #1e40af;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 12px 0; font-size: 18px; font-weight: 700; color: #1e40af;">TOTAL ASSETS</td>
                            <td style="text-align: right; padding: 12px 0; font-size: 18px; font-weight: 700; color: #1e40af;"><?php echo formatCurrency($total_assets); ?></td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- LIABILITIES & EQUITY -->
            <div>
                <h3 style="color: #dc2626; margin-bottom: 20px; font-size: 18px;">LIABILITIES</h3>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #ef4444; margin-bottom: 10px; font-size: 16px;">Current Liabilities</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Accounts Payable</td>
                            <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;"><?php echo formatCurrency($accounts_payable); ?></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600;">Total Liabilities</td>
                            <td style="text-align: right; padding: 8px 0; font-weight: 600; border-top: 2px solid #dc2626;"><?php echo formatCurrency($total_liabilities); ?></td>
                        </tr>
                    </table>
                </div>

                <h3 style="color: #059669; margin-top: 40px; margin-bottom: 20px; font-size: 18px;">EQUITY</h3>
                
                <div style="margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Retained Earnings</td>
                            <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;"><?php echo formatCurrency($retained_earnings); ?></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600;">Total Equity</td>
                            <td style="text-align: right; padding: 8px 0; font-weight: 600; border-top: 2px solid #059669;"><?php echo formatCurrency($total_equity); ?></td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 3px solid #dc2626;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 12px 0; font-size: 18px; font-weight: 700; color: #dc2626;">TOTAL LIABILITIES & EQUITY</td>
                            <td style="text-align: right; padding: 12px 0; font-size: 18px; font-weight: 700; color: #dc2626;"><?php echo formatCurrency($total_liabilities_equity); ?></td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>

        <?php if (abs($total_assets - $total_liabilities_equity) > 0.01): ?>
            <div style="margin-top: 30px; padding: 15px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b;">
                <strong>⚠️ Balance Sheet does not balance!</strong> Difference: <?php echo formatCurrency(abs($total_assets - $total_liabilities_equity)); ?>
            </div>
        <?php else: ?>
            <div style="margin-top: 30px; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; color: #166534;">
                <strong>✓ Balance Sheet is balanced!</strong>
            </div>
        <?php endif; ?>
    </div>
</div>

<div style="margin-top: 20px;">
    <a href="index.php" class="btn-link">← Back to Accounting</a>
</div>

<?php include '../includes/footer.php'; ?>

