<?php
require_once '../config/config.php';
requireLogin();

$page_title = 'Accounting';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Accounting Module</h1>
</div>

<div class="dashboard-grid" style="margin-top: 30px;">
    <div class="content-card" style="cursor: pointer;" onclick="window.location.href='balance_sheet.php'">
        <div class="card-header">
            <h2>📊 Balance Sheet</h2>
        </div>
        <div class="card-body">
            <p>View assets, liabilities, and equity as of a specific date.</p>
            <p style="color: #64748b; font-size: 14px; margin-top: 10px;">Shows the financial position of your business</p>
        </div>
    </div>

    <div class="content-card" style="cursor: pointer;" onclick="window.location.href='profit_loss.php'">
        <div class="card-header">
            <h2>📈 Profit & Loss Statement</h2>
        </div>
        <div class="card-body">
            <p>View income, expenses, and net profit for a specific period.</p>
            <p style="color: #64748b; font-size: 14px; margin-top: 10px;">Shows profitability over time</p>
        </div>
    </div>

    <div class="content-card" style="cursor: pointer;" onclick="window.location.href='trial_balance.php'">
        <div class="card-header">
            <h2>⚖️ Trial Balance</h2>
        </div>
        <div class="card-body">
            <p>View all accounts with their debit and credit balances.</p>
            <p style="color: #64748b; font-size: 14px; margin-top: 10px;">Verifies that debits equal credits</p>
        </div>
    </div>
</div>

<?php include '../includes/footer.php'; ?>

