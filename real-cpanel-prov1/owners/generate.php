<?php
/**
 * Generate Owner Payment Invoices
 * Creates recurring payment entries for all rental properties
 * Can be run manually or via cron
 */

require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if owner_payments table exists
$check_table = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_table = $check_table->num_rows > 0;

if (!$has_owner_table) {
    closeDBConnection($conn);
    die('Owner payments table not found. Please run the migration: <a href="../database/migrate_owner.php">Run Migration</a>');
}

require_once '../includes/recurring_owner_payments.php';

$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['generate'])) {
    $property_id = isset($_POST['property_id']) && $_POST['property_id'] != 'all' ? intval($_POST['property_id']) : null;
    
    if ($property_id) {
        // Generate for specific property
        $payments_created = generateRecurringOwnerPayments($property_id, $conn);
        $message = "Generated {$payments_created} payment(s) for the selected property.";
    } else {
        // Generate for all properties
        $payments_created = generateMonthlyOwnerPayments($user_id, $conn);
        $message = "Generated {$payments_created} payment(s) for all rental properties.";
    }
}

// Get properties with owners and formatted display names
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

if ($has_unit_fields) {
    $properties_query = "SELECT p.id, p.property_name, p.owner_name, p.monthly_rent_to_owner, 
                            p.parent_property_id, p.unit_name, parent.property_name as parent_property_name
                          FROM properties p
                          LEFT JOIN properties parent ON p.parent_property_id = parent.id
                          WHERE p.user_id = $user_id AND p.owner_name IS NOT NULL AND p.owner_name != '' AND p.monthly_rent_to_owner > 0
                          ORDER BY 
                            CASE 
                              WHEN p.parent_property_id IS NULL OR p.parent_property_id = 0 OR p.is_unit = 0 THEN 0 
                              ELSE 1 
                            END,
                            COALESCE(parent.property_name, p.property_name),
                            p.unit_name,
                            p.property_name";
} else {
    $properties_query = "SELECT id, property_name, owner_name, monthly_rent_to_owner
                          FROM properties 
                          WHERE user_id = $user_id AND owner_name IS NOT NULL AND owner_name != '' AND monthly_rent_to_owner > 0
                          ORDER BY property_name";
}

$properties_result = $conn->query($properties_query);
$properties_array = [];
if ($properties_result && $properties_result->num_rows > 0) {
    while ($row = $properties_result->fetch_assoc()) {
        // Format display name
        if ($has_unit_fields && !empty($row['parent_property_id']) && !empty($row['parent_property_name'])) {
            $unit_display = !empty($row['unit_name']) ? $row['unit_name'] : $row['property_name'];
            $row['display_name'] = $row['parent_property_name'] . ' - ' . $unit_display;
        } else {
            $row['display_name'] = $row['property_name'];
        }
        $properties_array[] = $row;
    }
}
$properties = $properties_result; // Keep for backward compatibility

closeDBConnection($conn);

$page_title = 'Generate Owner Payments';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Generate Owner Payment Invoices</h1>
    <a href="index.php" class="btn-link">← Back to Owner Payments</a>
</div>

<?php if ($message): ?>
    <div class="alert alert-success"><?php echo htmlspecialchars($message); ?></div>
