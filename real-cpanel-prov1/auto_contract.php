<?php
// Redirect to new contracts system
require_once 'config/config.php';
requireLogin();
header('Location: ' . BASE_URL . '/contracts/index.php' . (!empty($_GET['tenant_id']) ? '?tenant_id=' . intval($_GET['tenant_id']) : ''));
exit();

$conn = getDBConnection();
$user_id = getCurrentUserId();

$error = '';
$tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;

// Get tenant details if tenant_id is provided
$tenant = null;
if ($tenant_id > 0) {
    $tenant = $conn->query("SELECT t.*, p.property_name, p.address, p.city, p.state, p.zip_code, p.property_type, p.bedrooms, p.bathrooms, p.square_feet,
        p.default_rent
        FROM tenants t
        INNER JOIN properties p ON t.property_id = p.id
        WHERE t.id = $tenant_id AND p.user_id = $user_id")->fetch_assoc();
}

// Get all tenants for dropdown
$tenants = $conn->query("SELECT t.id, t.first_name, t.last_name, p.property_name
    FROM tenants t
    INNER JOIN properties p ON t.property_id = p.id
    WHERE p.user_id = $user_id
    ORDER BY t.first_name, t.last_name");

closeDBConnection($conn);

$page_title = 'Lease Agreement Generator';
include 'includes/header.php';
?>

<div class="page-actions">
    <h1>Lease Agreement Generator</h1>
    <a href="tenants/index.php" class="btn-link">← Back to Tenants</a>
</div>

<?php if ($error): ?>
    <div class="alert alert-error"><?php echo $error; ?></div>
<?php endif; ?>

<div class="content-card">
    <div class="card-body">
        <form method="GET" action="" style="margin-bottom: 24px;">
            <div class="form-group">
                <label for="tenant_id">Select Tenant *</label>
                <select id="tenant_id" name="tenant_id" required onchange="this.form.submit()">
                    <option value="">Select a tenant...</option>
                    <?php while ($t = $tenants->fetch_assoc()): ?>
                        <option value="<?php echo $t['id']; ?>" <?php echo $tenant_id == $t['id'] ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($t['first_name'] . ' ' . $t['last_name'] . ' - ' . $t['property_name']); ?>
                        </option>
                    <?php endwhile; ?>
                </select>
                <small class="text-muted">Select a tenant to auto-fill their details in the contract</small>
            </div>
        </form>

        <?php if ($tenant): ?>
        <div id="contract-form" style="padding: 20px; background: white; border: 2px solid #e5e7eb; border-radius: 12px; max-width: 1200px; margin: 0 auto;">
            <h2 style="text-align: center; color: #1f2937; margin-bottom: 8px; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">LEASE AGREEMENT</h2>
            <p style="text-align: center; color: #6b7280; margin-bottom: 20px; font-size: 14px;">Agreement Date: <?php echo date('F j, Y'); ?></p>
            
            <div style="margin-bottom: 20px;">
                <p style="text-align: justify; line-height: 1.6; color: #374151; font-size: 14px;">
                    This Lease Agreement ("Lease") is entered into on <strong><?php echo date('F j, Y'); ?></strong>, by and between the parties set forth below:
                </p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px;">
                <!-- Left Column: Landlord and Tenant -->
                <div>
                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">LANDLORD/PROPERTY OWNER:</h3>
                        <div style="padding-left: 0;">
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Name:</strong> [LANDLORD NAME]</p>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Address:</strong> [LANDLORD ADDRESS]</p>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Phone:</strong> [LANDLORD PHONE]</p>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Email:</strong> [LANDLORD EMAIL]</p>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">TENANT:</h3>
                        <div style="padding-left: 0;">
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Name:</strong> <?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']); ?></p>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Phone:</strong> <?php echo htmlspecialchars($tenant['phone'] ?? '[Not provided]'); ?></p>
                            <?php if (!empty($tenant['email'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Email:</strong> <?php echo htmlspecialchars($tenant['email']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($tenant['alternate_phone'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Alternate Phone:</strong> <?php echo htmlspecialchars($tenant['alternate_phone']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($tenant['qatar_id'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Qatar ID Number:</strong> <?php echo htmlspecialchars($tenant['qatar_id']); ?></p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Property and Lease Terms -->
                <div>
                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">PROPERTY:</h3>
                        <div style="padding-left: 0;">
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Property Name:</strong> <?php echo htmlspecialchars($tenant['property_name']); ?></p>
                            <?php if (!empty($tenant['address'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Address:</strong> <?php echo htmlspecialchars($tenant['address']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($tenant['city'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>City:</strong> <?php echo htmlspecialchars($tenant['city']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($tenant['state'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>State:</strong> <?php echo htmlspecialchars($tenant['state']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($tenant['zip_code'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Zip Code:</strong> <?php echo htmlspecialchars($tenant['zip_code']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($tenant['property_type'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Property Type:</strong> <?php echo htmlspecialchars($tenant['property_type']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($tenant['bedrooms'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Bedrooms:</strong> <?php echo $tenant['bedrooms']; ?></p>
                            <?php endif; ?>
                            <?php if (!empty($tenant['bathrooms'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Bathrooms:</strong> <?php echo $tenant['bathrooms']; ?></p>
                            <?php endif; ?>
                            <?php if (!empty($tenant['square_feet'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Square Feet:</strong> <?php echo number_format($tenant['square_feet']); ?></p>
                            <?php endif; ?>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">LEASE TERMS:</h3>
                        <div style="padding-left: 0;">
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Lease Start Date:</strong> <?php echo $tenant['lease_start'] ? date('F j, Y', strtotime($tenant['lease_start'])) : '[Not specified]'; ?></p>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Lease End Date:</strong> <?php echo $tenant['lease_end'] ? date('F j, Y', strtotime($tenant['lease_end'])) : '[Not specified]'; ?></p>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Monthly Rent:</strong> $<?php echo number_format($tenant['monthly_rent'], 2); ?></p>
                            <?php if (!empty($tenant['security_deposit'])): ?>
                            <p style="margin-bottom: 4px; font-size: 14px;"><strong>Security Deposit:</strong> $<?php echo number_format($tenant['security_deposit'], 2); ?></p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 10px; text-transform: uppercase; font-weight: 600;">TERMS AND CONDITIONS:</h3>
                <div style="padding-left: 0; text-align: justify; line-height: 1.6;">
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>1. RENT PAYMENT:</strong> Tenant agrees to pay monthly rent of $<?php echo number_format($tenant['monthly_rent'], 2); ?> on or before the <?php echo date('j', strtotime($tenant['lease_start'] ?? 'now')); ?> day of each month. Late payments will incur a [LATE FEE] penalty.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>2. SECURITY DEPOSIT:</strong> <?php if (!empty($tenant['security_deposit'])): ?>A security deposit of $<?php echo number_format($tenant['security_deposit'], 2); ?> has been received and will be held as security for any damages or unpaid rent.<?php else: ?>[Security deposit terms to be specified]<?php endif; ?> The security deposit will be returned to Tenant within [RETURN PERIOD] after the termination of this lease, less any amounts owed for damages, unpaid rent, or cleaning expenses.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>3. USE OF PROPERTY:</strong> The property shall be used solely for residential purposes and shall not be used for any business, commercial, or illegal purposes. Tenant agrees not to sublet, assign, or make any alterations without Landlord's written consent. The property shall be occupied only by the Tenant(s) named in this agreement and their immediate family members.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>4. MAINTENANCE AND REPAIRS:</strong> Tenant agrees to maintain the property in good, clean, and habitable condition. Tenant shall promptly notify Landlord of any repairs or maintenance issues. Tenant is responsible for damage caused by negligence or misuse. Landlord is responsible for structural repairs and major appliance malfunctions.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>5. UTILITIES AND SERVICES:</strong> [Tenant/Landlord responsible for utilities - to be specified] Tenant is responsible for keeping all utility accounts in their name and ensuring uninterrupted service during the tenancy period.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>6. QUIET ENJOYMENT:</strong> Landlord agrees that Tenant shall peacefully and quietly have, hold, and enjoy the premises for the term of this lease, provided Tenant performs all covenants and conditions contained herein.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>7. PROPERTY ACCESS:</strong> Landlord may enter the premises at reasonable times after giving Tenant reasonable notice, except in cases of emergency. Landlord reserves the right to show the property to prospective tenants or buyers during the last [30] days of the lease term.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>8. PETS:</strong> [Pets are/are not allowed on the premises. If allowed, tenant must maintain a pet deposit of $[AMOUNT] and comply with all applicable pet regulations.]</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>9. INSURANCE:</strong> Landlord strongly recommends that Tenant obtain renter's insurance to protect their personal property. Landlord is not responsible for any loss or damage to Tenant's personal belongings.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>10. DEFAULT:</strong> If Tenant fails to pay rent when due, violates any terms of this agreement, or abandons the premises, Landlord may terminate this lease and pursue all legal remedies available under law.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>11. TERMINATION:</strong> Either party may terminate this lease by providing [NOTICE PERIOD] written notice before the end of the lease term. Upon termination, Tenant must vacate the premises, return all keys, and leave the property in the same condition as when received, ordinary wear and tear excepted.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>12. HOLDOVER:</strong> If Tenant remains in possession after the lease term expires without Landlord's consent, Tenant shall be deemed a month-to-month tenant at a rental rate of [HOLDOVER RATE] per month, subject to all other terms of this agreement.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>13. GOVERNING LAW:</strong> This agreement shall be governed by the laws of [STATE/JURISDICTION]. Any disputes arising from this lease shall be resolved in the courts of [STATE/JURISDICTION].</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>14. ENTIRE AGREEMENT:</strong> This lease constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. Any modifications must be in writing and signed by both parties.</p>
                    
                    <p style="margin-bottom: 8px; font-size: 14px;"><strong>15. SEVERABILITY:</strong> If any provision of this lease is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>
                </div>
            </div>

            <?php if (!empty($tenant['emergency_contact_name'])): ?>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">EMERGENCY CONTACT:</h3>
                <div style="padding-left: 0;">
                    <p style="margin-bottom: 4px; font-size: 14px;"><strong>Name:</strong> <?php echo htmlspecialchars($tenant['emergency_contact_name']); ?></p>
                    <p style="margin-bottom: 4px; font-size: 14px;"><strong>Phone:</strong> <?php echo htmlspecialchars($tenant['emergency_contact_phone']); ?></p>
                </div>
            </div>
            <?php endif; ?>

            <div style="margin-top: 20px; margin-bottom: 20px;">
                <p style="text-align: justify; line-height: 1.6; color: #374151; font-size: 14px; margin: 0;">
                    <strong>IMPORTANT NOTICE:</strong> This is a legally binding document. Both parties should read this agreement carefully before signing. Tenant acknowledges receipt of a copy of this lease agreement. Any questions regarding this lease should be directed to the Landlord before signing.
                </p>
            </div>

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
                                Tenant Signature<br>
                                <span style="font-size: 12px; color: #6b7280;">(<?php echo htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']); ?>)</span>
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

        <div style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" class="btn btn-primary">🖨️ Print Contract</button>
            <button onclick="downloadContract()" class="btn btn-success">💾 Download as PDF</button>
        </div>

        <style>
        @media print {
            .sidebar, .page-actions, .content-card .card-body form, button, .stats-grid, .app-container > aside, nav, header {
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
            #contract-form {
                border: none !important;
                padding: 20px !important;
                box-shadow: none !important;
                max-width: 100% !important;
                margin: 0 !important;
                page-break-after: auto;
            }
            #contract-form > div[style*="grid"] {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
        </style>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <script>
        function downloadContract() {
            const element = document.getElementById('contract-form');
            const opt = {
                margin: 0.5,
                filename: 'lease-agreement-<?php echo htmlspecialchars($tenant['first_name'] . '-' . $tenant['last_name']); ?>.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save();
        }
        </script>
        <?php else: ?>
        <div style="text-align: center; padding: 60px 20px;">
            <p class="text-muted" style="font-size: 18px;">Please select a tenant to generate their lease agreement</p>
        </div>
        <?php endif; ?>
    </div>
</div>

<?php include 'includes/footer.php'; ?>
