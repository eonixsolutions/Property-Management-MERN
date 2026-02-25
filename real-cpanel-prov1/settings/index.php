<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

$error = '';
$success = '';

// Get user settings
$settings = $conn->query("SELECT * FROM settings WHERE user_id = $user_id")->fetch_assoc();
if (!$settings) {
    // Create default settings with QAR currency
    $default_currency = 'QAR';
    $stmt_init = $conn->prepare("INSERT INTO settings (user_id, currency) VALUES (?, ?)");
    $stmt_init->bind_param("is", $user_id, $default_currency);
    $stmt_init->execute();
    $stmt_init->close();
    $settings = $conn->query("SELECT * FROM settings WHERE user_id = $user_id")->fetch_assoc();
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $currency = sanitizeInput($_POST['currency']);
    $date_format = sanitizeInput($_POST['date_format']);
    $timezone = sanitizeInput($_POST['timezone']);
    $notification_email = isset($_POST['notification_email']) ? 1 : 0;
    
    $stmt = $conn->prepare("UPDATE settings SET currency = ?, date_format = ?, timezone = ?, notification_email = ? WHERE user_id = ?");
    $stmt->bind_param("ssssi", $currency, $date_format, $timezone, $notification_email, $user_id);
    
    if ($stmt->execute()) {
        $success = 'Settings updated successfully!';
        $settings = $conn->query("SELECT * FROM settings WHERE user_id = $user_id")->fetch_assoc();
        // Update session currency
        $_SESSION['user_currency'] = $currency;
    } else {
        $error = 'Error updating settings. Please try again.';
    }
    
    $stmt->close();
}

closeDBConnection($conn);

$page_title = 'Settings';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Settings</h1>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<?php if ($success): ?>
    <div class="alert alert-success"><?php echo $success; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-header">
        <h2>General Settings</h2>
    </div>
    <div class="card-body">
        <form method="POST" action="">
            <div class="form-row">
                <div class="form-group">
                    <label for="currency">Currency</label>
                    <select id="currency" name="currency">
                        <option value="QAR" <?php echo ($settings['currency'] == 'QAR' || empty($settings['currency'])) ? 'selected' : ''; ?>>QAR (ر.ق) - Qatar Riyal</option>
                        <option value="SAR" <?php echo $settings['currency'] == 'SAR' ? 'selected' : ''; ?>>SAR (ر.س) - Saudi Riyal</option>
                        <option value="AED" <?php echo $settings['currency'] == 'AED' ? 'selected' : ''; ?>>AED (د.إ) - UAE Dirham</option>
                        <option value="BHD" <?php echo $settings['currency'] == 'BHD' ? 'selected' : ''; ?>>BHD (.د.ب) - Bahraini Dinar</option>
                        <option value="KWD" <?php echo $settings['currency'] == 'KWD' ? 'selected' : ''; ?>>KWD (د.ك) - Kuwaiti Dinar</option>
                        <option value="OMR" <?php echo $settings['currency'] == 'OMR' ? 'selected' : ''; ?>>OMR (ر.ع.) - Omani Rial</option>
                        <option value="USD" <?php echo $settings['currency'] == 'USD' ? 'selected' : ''; ?>>USD ($) - US Dollar</option>
                        <option value="EUR" <?php echo $settings['currency'] == 'EUR' ? 'selected' : ''; ?>>EUR (€) - Euro</option>
                        <option value="GBP" <?php echo $settings['currency'] == 'GBP' ? 'selected' : ''; ?>>GBP (£) - British Pound</option>
                        <option value="CAD" <?php echo $settings['currency'] == 'CAD' ? 'selected' : ''; ?>>CAD (C$) - Canadian Dollar</option>
                        <option value="AUD" <?php echo $settings['currency'] == 'AUD' ? 'selected' : ''; ?>>AUD (A$) - Australian Dollar</option>
                        <option value="JPY" <?php echo $settings['currency'] == 'JPY' ? 'selected' : ''; ?>>JPY (¥) - Japanese Yen</option>
                        <option value="INR" <?php echo $settings['currency'] == 'INR' ? 'selected' : ''; ?>>INR (₹) - Indian Rupee</option>
                        <option value="PKR" <?php echo $settings['currency'] == 'PKR' ? 'selected' : ''; ?>>PKR (₨) - Pakistani Rupee</option>
                        <option value="EGP" <?php echo $settings['currency'] == 'EGP' ? 'selected' : ''; ?>>EGP (E£) - Egyptian Pound</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="date_format">Date Format</label>
                    <select id="date_format" name="date_format">
                        <option value="Y-m-d" <?php echo $settings['date_format'] == 'Y-m-d' ? 'selected' : ''; ?>>YYYY-MM-DD</option>
                        <option value="m/d/Y" <?php echo $settings['date_format'] == 'm/d/Y' ? 'selected' : ''; ?>>MM/DD/YYYY</option>
                        <option value="d/m/Y" <?php echo $settings['date_format'] == 'd/m/Y' ? 'selected' : ''; ?>>DD/MM/YYYY</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="timezone">Timezone</label>
                <select id="timezone" name="timezone">
                    <option value="UTC" <?php echo $settings['timezone'] == 'UTC' ? 'selected' : ''; ?>>UTC</option>
                    <option value="America/New_York" <?php echo $settings['timezone'] == 'America/New_York' ? 'selected' : ''; ?>>Eastern Time</option>
                    <option value="America/Chicago" <?php echo $settings['timezone'] == 'America/Chicago' ? 'selected' : ''; ?>>Central Time</option>
                    <option value="America/Denver" <?php echo $settings['timezone'] == 'America/Denver' ? 'selected' : ''; ?>>Mountain Time</option>
                    <option value="America/Los_Angeles" <?php echo $settings['timezone'] == 'America/Los_Angeles' ? 'selected' : ''; ?>>Pacific Time</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" name="notification_email" value="1" <?php echo $settings['notification_email'] ? 'checked' : ''; ?>>
                    Enable Email Notifications
                </label>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Save Settings</button>
            </div>
        </form>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
