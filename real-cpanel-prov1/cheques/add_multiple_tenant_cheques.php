<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if tenant_cheques table exists
$check_table = $conn->query("SHOW TABLES LIKE 'tenant_cheques'");
$has_table = $check_table->num_rows > 0;

if (!$has_table) {
    closeDBConnection($conn);
    die('Cheque register table not found. Please run the migration: <a href="../database/migrate_cheque_register.php">Run Migration</a>');
}

$error = '';
$success = '';

// Get tenants for dropdown
$tenants = $conn->query("SELECT t.id, t.first_name, t.last_name, t.property_id, p.property_name, t.status
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE p.user_id = $user_id
    ORDER BY t.first_name, t.last_name");

// Get rent payments for linking
$rent_payments = $conn->query("SELECT rp.id, rp.amount, rp.due_date, t.first_name, t.last_name, p.property_name
    FROM rent_payments rp
    INNER JOIN tenants t ON rp.tenant_id = t.id
    INNER JOIN properties p ON rp.property_id = p.id
    WHERE p.user_id = $user_id AND rp.status = 'Pending'
    ORDER BY rp.due_date ASC");

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $tenant_id = intval($_POST['tenant_id']);
    $property_id = intval($_POST['property_id']);
    $cheque_amount = floatval($_POST['cheque_amount']);
    $bank_name = !empty($_POST['bank_name']) ? sanitizeInput($_POST['bank_name']) : null;
    $start_date = $_POST['start_date'];
    $num_cheques = intval($_POST['num_cheques']);
    $cheque_frequency = $_POST['cheque_frequency']; // 'monthly' or 'weekly'
    
    // If property_id is not set, get it from tenant
    if (($property_id <= 0) && $tenant_id > 0) {
        $tenant_info = $conn->query("SELECT property_id FROM tenants WHERE id = $tenant_id LIMIT 1");
        if ($tenant_info && $tenant_info->num_rows > 0) {
            $tenant_row = $tenant_info->fetch_assoc();
            $property_id = intval($tenant_row['property_id']);
        }
    }
    
    // Cheque number generation
    $cheque_mode = $_POST['cheque_mode']; // 'auto', 'manual_series', 'copy_from'
    $first_cheque_number = 0;
    $series_start = '';
    $source_cheque_id = 0;
    $source_cheque = null;
    
    if ($cheque_mode == 'auto') {
        // Auto-generate sequential cheque numbers
        // Get all cheque numbers for this tenant and find the highest numeric value
        if ($tenant_id > 0) {
            $cheques = $conn->query("SELECT cheque_number FROM tenant_cheques tc
                INNER JOIN properties p ON tc.property_id = p.id
                WHERE p.user_id = $user_id AND tc.tenant_id = $tenant_id");
            
            $max_num = 0;
            if ($cheques && $cheques->num_rows > 0) {
                while ($row = $cheques->fetch_assoc()) {
                    $cheque_num = $row['cheque_number'];
                    // Extract all numeric parts from cheque number
                    preg_match_all('/\d+/', $cheque_num, $matches);
                    if (!empty($matches[0])) {
                        // Get the largest numeric value from this cheque number
                        foreach ($matches[0] as $match) {
                            $num = intval($match);
                            if ($num > $max_num) {
                                $max_num = $num;
                            }
                        }
                    }
                }
            }
            $first_cheque_number = $max_num > 0 ? $max_num + 1 : 1;
        } else {
            $first_cheque_number = 1;
        }
    } elseif ($cheque_mode == 'manual_series') {
        $series_start = !empty($_POST['series_start']) ? sanitizeInput($_POST['series_start']) : '';
        // Extract numeric part for calculation
        if (is_numeric($series_start)) {
            $first_cheque_number = intval($series_start);
        } else {
            // If not purely numeric, extract the numeric part
            preg_match_all('/\d+/', $series_start, $matches);
            if (!empty($matches[0])) {
                $first_cheque_number = intval(end($matches[0]));
            } else {
                $first_cheque_number = 1;
            }
        }
    } elseif ($cheque_mode == 'copy_from') {
        $source_cheque_id = intval($_POST['source_cheque_id']);
        if ($source_cheque_id > 0) {
            $source_cheque = $conn->query("SELECT tc.*, t.first_name, t.last_name, p.property_name
                FROM tenant_cheques tc
                INNER JOIN tenants t ON tc.tenant_id = t.id
                INNER JOIN properties p ON tc.property_id = p.id
                WHERE tc.id = $source_cheque_id AND p.user_id = $user_id")->fetch_assoc();
            
            if ($source_cheque) {
                $tenant_id = $tenant_id ?: $source_cheque['tenant_id'];
                $property_id = $property_id ?: $source_cheque['property_id'];
                $cheque_amount = $cheque_amount ?: $source_cheque['cheque_amount'];
                $bank_name = $bank_name ?: $source_cheque['bank_name'];
            }
        }
    }
    
    // Validate
    if (empty($tenant_id) || $tenant_id <= 0) {
        $error = 'Please select a tenant';
    } elseif (empty($property_id) || $property_id <= 0) {
        $error = 'Please select a property';
    } elseif (empty($cheque_amount) || empty($start_date) || $num_cheques < 1) {
        $error = 'Please fill in all required fields';
    } elseif ($cheque_mode == 'manual_series' && empty($series_start)) {
        $error = 'Please enter starting cheque number';
    } elseif ($cheque_mode == 'copy_from' && (empty($source_cheque_id) || !$source_cheque)) {
        $error = 'Please select a source cheque to copy';
    } else {
        // Generate cheques
        $start_date_obj = new DateTime($start_date);
        $cheques_created = 0;
        
        for ($i = 0; $i < $num_cheques; $i++) {
            // Calculate cheque date based on frequency
            if ($i > 0) {
                if ($cheque_frequency == 'weekly') {
                    $start_date_obj->modify('+7 days');
                } else { // monthly
                    $start_date_obj->modify('+1 month');
                }
            }
            
            // Generate cheque number
            $cheque_number = '';
            if ($cheque_mode == 'auto') {
                // Auto-generate: simple numeric sequence
                $cheque_number = str_pad($first_cheque_number + $i, 6, '0', STR_PAD_LEFT);
            } elseif ($cheque_mode == 'manual_series') {
                // Manual series: preserve format if non-numeric, otherwise increment
                if (is_numeric($series_start)) {
                    // Pure numeric: simple increment with padding
                    $cheque_number = str_pad(intval($series_start) + $i, 6, '0', STR_PAD_LEFT);
                } else {
                    // Non-numeric format: find and increment the last numeric sequence
                    preg_match_all('/\d+/', $series_start, $matches, PREG_OFFSET_CAPTURE);
                    if (!empty($matches[0])) {
                        // Get the last numeric match
                        $last_match = end($matches[0]);
                        $base_num = intval($last_match[0]);
                        $match_offset = $last_match[1];
                        $match_length = strlen($last_match[0]);
                        $new_num = $base_num + $i;
                        
                        // Preserve the original padding/format of the number
                        $new_num_str = str_pad($new_num, $match_length, '0', STR_PAD_LEFT);
                        
                        // Replace the last numeric part
                        $cheque_number = substr_replace($series_start, $new_num_str, $match_offset, $match_length);
                    } else {
                        // No numeric part found: append number
                        $cheque_number = $series_start . '-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT);
                    }
                }
            } elseif ($cheque_mode == 'copy_from' && $source_cheque) {
                // Copy from: extract all numeric parts and increment (matches original behavior)
                $numeric_part = intval(preg_replace('/[^0-9]/', '', $source_cheque['cheque_number']));
                $cheque_number = str_pad($numeric_part + $i, 6, '0', STR_PAD_LEFT);
            }
            
            // Ensure cheque_number is not empty
            if (empty($cheque_number)) {
                $cheque_number = str_pad(1 + $i, 6, '0', STR_PAD_LEFT);
            }
            
            $cheque_date = $start_date_obj->format('Y-m-d');
            $deposit_date = $cheque_date; // Same as cheque date by default
            
            // Insert cheque
            $stmt = $conn->prepare("INSERT INTO tenant_cheques (user_id, tenant_id, property_id, cheque_number, bank_name, cheque_amount, cheque_date, deposit_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')");
            $stmt->bind_param("iiissdss", $user_id, $tenant_id, $property_id, $cheque_number, $bank_name, $cheque_amount, $cheque_date, $deposit_date);
            
            if ($stmt->execute()) {
                $cheques_created++;
            }
            $stmt->close();
        }
        
        if ($cheques_created > 0) {
            header("Location: tenants.php?added=$cheques_created");
            exit();
        } else {
            $error = 'Error creating cheques. Please try again.';
        }
    }
}

// Get recent cheques for copy from dropdown
$recent_cheques = $conn->query("SELECT tc.id, tc.cheque_number, tc.cheque_amount, tc.cheque_date, tc.bank_name, t.first_name, t.last_name, p.property_name
    FROM tenant_cheques tc
    INNER JOIN tenants t ON tc.tenant_id = t.id
    INNER JOIN properties p ON tc.property_id = p.id
    WHERE p.user_id = $user_id
    ORDER BY tc.created_at DESC
    LIMIT 20");

closeDBConnection($conn);

$page_title = 'Add Multiple Tenant Cheques';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Add Multiple Tenant Cheques</h1>
    <div>
        <a href="tenants.php" class="btn-link">← Back to Tenant Cheques</a>
        <a href="add_tenant_cheque.php" class="btn-link">+ Add Single Cheque</a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="" id="chequeForm">
            <!-- Basic Info -->
            <div class="form-row">
                <div class="form-group">
                    <label for="tenant_id">Tenant *</label>
                    <select id="tenant_id" name="tenant_id" required onchange="updatePropertyFromTenant()">
                        <option value="">Select Tenant</option>
                        <?php while ($tenant = $tenants->fetch_assoc()): ?>
                            <option value="<?php echo $tenant['id']; ?>" data-property-id="<?php echo $tenant['property_id']; ?>">
                                <?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name'] . ' - ' . $tenant['property_name']); ?>
                                <?php if ($tenant['status'] != 'Active'): ?>
                                    (<?php echo htmlspecialchars($tenant['status']); ?>)
                                <?php endif; ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                
            </div>
            
            <!-- Hidden property_id field populated from tenant selection -->
            <input type="hidden" id="property_id" name="property_id" value="">
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cheque_amount">Cheque Amount *</label>
                    <input type="number" id="cheque_amount" name="cheque_amount" min="0" step="0.01" required>
                </div>
                
                <div class="form-group">
                    <label for="bank_name">Bank Name</label>
                    <input type="text" id="bank_name" name="bank_name" placeholder="e.g., Qatar National Bank">
                </div>
            </div>
            
            <hr style="margin: 30px 0;">
            
            <!-- Cheque Generation Mode -->
            <div class="form-group">
                <label style="margin-bottom: 12px; font-size: 15px; font-weight: 600;">Cheque Number Generation *</label>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <label class="radio-option-card" style="display: flex; cursor: pointer; padding: 14px 16px; border: 2px solid #e2e8f0; border-radius: 10px; background: #ffffff; transition: all 0.2s;">
                        <input type="radio" name="cheque_mode" value="auto" checked onchange="toggleChequeModes()" style="margin-top: 4px; margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b; margin-bottom: 4px;">Auto-generate</div>
                            <div style="color: #64748b; font-size: 13px; line-height: 1.5;">Automatically generate sequential numbers starting from last cheque</div>
                        </div>
                    </label>
                    <label class="radio-option-card" style="display: flex; cursor: pointer; padding: 14px 16px; border: 2px solid #e2e8f0; border-radius: 10px; background: #ffffff; transition: all 0.2s;">
                        <input type="radio" name="cheque_mode" value="manual_series" onchange="toggleChequeModes()" style="margin-top: 4px; margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b; margin-bottom: 4px;">Series</div>
                            <div style="color: #64748b; font-size: 13px; line-height: 1.5;">Start from specific number (e.g., 123456)</div>
                        </div>
                    </label>
                    <label class="radio-option-card" style="display: flex; cursor: pointer; padding: 14px 16px; border: 2px solid #e2e8f0; border-radius: 10px; background: #ffffff; transition: all 0.2s;">
                        <input type="radio" name="cheque_mode" value="copy_from" onchange="toggleChequeModes()" style="margin-top: 4px; margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b; margin-bottom: 4px;">Copy from existing</div>
                            <div style="color: #64748b; font-size: 13px; line-height: 1.5;">Copy settings from previous cheque</div>
                        </div>
                    </label>
                </div>
            </div>
            
            <!-- Auto mode - nothing extra needed -->
            
            <!-- Manual series mode -->
            <div id="manual_series_fields" style="display: none;">
                <div class="form-group">
                    <label for="series_start">Starting Cheque Number</label>
                    <input type="text" id="series_start" name="series_start" placeholder="e.g., 123456">
                    <small class="text-muted">Starting number for the series (will auto-increment)</small>
                </div>
            </div>
            
            <!-- Copy mode -->
            <div id="copy_from_fields" style="display: none;">
                <div class="form-group">
                    <label for="source_cheque_id">Copy from Cheque</label>
                    <select id="source_cheque_id" name="source_cheque_id" onchange="copyChequeDetails()">
                        <option value="">Select a cheque to copy</option>
                        <?php while ($cheque = $recent_cheques->fetch_assoc()): ?>
                            <option value="<?php echo $cheque['id']; ?>"
                                    data-amount="<?php echo $cheque['cheque_amount']; ?>"
                                    data-bank="<?php echo htmlspecialchars($cheque['bank_name'] ?? ''); ?>"
                                    data-tenant="<?php echo $cheque['id']; ?>"
                                    data-property="<?php echo $cheque['id']; ?>"
                                    data-cheque-num="<?php echo htmlspecialchars($cheque['cheque_number']); ?>">
                                <?php echo htmlspecialchars($cheque['cheque_number'] . ' - ' . $cheque['first_name'] . ' ' . $cheque['last_name'] . ' (' . formatCurrency($cheque['cheque_amount']) . ')'); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                    <small class="text-muted">This will copy amount, bank name, and tenant - only dates will be new</small>
                </div>
            </div>
            
            <hr style="margin: 30px 0;">
            
            <!-- Frequency and dates -->
            <div class="form-row">
                <div class="form-group">
                    <label for="start_date">Start Date *</label>
                    <input type="date" id="start_date" name="start_date" required>
                    <small class="text-muted">Cheque date for first cheque</small>
                </div>
                
                <div class="form-group">
                    <label for="num_cheques">Number of Cheques *</label>
                    <input type="number" id="num_cheques" name="num_cheques" min="1" max="24" value="12" required>
                    <small class="text-muted">How many cheques to create</small>
                </div>
            </div>
            
            <div class="form-group">
                <label>Frequency *</label>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="cheque_frequency" value="monthly" checked>
                        <span style="margin-left: 8px;">Monthly (for yearly cheques)</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="cheque_frequency" value="weekly">
                        <span style="margin-left: 8px;">Weekly</span>
                    </label>
                </div>
            </div>
            
            <div class="alert alert-info" id="previewArea" style="display: none;">
                <strong>Preview:</strong> This will create cheques from <span id="previewStart"></span> to <span id="previewEnd"></span>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Create Cheques</button>
                <a href="tenants.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<script>
function toggleChequeModes() {
    const mode = document.querySelector('input[name="cheque_mode"]:checked').value;
    document.getElementById('manual_series_fields').style.display = mode == 'manual_series' ? 'block' : 'none';
    document.getElementById('copy_from_fields').style.display = mode == 'copy_from' ? 'block' : 'none';
}

function copyChequeDetails() {
    const select = document.getElementById('source_cheque_id');
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value) {
        const amount = selectedOption.dataset.amount;
        const bank = selectedOption.dataset.bank;
        
        if (amount && !document.getElementById('cheque_amount').value) {
            document.getElementById('cheque_amount').value = amount;
        }
        if (bank && !document.getElementById('bank_name').value) {
            document.getElementById('bank_name').value = bank;
        }
    }
}

function updatePropertyFromTenant() {
    const tenantSelect = document.getElementById('tenant_id');
    const propertyInput = document.getElementById('property_id');
    const selectedOption = tenantSelect.options[tenantSelect.selectedIndex];
    
    if (selectedOption && selectedOption.value) {
        const propertyId = selectedOption.getAttribute('data-property-id');
        if (propertyInput) {
            propertyInput.value = propertyId || '';
        }
    } else {
        if (propertyInput) {
            propertyInput.value = '';
        }
    }
}

// Preview dates
document.getElementById('start_date').addEventListener('change', updatePreview);
document.getElementById('num_cheques').addEventListener('change', updatePreview);
document.querySelectorAll('input[name="cheque_frequency"]').forEach(radio => {
    radio.addEventListener('change', updatePreview);
});

function updatePreview() {
    const startDate = document.getElementById('start_date').value;
    const numCheques = parseInt(document.getElementById('num_cheques').value) || 1;
    const frequency = document.querySelector('input[name="cheque_frequency"]:checked').value;
    
    if (!startDate || numCheques < 1) {
        document.getElementById('previewArea').style.display = 'none';
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(startDate);
    
    if (frequency == 'weekly') {
        end.setDate(end.getDate() + ((numCheques - 1) * 7));
    } else {
        end.setMonth(end.getMonth() + (numCheques - 1));
    }
    
    document.getElementById('previewStart').textContent = formatDate(start);
    document.getElementById('previewEnd').textContent = formatDate(end);
    document.getElementById('previewArea').style.display = 'block';
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Initialize
toggleChequeModes();

// Initialize property_id on page load if tenant is pre-selected
document.addEventListener('DOMContentLoaded', function() {
    updatePropertyFromTenant();
});

// Add hover and selected states for radio option cards
document.addEventListener('DOMContentLoaded', function() {
    const radioCards = document.querySelectorAll('.radio-option-card');
    const radioInputs = document.querySelectorAll('input[name="cheque_mode"]');
    
    // Update card styles based on selected state
    function updateCardStyles() {
        radioCards.forEach((card, index) => {
            const radio = radioInputs[index];
            if (radio && radio.checked) {
                card.style.borderColor = '#4f46e5';
                card.style.background = '#f0f9ff';
                card.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.1)';
            } else {
                card.style.borderColor = '#e2e8f0';
                card.style.background = '#ffffff';
                card.style.boxShadow = 'none';
            }
        });
    }
    
    // Update on change
    radioInputs.forEach(radio => {
        radio.addEventListener('change', updateCardStyles);
    });
    
    // Add hover effects
    radioCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (!card.querySelector('input').checked) {
                card.style.borderColor = '#cbd5e1';
                card.style.background = '#f8fafc';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (!card.querySelector('input').checked) {
                card.style.borderColor = '#e2e8f0';
                card.style.background = '#ffffff';
            }
        });
    });
    
    // Initial update
    updateCardStyles();
});
</script>

<?php include '../includes/footer.php'; ?>