<?php endif; ?>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-header">
        <h2>Generate Recurring Payments</h2>
    </div>
    <div class="card-body">
        <p>This will automatically create payment entries for the next 12 months for rental properties with owner rent configured.</p>
        
        <form method="POST" action="">
            <div class="form-group">
                <label for="property_id">Select Property</label>
                <select id="property_id" name="property_id">
                    <option value="all">All Rental Properties</option>
                    <?php foreach ($properties_array as $property): ?>
                        <option value="<?php echo $property['id']; ?>">
                            <?php echo htmlspecialchars($property['display_name']); ?> 
                            (<?php echo htmlspecialchars($property['owner_name']); ?> - <?php echo formatCurrency($property['monthly_rent_to_owner']); ?>/mo)
                        </option>
                    <?php endforeach; ?>
                </select>
                <small class="text-muted">Select a specific property or "All Rental Properties" to generate payments for all</small>
            </div>
            
            <div class="alert alert-info">
                <strong>Note:</strong> This will create payment entries for the next 12 months. Existing payments for the same month will not be duplicated.
            </div>
            
            <div class="form-actions">
                <button type="submit" name="generate" class="btn btn-primary">Generate Payments</button>
                <a href="index.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<div class="content-card" style="margin-top: 30px;">
    <div class="card-header">
        <h2>Rental Properties with Owner Rent</h2>
    </div>
    <div class="card-body">
        <?php if ($properties->num_rows > 0): ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Property</th>
                            <th>Owner</th>
                            <th>Monthly Rent</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php 
                        // Re-fetch properties to get fresh data
                        $conn2 = getDBConnection();
                        // Re-fetch with unit support
                        $check_unit2 = $conn2->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
                        $has_unit_fields2 = $check_unit2->num_rows > 0;
                        
                        if ($has_unit_fields2) {
                            $properties2_query = "SELECT p.id, p.property_name, p.owner_name, p.monthly_rent_to_owner, 
                                                    p.parent_property_id, p.unit_name, parent.property_name as parent_property_name
                                                  FROM properties p
                                                  LEFT JOIN properties parent ON p.parent_property_id = parent.id
                                                  WHERE p.user_id = $user_id AND p.owner_name IS NOT NULL AND p.owner_name != '' AND p.monthly_rent_to_owner > 0
                                                  ORDER BY 
                                                    CASE 
                                                      WHEN p.parent_property_id IS NULL OR p.parent_property_id = 0 OR p.is_unit = 0 THEN 0 
                                                      ELSE 1 
                                                    END,
                                                    COALESCE(parent.property_name, p.property_name),
                                                    p.unit_name,
                                                    p.property_name";
                        } else {
                            $properties2_query = "SELECT id, property_name, owner_name, monthly_rent_to_owner
                                                    FROM properties 
                                                    WHERE user_id = $user_id AND owner_name IS NOT NULL AND owner_name != '' AND monthly_rent_to_owner > 0
                                                    ORDER BY property_name";
                        }
                        $properties2 = $conn2->query($properties2_query);
                        $properties2_array = [];
                        if ($properties2 && $properties2->num_rows > 0) {
                            while ($row = $properties2->fetch_assoc()) {
                                if ($has_unit_fields2 && !empty($row['parent_property_id']) && !empty($row['parent_property_name'])) {
                                    $unit_display = !empty($row['unit_name']) ? $row['unit_name'] : $row['property_name'];
                                    $row['display_name'] = $row['parent_property_name'] . ' - ' . $unit_display;
                                } else {
                                    $row['display_name'] = $row['property_name'];
                                }
                                $properties2_array[] = $row;
                            }
                        }
                        
                        foreach ($properties2_array as $property): 
                            // Count existing payments
                            $existing_payments = $conn2->query("SELECT COUNT(*) as count FROM owner_payments 
                                WHERE property_id = {$property['id']} AND payment_month >= DATE_FORMAT(NOW(), '%Y-%m-01')")->fetch_assoc()['count'];
                        ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($property['display_name']); ?></strong></td>
                                <td><?php echo htmlspecialchars($property['owner_name']); ?></td>
                                <td><?php echo formatCurrency($property['monthly_rent_to_owner']); ?></td>
                                <td>
                                    <?php if ($existing_payments > 0): ?>
                                        <span class="badge badge-success"><?php echo $existing_payments; ?> payment(s) generated</span>
                                    <?php else: ?>
                                        <span class="badge badge-warning">No payments generated</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endwhile; 
                        closeDBConnection($conn2);
                        ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-muted">No rental properties found. Add owner information to properties to enable recurring owner payments.</p>
        <?php endif; ?>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
