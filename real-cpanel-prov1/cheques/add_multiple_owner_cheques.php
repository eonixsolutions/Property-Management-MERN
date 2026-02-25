<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

// Check if owner_cheques table exists
$check_table = $conn->query("SHOW TABLES LIKE 'owner_cheques'");
$has_table = $check_table->num_rows > 0;

if (!$has_table) {
    closeDBConnection($conn);
    die('Cheque register table not found. Please run the migration: <a href="../database/migrate_cheque_register.php">Run Migration</a>');
}

$error = '';
$success = '';

// Check if owner_payments table exists
$check_owner_payments = $conn->query("SHOW TABLES LIKE 'owner_payments'");
$has_owner_payments = $check_owner_payments->num_rows > 0;

// Get properties with owners
$check_owner_fields = $conn->query("SHOW COLUMNS FROM properties LIKE 'owner_name'");
$has_owner_fields = $check_owner_fields->num_rows > 0;

// Get properties with additional fields and formatted display names
$check_unit = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit->num_rows > 0;

$additional_fields = $has_owner_fields ? 'p.owner_name, p.monthly_rent_to_owner' : '';
$where_clause = $has_owner_fields 
    ? "p.user_id = $user_id AND p.owner_name IS NOT NULL AND p.owner_name != '' AND p.monthly_rent_to_owner > 0"
    : "p.user_id = $user_id";

