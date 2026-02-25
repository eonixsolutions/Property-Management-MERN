<?php
require_once '../config/config.php';
requireLogin();

$conn = getDBConnection();
$user_id = getCurrentUserId();

$error = '';
$success = '';
$tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
$contract_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Handle save
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['save_contract'])) {
    $tenant_id = intval($_POST['tenant_id']);
    $landlord_name = sanitizeInput($_POST['landlord_name']);
    $landlord_address = sanitizeInput($_POST['landlord_address']);
    $landlord_phone = sanitizeInput($_POST['landlord_phone']);
    $landlord_email = sanitizeInput($_POST['landlord_email']);
    
    $tenant_name = sanitizeInput($_POST['tenant_name']);
    $tenant_phone = sanitizeInput($_POST['tenant_phone']);
    $tenant_email = sanitizeInput($_POST['tenant_email']);
    $tenant_alternate_phone = sanitizeInput($_POST['tenant_alternate_phone']);
    $tenant_qatar_id = sanitizeInput($_POST['tenant_qatar_id']);
    
    $property_name = sanitizeInput($_POST['property_name']);
    $property_address = sanitizeInput($_POST['property_address']);
    $property_city = sanitizeInput($_POST['property_city']);
    $property_state = sanitizeInput($_POST['property_state']);
    $property_zip = sanitizeInput($_POST['property_zip']);
    $property_type = sanitizeInput($_POST['property_type']);
    $property_bedrooms = !empty($_POST['property_bedrooms']) ? intval($_POST['property_bedrooms']) : 0;
    $property_bathrooms = !empty($_POST['property_bathrooms']) ? floatval($_POST['property_bathrooms']) : 0;
    $property_square_feet = !empty($_POST['property_square_feet']) ? intval($_POST['property_square_feet']) : 0;
    
    $lease_start = sanitizeInput($_POST['lease_start']);
    $lease_end = sanitizeInput($_POST['lease_end']);
    $monthly_rent = !empty($_POST['monthly_rent']) ? floatval($_POST['monthly_rent']) : 0;
    $security_deposit = !empty($_POST['security_deposit']) ? floatval($_POST['security_deposit']) : 0;
    $late_fee = sanitizeInput($_POST['late_fee']);
    $return_period = sanitizeInput($_POST['return_period']);
    $notice_period = sanitizeInput($_POST['notice_period']);
    $holdover_rate = sanitizeInput($_POST['holdover_rate']);
    $pets_allowed = isset($_POST['pets_allowed']) ? 1 : 0;
    $pet_deposit = !empty($_POST['pet_deposit']) ? floatval($_POST['pet_deposit']) : 0;
    $utilities_responsible = sanitizeInput($_POST['utilities_responsible']);
    $governing_law = sanitizeInput($_POST['governing_law']);
    
    // Terms and conditions
    $terms_rent = sanitizeInput($_POST['terms_rent']);
    $terms_security = sanitizeInput($_POST['terms_security']);
    $terms_use = sanitizeInput($_POST['terms_use']);
    $terms_maintenance = sanitizeInput($_POST['terms_maintenance']);
    $terms_utilities = sanitizeInput($_POST['terms_utilities']);
    $terms_quiet = sanitizeInput($_POST['terms_quiet']);
    $terms_access = sanitizeInput($_POST['terms_access']);
    $terms_pets = sanitizeInput($_POST['terms_pets']);
    $terms_insurance = sanitizeInput($_POST['terms_insurance']);
    $terms_default = sanitizeInput($_POST['terms_default']);
    $terms_termination = sanitizeInput($_POST['terms_termination']);
    $terms_holdover = sanitizeInput($_POST['terms_holdover']);
    $terms_governing = sanitizeInput($_POST['terms_governing']);
    $terms_entire = sanitizeInput($_POST['terms_entire']);
    $terms_severability = sanitizeInput($_POST['terms_severability']);
    
    $agreement_date = sanitizeInput($_POST['agreement_date']);
    $emergency_contact_name = sanitizeInput($_POST['emergency_contact_name']);
    $emergency_contact_phone = sanitizeInput($_POST['emergency_contact_phone']);
    
    // Check if contracts table exists, if not create it
    $check_table = $conn->query("SHOW TABLES LIKE 'contracts'");
    if ($check_table->num_rows == 0) {
        $conn->query("CREATE TABLE IF NOT EXISTS contracts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            tenant_id INT,
            landlord_name VARCHAR(255),
            landlord_address TEXT,
            landlord_phone VARCHAR(20),
            landlord_email VARCHAR(255),
            tenant_name VARCHAR(255),
            tenant_phone VARCHAR(20),
            tenant_email VARCHAR(255),
            tenant_alternate_phone VARCHAR(20),
            tenant_qatar_id VARCHAR(20),
            property_name VARCHAR(255),
            property_address TEXT,
            property_city VARCHAR(100),
            property_state VARCHAR(100),
            property_zip VARCHAR(20),
            property_type VARCHAR(100),
            property_bedrooms INT DEFAULT 0,
            property_bathrooms DECIMAL(3,1) DEFAULT 0,
            property_square_feet INT DEFAULT 0,
            lease_start DATE,
            lease_end DATE,
            monthly_rent DECIMAL(10,2),
            security_deposit DECIMAL(10,2),
            late_fee VARCHAR(100),
            return_period VARCHAR(100),
            notice_period VARCHAR(100),
            holdover_rate VARCHAR(100),
            pets_allowed TINYINT(1) DEFAULT 0,
            pet_deposit DECIMAL(10,2),
            utilities_responsible VARCHAR(100),
            governing_law VARCHAR(255),
            terms_rent TEXT,
            terms_security TEXT,
            terms_use TEXT,
            terms_maintenance TEXT,
            terms_utilities TEXT,
            terms_quiet TEXT,
            terms_access TEXT,
            terms_pets TEXT,
            terms_insurance TEXT,
            terms_default TEXT,
            terms_termination TEXT,
            terms_holdover TEXT,
            terms_governing TEXT,
            terms_entire TEXT,
            terms_severability TEXT,
            agreement_date DATE,
            emergency_contact_name VARCHAR(100),
            emergency_contact_phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
        )");
    }
    
    if ($contract_id > 0) {
        // Update existing contract
        $stmt = $conn->prepare("UPDATE contracts SET 
            tenant_id = ?, landlord_name = ?, landlord_address = ?, landlord_phone = ?, landlord_email = ?,
            tenant_name = ?, tenant_phone = ?, tenant_email = ?, tenant_alternate_phone = ?, tenant_qatar_id = ?,
            property_name = ?, property_address = ?, property_city = ?, property_state = ?, property_zip = ?,
            property_type = ?, property_bedrooms = ?, property_bathrooms = ?, property_square_feet = ?,
            lease_start = ?, lease_end = ?, monthly_rent = ?, security_deposit = ?,
            late_fee = ?, return_period = ?, notice_period = ?, holdover_rate = ?,
            pets_allowed = ?, pet_deposit = ?, utilities_responsible = ?, governing_law = ?,
            terms_rent = ?, terms_security = ?, terms_use = ?, terms_maintenance = ?, terms_utilities = ?,
            terms_quiet = ?, terms_access = ?, terms_pets = ?, terms_insurance = ?, terms_default = ?,
            terms_termination = ?, terms_holdover = ?, terms_governing = ?, terms_entire = ?, terms_severability = ?,
            agreement_date = ?, emergency_contact_name = ?, emergency_contact_phone = ?
            WHERE id = ? AND user_id = ?");
        
        // 51 parameters for UPDATE
        $stmt->bind_param("isssssssssssssssidissddssssidssssssssssssssssssssii",
            $tenant_id, $landlord_name, $landlord_address, $landlord_phone, $landlord_email,
            $tenant_name, $tenant_phone, $tenant_email, $tenant_alternate_phone, $tenant_qatar_id,
            $property_name, $property_address, $property_city, $property_state, $property_zip,
            $property_type, $property_bedrooms, $property_bathrooms, $property_square_feet,
            $lease_start, $lease_end, $monthly_rent, $security_deposit,
            $late_fee, $return_period, $notice_period, $holdover_rate,
            $pets_allowed, $pet_deposit, $utilities_responsible, $governing_law,
            $terms_rent, $terms_security, $terms_use, $terms_maintenance, $terms_utilities,
            $terms_quiet, $terms_access, $terms_pets, $terms_insurance, $terms_default,
            $terms_termination, $terms_holdover, $terms_governing, $terms_entire, $terms_severability,
            $agreement_date, $emergency_contact_name, $emergency_contact_phone,
            $contract_id, $user_id
        );
    } else {
        // Insert new contract
        $stmt = $conn->prepare("INSERT INTO contracts (
            user_id, tenant_id, landlord_name, landlord_address, landlord_phone, landlord_email,
            tenant_name, tenant_phone, tenant_email, tenant_alternate_phone, tenant_qatar_id,
            property_name, property_address, property_city, property_state, property_zip,
            property_type, property_bedrooms, property_bathrooms, property_square_feet,
            lease_start, lease_end, monthly_rent, security_deposit,
            late_fee, return_period, notice_period, holdover_rate,
            pets_allowed, pet_deposit, utilities_responsible, governing_law,
            terms_rent, terms_security, terms_use, terms_maintenance, terms_utilities,
            terms_quiet, terms_access, terms_pets, terms_insurance, terms_default,
            terms_termination, terms_holdover, terms_governing, terms_entire, terms_severability,
            agreement_date, emergency_contact_name, emergency_contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        // 50 parameters for INSERT
        $stmt->bind_param("iisssssssssssssssidissddssssidssssssssssssssssssss",
            $user_id, $tenant_id, $landlord_name, $landlord_address, $landlord_phone, $landlord_email,
            $tenant_name, $tenant_phone, $tenant_email, $tenant_alternate_phone, $tenant_qatar_id,
            $property_name, $property_address, $property_city, $property_state, $property_zip,
            $property_type, $property_bedrooms, $property_bathrooms, $property_square_feet,
            $lease_start, $lease_end, $monthly_rent, $security_deposit,
            $late_fee, $return_period, $notice_period, $holdover_rate,
            $pets_allowed, $pet_deposit, $utilities_responsible, $governing_law,
            $terms_rent, $terms_security, $terms_use, $terms_maintenance, $terms_utilities,
            $terms_quiet, $terms_access, $terms_pets, $terms_insurance, $terms_default,
            $terms_termination, $terms_holdover, $terms_governing, $terms_entire, $terms_severability,
            $agreement_date, $emergency_contact_name, $emergency_contact_phone
        );
    }
    
    if ($stmt->execute()) {
        if ($contract_id == 0) {
            $contract_id = $conn->insert_id;
        }
        $success = 'Contract saved successfully!';
        header('Location: index.php?tenant_id=' . $tenant_id . '&id=' . $contract_id . '&saved=1');
        exit();
    } else {
        $error = 'Error saving contract: ' . $stmt->error;
    }
    $stmt->close();
}

// Get user details for landlord info
$user = $conn->query("SELECT first_name, last_name, email, phone FROM users WHERE id = $user_id")->fetch_assoc();
$user_name = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
$user_email = $user['email'] ?? '';
$user_phone = $user['phone'] ?? '';

// Get settings for currency
$settings = $conn->query("SELECT currency FROM settings WHERE user_id = $user_id")->fetch_assoc();
$currency = $settings['currency'] ?? 'QAR';
$currency_symbol = getCurrencySymbol($currency);

// Load existing contract or prepare for new
$contract = null;
if ($contract_id > 0) {
    $check_table = $conn->query("SHOW TABLES LIKE 'contracts'");
    if ($check_table->num_rows > 0) {
        $contract = $conn->query("SELECT * FROM contracts WHERE id = $contract_id AND user_id = $user_id")->fetch_assoc();
        if ($contract) {
            $tenant_id = $contract['tenant_id'];
        }
    }
}

// Get tenant details if tenant_id is provided
$tenant = null;
$tenant_data = null;
if ($tenant_id > 0) {
    $tenant = $conn->query("SELECT t.*, p.property_name, p.address, p.city, p.state, p.zip_code, p.property_type, p.bedrooms, p.bathrooms, p.square_feet
        FROM tenants t
        INNER JOIN properties p ON t.property_id = p.id
        WHERE t.id = $tenant_id AND p.user_id = $user_id")->fetch_assoc();
    
    if ($tenant) {
        $tenant_data = [
            'name' => trim($tenant['first_name'] . ' ' . $tenant['last_name']),
            'phone' => $tenant['phone'] ?? '',
            'email' => $tenant['email'] ?? '',
            'alternate_phone' => $tenant['alternate_phone'] ?? '',
            'qatar_id' => $tenant['qatar_id'] ?? '',
            'property_name' => $tenant['property_name'] ?? '',
            'property_address' => $tenant['address'] ?? '',
            'property_city' => $tenant['city'] ?? '',
            'property_state' => $tenant['state'] ?? '',
            'property_zip' => $tenant['zip_code'] ?? '',
            'property_type' => $tenant['property_type'] ?? '',
            'property_bedrooms' => $tenant['bedrooms'] ?? '',
            'property_bathrooms' => $tenant['bathrooms'] ?? '',
            'property_square_feet' => $tenant['square_feet'] ?? '',
            'lease_start' => $tenant['lease_start'] ?? '',
            'lease_end' => $tenant['lease_end'] ?? '',
            'monthly_rent' => $tenant['monthly_rent'] ?? 0,
            'security_deposit' => $tenant['security_deposit'] ?? 0,
            'emergency_contact_name' => $tenant['emergency_contact_name'] ?? '',
            'emergency_contact_phone' => $tenant['emergency_contact_phone'] ?? ''
        ];
    }
}

// Get all tenants for dropdown
$tenants = $conn->query("SELECT t.id, t.first_name, t.last_name, p.property_name
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE p.user_id = $user_id
    ORDER BY t.first_name, t.last_name");

closeDBConnection($conn);

$page_title = 'Lease Agreement Generator';
include '../includes/header.php';
?>

<div class="page-actions">
    <h1>Lease Agreement Generator</h1>
    <div>
        <a href="../tenants/index.php" class="btn-link">← Back to Tenants</a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<?php if ($success || isset($_GET['saved'])): ?>
    <div class="alert alert-success">Contract saved successfully!</div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="GET" action="" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <div class="form-group">
                <label for="tenant_id">Select Tenant *</label>
                <select id="tenant_id" name="tenant_id" required onchange="loadTenantData(this.value)" style="width: 100%;">
                    <option value="">Select a tenant...</option>
                    <?php while ($t = $tenants->fetch_assoc()): ?>
                        <option value="<?php echo $t['id']; ?>" <?php echo $tenant_id == $t['id'] ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($t['first_name'] . ' ' . $t['last_name'] . ' - ' . $t['property_name']); ?>
                        </option>
                    <?php endwhile; ?>
                </select>
                <small class="text-muted">Select a tenant to auto-fill their details in the contract</small>
            </div>
            <?php if ($contract_id > 0): ?>
                <input type="hidden" name="id" value="<?php echo $contract_id; ?>">
            <?php endif; ?>
        </form>

        <?php if ($tenant || $contract): ?>
        <form method="POST" action="" id="contract-form" onsubmit="return validateContract()">
            <input type="hidden" name="save_contract" value="1">
            <input type="hidden" name="tenant_id" id="form_tenant_id" value="<?php echo $tenant_id; ?>">
            <?php if ($contract_id > 0): ?>
                <input type="hidden" name="contract_id" value="<?php echo $contract_id; ?>">
            <?php endif; ?>
            
            <div id="contract-editor" style="padding: 20px; background: white; border: 2px solid #e5e7eb; border-radius: 12px; max-width: 1200px; margin: 0 auto;">
                <div style="margin-bottom: 20px; padding: 16px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
                    <h3 style="margin: 0 0 12px 0; color: #0369a1; font-size: 16px;">💡 Quick Actions</h3>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button type="button" onclick="autoFillFromTenant()" class="btn btn-primary" style="font-size: 14px;">🔄 Auto-Fill from Tenant</button>
                        <button type="button" onclick="fillDefaultTerms()" class="btn" style="font-size: 14px;">📝 Fill Default Terms</button>
                        <button type="submit" name="save_contract" class="btn btn-success" style="font-size: 14px;">💾 Save Contract</button>
                        <button type="button" onclick="previewContract()" class="btn" style="font-size: 14px;">👁️ Preview</button>
                        <button type="button" onclick="window.print()" class="btn" style="font-size: 14px;">🖨️ Print</button>
                        <button type="button" onclick="downloadContract()" class="btn btn-success" style="font-size: 14px;">📥 Download PDF</button>
                    </div>
                </div>
                
                <h2 style="text-align: center; color: #1f2937; margin-bottom: 8px; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">LEASE AGREEMENT</h2>
                <div style="text-align: center; margin-bottom: 20px;">
                    <input type="date" name="agreement_date" id="agreement_date" value="<?php echo $contract['agreement_date'] ?? date('Y-m-d'); ?>" style="padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                    <span id="agreement_date_display" style="color: #6b7280; margin-left: 8px; font-size: 14px;"></span>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <p style="text-align: justify; line-height: 1.6; color: #374151; font-size: 14px;">
                        This Lease Agreement ("Lease") is entered into on <strong id="agreement_date_text"><?php echo date('F j, Y'); ?></strong>, by and between the parties set forth below:
                    </p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px;">
                    <!-- Left Column: Landlord and Tenant -->
                    <div>
                        <div style="margin-bottom: 15px;">
                            <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">LANDLORD/PROPERTY OWNER:</h3>
                            <div style="padding-left: 0;">
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Name:</label>
                                    <input type="text" name="landlord_name" id="landlord_name" value="<?php echo htmlspecialchars($contract['landlord_name'] ?? $user_name); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Address:</label>
                                    <textarea name="landlord_address" id="landlord_address" rows="2" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;"><?php echo htmlspecialchars($contract['landlord_address'] ?? ''); ?></textarea>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Phone:</label>
                                    <input type="text" name="landlord_phone" id="landlord_phone" value="<?php echo htmlspecialchars($contract['landlord_phone'] ?? $user_phone); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Email:</label>
                                    <input type="email" name="landlord_email" id="landlord_email" value="<?php echo htmlspecialchars($contract['landlord_email'] ?? $user_email); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">TENANT:</h3>
                            <div style="padding-left: 0;">
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Name:</label>
                                    <input type="text" name="tenant_name" id="tenant_name" value="<?php echo htmlspecialchars($contract['tenant_name'] ?? $tenant_data['name'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Phone:</label>
                                    <input type="text" name="tenant_phone" id="tenant_phone" value="<?php echo htmlspecialchars($contract['tenant_phone'] ?? $tenant_data['phone'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Email:</label>
                                    <input type="email" name="tenant_email" id="tenant_email" value="<?php echo htmlspecialchars($contract['tenant_email'] ?? $tenant_data['email'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Alternate Phone:</label>
                                    <input type="text" name="tenant_alternate_phone" id="tenant_alternate_phone" value="<?php echo htmlspecialchars($contract['tenant_alternate_phone'] ?? $tenant_data['alternate_phone'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                                <?php if (!empty($tenant_data['qatar_id']) || !empty($contract['tenant_qatar_id'])): ?>
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Qatar ID Number:</label>
                                    <input type="text" name="tenant_qatar_id" id="tenant_qatar_id" value="<?php echo htmlspecialchars($contract['tenant_qatar_id'] ?? $tenant_data['qatar_id'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Property and Lease Terms -->
                    <div>
                        <div style="margin-bottom: 15px;">
                            <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">PROPERTY:</h3>
                            <div style="padding-left: 0;">
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Property Name:</label>
                                    <input type="text" name="property_name" id="property_name" value="<?php echo htmlspecialchars($contract['property_name'] ?? $tenant_data['property_name'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Address:</label>
                                    <input type="text" name="property_address" id="property_address" value="<?php echo htmlspecialchars($contract['property_address'] ?? $tenant_data['property_address'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">City:</label>
                                        <input type="text" name="property_city" id="property_city" value="<?php echo htmlspecialchars($contract['property_city'] ?? $tenant_data['property_city'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">State:</label>
                                        <input type="text" name="property_state" id="property_state" value="<?php echo htmlspecialchars($contract['property_state'] ?? $tenant_data['property_state'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Zip:</label>
                                        <input type="text" name="property_zip" id="property_zip" value="<?php echo htmlspecialchars($contract['property_zip'] ?? $tenant_data['property_zip'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Type:</label>
                                        <input type="text" name="property_type" id="property_type" value="<?php echo htmlspecialchars($contract['property_type'] ?? $tenant_data['property_type'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Bedrooms:</label>
                                        <input type="number" name="property_bedrooms" id="property_bedrooms" value="<?php echo htmlspecialchars($contract['property_bedrooms'] ?? $tenant_data['property_bedrooms'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Bathrooms:</label>
                                        <input type="number" step="0.1" name="property_bathrooms" id="property_bathrooms" value="<?php echo htmlspecialchars($contract['property_bathrooms'] ?? $tenant_data['property_bathrooms'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Square Feet:</label>
                                    <input type="number" name="property_square_feet" id="property_square_feet" value="<?php echo htmlspecialchars($contract['property_square_feet'] ?? $tenant_data['property_square_feet'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                </div>
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">LEASE TERMS:</h3>
                            <div style="padding-left: 0;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Lease Start:</label>
                                        <input type="date" name="lease_start" id="lease_start" value="<?php echo htmlspecialchars($contract['lease_start'] ?? $tenant_data['lease_start'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Lease End:</label>
                                        <input type="date" name="lease_end" id="lease_end" value="<?php echo htmlspecialchars($contract['lease_end'] ?? $tenant_data['lease_end'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Monthly Rent (<?php echo $currency_symbol; ?>):</label>
                                        <input type="number" step="0.01" name="monthly_rent" id="monthly_rent" value="<?php echo htmlspecialchars($contract['monthly_rent'] ?? $tenant_data['monthly_rent'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Security Deposit (<?php echo $currency_symbol; ?>):</label>
                                        <input type="number" step="0.01" name="security_deposit" id="security_deposit" value="<?php echo htmlspecialchars($contract['security_deposit'] ?? $tenant_data['security_deposit'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Late Fee:</label>
                                        <input type="text" name="late_fee" id="late_fee" value="<?php echo htmlspecialchars($contract['late_fee'] ?? ''); ?>" placeholder="e.g., $50 or 5%" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Return Period:</label>
                                        <input type="text" name="return_period" id="return_period" value="<?php echo htmlspecialchars($contract['return_period'] ?? '30 days'); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Notice Period:</label>
                                        <input type="text" name="notice_period" id="notice_period" value="<?php echo htmlspecialchars($contract['notice_period'] ?? '30 days'); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Holdover Rate:</label>
                                        <input type="text" name="holdover_rate" id="holdover_rate" value="<?php echo htmlspecialchars($contract['holdover_rate'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Utilities Responsible:</label>
                                        <select name="utilities_responsible" id="utilities_responsible" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                            <option value="Tenant" <?php echo ($contract['utilities_responsible'] ?? '') == 'Tenant' ? 'selected' : ''; ?>>Tenant</option>
                                            <option value="Landlord" <?php echo ($contract['utilities_responsible'] ?? '') == 'Landlord' ? 'selected' : ''; ?>>Landlord</option>
                                            <option value="Shared" <?php echo ($contract['utilities_responsible'] ?? '') == 'Shared' ? 'selected' : ''; ?>>Shared</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Governing Law:</label>
                                        <input type="text" name="governing_law" id="governing_law" value="<?php echo htmlspecialchars($contract['governing_law'] ?? 'Qatar'); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                </div>
                                <div style="display: flex; gap: 16px; margin-bottom: 8px; align-items: center;">
                                    <label style="font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 6px;">
                                        <input type="checkbox" name="pets_allowed" id="pets_allowed" value="1" <?php echo (!empty($contract['pets_allowed'])) ? 'checked' : ''; ?> style="width: auto;">
                                        Pets Allowed
                                    </label>
                                    <div style="flex: 1;">
                                        <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Pet Deposit (<?php echo $currency_symbol; ?>):</label>
                                        <input type="number" step="0.01" name="pet_deposit" id="pet_deposit" value="<?php echo htmlspecialchars($contract['pet_deposit'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Terms and Conditions - Editable -->
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 10px; text-transform: uppercase; font-weight: 600;">TERMS AND CONDITIONS:</h3>
                    <div style="padding-left: 0;">
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">1. RENT PAYMENT:</label>
                            <textarea name="terms_rent" id="terms_rent" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_rent'] ?? 'Tenant agrees to pay monthly rent on or before the due date. Late payments will incur a penalty as specified in the lease terms.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">2. SECURITY DEPOSIT:</label>
                            <textarea name="terms_security" id="terms_security" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_security'] ?? 'A security deposit has been received and will be held as security for any damages or unpaid rent. The security deposit will be returned to Tenant within the specified return period after the termination of this lease, less any amounts owed for damages, unpaid rent, or cleaning expenses.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">3. USE OF PROPERTY:</label>
                            <textarea name="terms_use" id="terms_use" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_use'] ?? 'The property shall be used solely for residential purposes and shall not be used for any business, commercial, or illegal purposes. Tenant agrees not to sublet, assign, or make any alterations without Landlord\'s written consent.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">4. MAINTENANCE AND REPAIRS:</label>
                            <textarea name="terms_maintenance" id="terms_maintenance" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_maintenance'] ?? 'Tenant agrees to maintain the property in good, clean, and habitable condition. Tenant shall promptly notify Landlord of any repairs or maintenance issues. Tenant is responsible for damage caused by negligence or misuse.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">5. UTILITIES AND SERVICES:</label>
                            <textarea name="terms_utilities" id="terms_utilities" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_utilities'] ?? 'Tenant is responsible for keeping all utility accounts in their name and ensuring uninterrupted service during the tenancy period.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">6. QUIET ENJOYMENT:</label>
                            <textarea name="terms_quiet" id="terms_quiet" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_quiet'] ?? 'Landlord agrees that Tenant shall peacefully and quietly have, hold, and enjoy the premises for the term of this lease, provided Tenant performs all covenants and conditions contained herein.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">7. PROPERTY ACCESS:</label>
                            <textarea name="terms_access" id="terms_access" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_access'] ?? 'Landlord may enter the premises at reasonable times after giving Tenant reasonable notice, except in cases of emergency. Landlord reserves the right to show the property to prospective tenants or buyers during the last 30 days of the lease term.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">8. PETS:</label>
                            <textarea name="terms_pets" id="terms_pets" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_pets'] ?? 'Pets are subject to Landlord approval. If allowed, tenant must maintain a pet deposit and comply with all applicable pet regulations.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">9. INSURANCE:</label>
                            <textarea name="terms_insurance" id="terms_insurance" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_insurance'] ?? 'Landlord strongly recommends that Tenant obtain renter\'s insurance to protect their personal property. Landlord is not responsible for any loss or damage to Tenant\'s personal belongings.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">10. DEFAULT:</label>
                            <textarea name="terms_default" id="terms_default" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_default'] ?? 'If Tenant fails to pay rent when due, violates any terms of this agreement, or abandons the premises, Landlord may terminate this lease and pursue all legal remedies available under law.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">11. TERMINATION:</label>
                            <textarea name="terms_termination" id="terms_termination" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_termination'] ?? 'Either party may terminate this lease by providing written notice before the end of the lease term. Upon termination, Tenant must vacate the premises, return all keys, and leave the property in the same condition as when received, ordinary wear and tear excepted.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">12. HOLDOVER:</label>
                            <textarea name="terms_holdover" id="terms_holdover" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_holdover'] ?? 'If Tenant remains in possession after the lease term expires without Landlord\'s consent, Tenant shall be deemed a month-to-month tenant at a rental rate as specified, subject to all other terms of this agreement.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">13. GOVERNING LAW:</label>
                            <textarea name="terms_governing" id="terms_governing" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_governing'] ?? 'This agreement shall be governed by the laws of the jurisdiction specified. Any disputes arising from this lease shall be resolved in the appropriate courts.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">14. ENTIRE AGREEMENT:</label>
                            <textarea name="terms_entire" id="terms_entire" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_entire'] ?? 'This lease constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. Any modifications must be in writing and signed by both parties.'); ?></textarea>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">15. SEVERABILITY:</label>
                            <textarea name="terms_severability" id="terms_severability" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; line-height: 1.5;"><?php echo htmlspecialchars($contract['terms_severability'] ?? 'If any provision of this lease is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.'); ?></textarea>
                        </div>
                    </div>
                </div>

                <!-- Emergency Contact -->
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">EMERGENCY CONTACT:</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Name:</label>
                            <input type="text" name="emergency_contact_name" id="emergency_contact_name" value="<?php echo htmlspecialchars($contract['emergency_contact_name'] ?? $tenant_data['emergency_contact_name'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Phone:</label>
                            <input type="text" name="emergency_contact_phone" id="emergency_contact_phone" value="<?php echo htmlspecialchars($contract['emergency_contact_phone'] ?? $tenant_data['emergency_contact_phone'] ?? ''); ?>" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                        </div>
                    </div>
                </div>

                <!-- Signatures -->
                <div style="margin-top: 30px;">
                    <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; text-transform: uppercase; font-weight: 600;">SIGNATURES:</h3>
                    <div style="margin-top: 40px;">
                        <div style="display: flex; justify-content: space-between;">
                            <div style="width: 45%;">
                                <p style="border-top: 2px solid #1f2937; padding-top: 8px; text-align: center; font-size: 14px;">
                                    Landlord Signature
                                </p>
                            </div>
                            <div style="width: 45%;">
                                <p style="border-top: 2px solid #1f2937; padding-top: 8px; text-align: center; font-size: 14px;">
                                    Tenant Signature
                                </p>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                            <div style="width: 45%;">
                                <p style="border-top: 2px solid #1f2937; padding-top: 8px; text-align: center; font-size: 14px;">
                                    Date
                                </p>
                            </div>
                            <div style="width: 45%;">
                                <p style="border-top: 2px solid #1f2937; padding-top: 8px; text-align: center; font-size: 14px;">
                                    Date
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
        <?php else: ?>
        <div style="text-align: center; padding: 60px 20px;">
            <p class="text-muted" style="font-size: 18px;">Please select a tenant to generate their lease agreement</p>
        </div>
        <?php endif; ?>
    </div>
</div>

<style>
@media print {
    .sidebar, .page-actions, .content-card .card-body > form:first-child, button, .stats-grid, .app-container > aside, nav, header,
    #contract-editor > div:first-child {
        display: none !important;
    }
    body {
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    .app-container {
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
    }
    .content-card {
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    #contract-editor {
        border: none !important;
        padding: 20px !important;
        box-shadow: none !important;
        max-width: 100% !important;
        margin: 0 !important;
        page-break-after: auto;
    }
    #contract-editor input, #contract-editor textarea, #contract-editor select {
        border: none !important;
        background: transparent !important;
        padding: 2px 0 !important;
        box-shadow: none !important;
    }
    #contract-editor > div[style*="grid"] {
        break-inside: avoid;
        page-break-inside: avoid;
    }
}

.contract-preview {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 9999;
    overflow-y: auto;
    padding: 20px;
}

.contract-preview.active {
    display: block;
}

.contract-preview-content {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 40px;
}
</style>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
// Tenant data for auto-fill
const tenantData = <?php echo json_encode($tenant_data ?? null); ?>;
const currencySymbol = '<?php echo $currency_symbol; ?>';

// Update agreement date display
function updateAgreementDate() {
    const dateInput = document.getElementById('agreement_date');
    const dateDisplay = document.getElementById('agreement_date_display');
    const dateText = document.getElementById('agreement_date_text');
    
    if (dateInput && dateInput.value) {
        const date = new Date(dateInput.value + 'T00:00:00');
        const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        if (dateDisplay) dateDisplay.textContent = formatted;
        if (dateText) dateText.textContent = formatted;
    }
}

document.getElementById('agreement_date')?.addEventListener('change', updateAgreementDate);
updateAgreementDate();

// Load tenant data when selected
function loadTenantData(tenantId) {
    if (!tenantId) return;
    window.location.href = 'index.php?tenant_id=' + tenantId;
}

// Auto-fill from tenant data
function autoFillFromTenant() {
    if (!tenantData) {
        alert('No tenant data available. Please select a tenant first.');
        return;
    }
    
    document.getElementById('tenant_name').value = tenantData.name || '';
    document.getElementById('tenant_phone').value = tenantData.phone || '';
    document.getElementById('tenant_email').value = tenantData.email || '';
    document.getElementById('tenant_alternate_phone').value = tenantData.alternate_phone || '';
    if (document.getElementById('tenant_qatar_id')) {
        document.getElementById('tenant_qatar_id').value = tenantData.qatar_id || '';
    }
    
    document.getElementById('property_name').value = tenantData.property_name || '';
    document.getElementById('property_address').value = tenantData.property_address || '';
    document.getElementById('property_city').value = tenantData.property_city || '';
    document.getElementById('property_state').value = tenantData.property_state || '';
    document.getElementById('property_zip').value = tenantData.property_zip || '';
    document.getElementById('property_type').value = tenantData.property_type || '';
    document.getElementById('property_bedrooms').value = tenantData.property_bedrooms || '';
    document.getElementById('property_bathrooms').value = tenantData.property_bathrooms || '';
    document.getElementById('property_square_feet').value = tenantData.property_square_feet || '';
    
    document.getElementById('lease_start').value = tenantData.lease_start || '';
    document.getElementById('lease_end').value = tenantData.lease_end || '';
    document.getElementById('monthly_rent').value = tenantData.monthly_rent || '';
    document.getElementById('security_deposit').value = tenantData.security_deposit || '';
    
    document.getElementById('emergency_contact_name').value = tenantData.emergency_contact_name || '';
    document.getElementById('emergency_contact_phone').value = tenantData.emergency_contact_phone || '';
    
    alert('Tenant details auto-filled successfully!');
}

// Fill default terms
function fillDefaultTerms() {
    const defaults = {
        terms_rent: `Tenant agrees to pay monthly rent of ${currencySymbol}[AMOUNT] on or before the [DAY] day of each month. Late payments will incur a penalty as specified.`,
        terms_security: `A security deposit of ${currencySymbol}[AMOUNT] has been received and will be held as security for any damages or unpaid rent. The security deposit will be returned to Tenant within 30 days after the termination of this lease, less any amounts owed for damages, unpaid rent, or cleaning expenses.`,
        terms_use: `The property shall be used solely for residential purposes and shall not be used for any business, commercial, or illegal purposes. Tenant agrees not to sublet, assign, or make any alterations without Landlord's written consent.`,
        terms_maintenance: `Tenant agrees to maintain the property in good, clean, and habitable condition. Tenant shall promptly notify Landlord of any repairs or maintenance issues. Tenant is responsible for damage caused by negligence or misuse.`,
        terms_utilities: `Tenant is responsible for keeping all utility accounts in their name and ensuring uninterrupted service during the tenancy period.`,
        terms_quiet: `Landlord agrees that Tenant shall peacefully and quietly have, hold, and enjoy the premises for the term of this lease, provided Tenant performs all covenants and conditions contained herein.`,
        terms_access: `Landlord may enter the premises at reasonable times after giving Tenant reasonable notice, except in cases of emergency. Landlord reserves the right to show the property to prospective tenants or buyers during the last 30 days of the lease term.`,
        terms_pets: `Pets are subject to Landlord approval. If allowed, tenant must maintain a pet deposit and comply with all applicable pet regulations.`,
        terms_insurance: `Landlord strongly recommends that Tenant obtain renter's insurance to protect their personal property. Landlord is not responsible for any loss or damage to Tenant's personal belongings.`,
        terms_default: `If Tenant fails to pay rent when due, violates any terms of this agreement, or abandons the premises, Landlord may terminate this lease and pursue all legal remedies available under law.`,
        terms_termination: `Either party may terminate this lease by providing 30 days written notice before the end of the lease term. Upon termination, Tenant must vacate the premises, return all keys, and leave the property in the same condition as when received, ordinary wear and tear excepted.`,
        terms_holdover: `If Tenant remains in possession after the lease term expires without Landlord's consent, Tenant shall be deemed a month-to-month tenant at a rental rate as specified, subject to all other terms of this agreement.`,
        terms_governing: `This agreement shall be governed by the laws of the jurisdiction specified. Any disputes arising from this lease shall be resolved in the appropriate courts.`,
        terms_entire: `This lease constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. Any modifications must be in writing and signed by both parties.`,
        terms_severability: `If any provision of this lease is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.`
    };
    
    Object.keys(defaults).forEach(key => {
        const element = document.getElementById(key);
        if (element && !element.value) {
            element.value = defaults[key];
        }
    });
    
    alert('Default terms filled!');
}

// Preview contract
function previewContract() {
    const editor = document.getElementById('contract-editor');
    const preview = document.getElementById('contract-preview');
    
    if (!preview) {
        const previewDiv = document.createElement('div');
        previewDiv.id = 'contract-preview';
        previewDiv.className = 'contract-preview';
        previewDiv.innerHTML = `
            <div style="position: sticky; top: 0; background: white; padding: 16px; border-bottom: 2px solid #e5e7eb; z-index: 10000;">
                <button onclick="closePreview()" style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Close Preview</button>
            </div>
            <div class="contract-preview-content" id="preview-content"></div>
        `;
        document.body.appendChild(previewDiv);
    }
    
    const previewContent = document.getElementById('preview-content');
    const editorClone = editor.cloneNode(true);
    
    // Remove input fields and show values
    editorClone.querySelectorAll('input, textarea, select').forEach(el => {
        const value = el.value || el.textContent;
        const span = document.createElement('span');
        span.textContent = value;
        span.style.display = 'inline-block';
        el.parentNode.replaceChild(span, el);
    });
    
    // Remove buttons
    editorClone.querySelectorAll('button').forEach(btn => btn.remove());
    
    previewContent.innerHTML = editorClone.innerHTML;
    document.getElementById('contract-preview').classList.add('active');
}

function closePreview() {
    document.getElementById('contract-preview')?.classList.remove('active');
}

// Download as PDF
function downloadContract() {
    const element = document.getElementById('contract-editor');
    const tenantName = document.getElementById('tenant_name')?.value || 'tenant';
    const filename = 'lease-agreement-' + tenantName.replace(/\s+/g, '-').toLowerCase() + '.pdf';
    
    const opt = {
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Hide input fields temporarily for PDF
    const inputs = element.querySelectorAll('input, textarea, select');
    const originalValues = [];
    inputs.forEach((input, index) => {
        originalValues[index] = {
            type: input.type || input.tagName,
            value: input.value,
            display: input.style.display
        };
        if (input.type === 'checkbox') {
            input.style.display = input.checked ? 'inline' : 'none';
        } else {
            const span = document.createElement('span');
            span.textContent = input.value || '';
            span.style.display = 'inline-block';
            input.parentNode.insertBefore(span, input);
            input.style.display = 'none';
        }
    });
    
    html2pdf().set(opt).from(element).save().then(() => {
        // Restore inputs
        inputs.forEach((input, index) => {
            const original = originalValues[index];
            input.style.display = original.display;
            const span = input.parentNode.querySelector('span');
            if (span && span.textContent === original.value) {
                span.remove();
            }
        });
    });
}

// Validate contract before save
function validateContract() {
    const tenantId = document.getElementById('form_tenant_id').value;
    if (!tenantId || tenantId == '0') {
        alert('Please select a tenant first.');
        return false;
    }
    
    const required = ['landlord_name', 'tenant_name', 'property_name', 'lease_start', 'lease_end', 'monthly_rent'];
    for (let field of required) {
        const el = document.getElementById(field);
        if (el && !el.value) {
            alert('Please fill in all required fields: ' + field);
            el.focus();
            return false;
        }
    }
    
    return true;
}
</script>

<?php include '../includes/footer.php'; ?>