if ($has_unit_fields) {
    $properties_query = "SELECT p.id, p.property_name, p.parent_property_id, p.unit_name, 
                            parent.property_name as parent_property_name" . 
                            ($additional_fields ? ", " . $additional_fields : "") . "
                          FROM properties p
                          LEFT JOIN properties parent ON p.parent_property_id = parent.id
                          WHERE $where_clause
                          ORDER BY 
                            CASE 
                              WHEN p.parent_property_id IS NULL OR p.parent_property_id = 0 OR p.is_unit = 0 THEN 0 
                              ELSE 1 
                            END,
                            COALESCE(parent.property_name, p.property_name),
                            p.unit_name,
                            p.property_name";
} else {
    $properties_query = "SELECT p.id, p.property_name" . 
                        ($additional_fields ? ", " . $additional_fields : "") . "
                          FROM properties p
                          WHERE $where_clause
                          ORDER BY p.property_name";
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
$properties = $properties_result; // Keep for backward compatibility in while loops

// Get recent cheques for copy from dropdown
$recent_cheques = $conn->query("SELECT oc.id, oc.cheque_number, oc.cheque_amount, oc.cheque_date, oc.bank_name, p.property_name, p.owner_name
    FROM owner_cheques oc
    INNER JOIN properties p ON oc.property_id = p.id
    WHERE p.user_id = $user_id
    ORDER BY oc.created_at DESC
    LIMIT 20");

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $property_id = intval($_POST['property_id']);
    $cheque_amount = floatval($_POST['cheque_amount']);
    $bank_name = !empty($_POST['bank_name']) ? sanitizeInput($_POST['bank_name']) : null;
    $start_date = $_POST['start_date'];
    $num_cheques = intval($_POST['num_cheques']);
    $cheque_frequency = $_POST['cheque_frequency']; // 'monthly' or 'weekly'
    
    // Cheque number generation
    $cheque_mode = $_POST['cheque_mode'];
    $first_cheque_number = '';
    
    if ($cheque_mode == 'auto') {
        // Auto-generate sequential cheque numbers
        $last_cheque = $conn->query("SELECT cheque_number FROM owner_cheques oc
            INNER JOIN properties p ON oc.property_id = p.id
            WHERE p.user_id = $user_id
            ORDER BY CAST(SUBSTRING_INDEX(cheque_number, '-', -1) AS UNSIGNED) DESC
            LIMIT 1");
        
        if ($last_cheque && $last_cheque->num_rows > 0) {
            $last_cheque_row = $last_cheque->fetch_assoc();
            $last_num = intval(preg_replace('/[^0-9]/', '', substr($last_cheque_row['cheque_number'], -6)));
            $first_cheque_number = $last_num + 1;
        } else {
            $first_cheque_number = 1;
        }
    } elseif ($cheque_mode == 'copy_from') {
        $source_cheque_id = intval($_POST['source_cheque_id']);
        $source_cheque = $conn->query("SELECT oc.*, p.property_name, p.owner_name
            FROM owner_cheques oc
            INNER JOIN properties p ON oc.property_id = p.id
            WHERE oc.id = $source_cheque_id AND p.user_id = $user_id")->fetch_assoc();
        
        if ($source_cheque) {
            $property_id = $property_id ?: $source_cheque['property_id'];
            $cheque_amount = $cheque_amount ?: $source_cheque['cheque_amount'];
            $bank_name = $bank_name ?: $source_cheque['bank_name'];
        }
    }
    
    // Validate
    if (empty($cheque_amount) || empty($start_date) || $num_cheques < 1) {
        $error = 'Please fill in all required fields';
    } elseif ($cheque_mode == 'copy_from' && empty($source_cheque_id)) {
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
                $cheque_number = str_pad($first_cheque_number + $i, 6, '0', STR_PAD_LEFT);
            } elseif ($cheque_mode == 'copy_from') {
                $numeric_part = intval(preg_replace('/[^0-9]/', '', $source_cheque['cheque_number']));
                $cheque_number = str_pad($numeric_part + $i, 6, '0', STR_PAD_LEFT);
            }
            
            $cheque_date = $start_date_obj->format('Y-m-d');
            $issue_date = date('Y-m-d'); // Today
            
            // Insert cheque
            $stmt = $conn->prepare("INSERT INTO owner_cheques (user_id, property_id, cheque_number, bank_name, cheque_amount, cheque_date, issue_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Issued')");
            $stmt->bind_param("iissdss", $user_id, $property_id, $cheque_number, $bank_name, $cheque_amount, $cheque_date, $issue_date);
            
            if ($stmt->execute()) {
                $cheques_created++;
            }
            $stmt->close();
        }
        
        if ($cheques_created > 0) {
            header("Location: owners.php?added=$cheques_created");
            exit();
        } else {
            $error = 'Error creating cheques. Please try again.';
        }
    }
}

closeDBConnection($conn);

$page_title = 'Issue Multiple Owner Cheques';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Issue Multiple Owner Cheques</h1>
    <div>
        <a href="owners.php" class="btn-link">← Back to Owner Cheques</a>
        <a href="add_owner_cheque.php" class="btn-link">+ Issue Single Cheque</a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="POST" action="" id="chequeForm">
            <!-- Basic Info -->
            <div class="form-group">
                <label for="property_id">Property *</label>
                <select id="property_id" name="property_id" required>
                    <option value="">Select Property</option>
                    <?php foreach ($properties_array as $property): ?>
                        <option value="<?php echo $property['id']; ?>" data-owner-rent="<?php echo $property['monthly_rent_to_owner'] ?? 0; ?>">
                            <?php echo htmlspecialchars($property['display_name']); ?>
                            <?php if ($has_owner_fields && !empty($property['owner_name'])): ?>
                                (Owner: <?php echo htmlspecialchars($property['owner_name']); ?>)
                            <?php endif; ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cheque_amount">Cheque Amount *</label>
                    <input type="number" id="cheque_amount" name="cheque_amount" min="0" step="0.01" required>
                </div>
                
                <div class="form-group">
                    <label for="bank_name">Bank Name</label>
                    <input type="text" id="bank_name" name="bank_name" placeholder="e.g., Your Bank Name">
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
                        <input type="radio" name="cheque_mode" value="copy_from" onchange="toggleChequeModes()" style="margin-top: 4px; margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b; margin-bottom: 4px;">Copy from existing</div>
                            <div style="color: #64748b; font-size: 13px; line-height: 1.5;">Copy settings from previous cheque</div>
                        </div>
                    </label>
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
                                    data-property="<?php echo $cheque['id']; ?>"
                                    data-cheque-num="<?php echo htmlspecialchars($cheque['cheque_number']); ?>">
                                <?php echo htmlspecialchars($cheque['cheque_number'] . ' - ' . $cheque['property_name'] . ' (' . formatCurrency($cheque['cheque_amount']) . ')'); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                    <small class="text-muted">This will copy amount and bank name - only dates will be new</small>
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
                        <span style="margin-left: 8px;">Monthly</span>
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
                <a href="owners.php" class="btn">Cancel</a>
            </div>
        </form>
    </div>
</div>

<script>
function toggleChequeModes() {
    const mode = document.querySelector('input[name="cheque_mode"]:checked').value;
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

// Auto-fill amount based on property owner rent
document.getElementById('property_id').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const amountInput = document.getElementById('cheque_amount');
    
    if (selectedOption.value && selectedOption.dataset.ownerRent && selectedOption.dataset.ownerRent > 0 && !amountInput.value) {
        amountInput.value = selectedOption.dataset.ownerRent;
    }
});

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

