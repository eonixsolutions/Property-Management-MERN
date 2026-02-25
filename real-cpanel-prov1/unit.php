<?php
require_once 'config/database.php';

// Get unit ID from URL
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header('Location: landing.php');
    exit();
}

$unit_id = intval($_GET['id']);
$conn = getDBConnection();

// Check if unit fields exist
$check_unit_fields = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit_fields->num_rows > 0;

// Get unit details - only show vacant units
$query = "SELECT p.*, 
    parent.property_name as parent_property_name,
    parent.id as parent_id
    FROM properties p
    LEFT JOIN properties parent ON p.parent_property_id = parent.id
    WHERE p.id = $unit_id 
    AND p.status = 'Vacant'";

if ($has_unit_fields) {
    $query .= " AND (p.is_unit = 1 OR (p.parent_property_id IS NOT NULL AND p.parent_property_id <> 0))";
}

$unit_result = $conn->query($query);

if (!$unit_result || $unit_result->num_rows == 0) {
    header('Location: landing.php');
    exit();
}

$unit = $unit_result->fetch_assoc();

// Get unit images
$unit_images = [];
$check_images_table = $conn->query("SHOW TABLES LIKE 'property_images'");
if ($check_images_table->num_rows > 0) {
    $images_result = $conn->query("SELECT * FROM property_images WHERE property_id = $unit_id ORDER BY is_primary DESC, display_order ASC");
    if ($images_result && $images_result->num_rows > 0) {
        while ($image = $images_result->fetch_assoc()) {
            $unit_images[] = [
                'path' => $image['image_path'],
                'name' => $image['image_name'],
                'is_primary' => $image['is_primary']
            ];
        }
    }
}

// Prepare unit details
$rent_amount = $unit['default_rent'] ?? 0;
$bedrooms = $unit['bedrooms'] ?? 0;
$bathrooms = $unit['bathrooms'] ?? 0;
$square_feet = $unit['square_feet'] ?? null;
$unit_display_name = !empty($unit['unit_name']) ? $unit['unit_name'] : $unit['property_name'];
if (!empty($unit['parent_property_name'])) {
    $unit_display_name = $unit['parent_property_name'] . ' - ' . $unit_display_name;
}

// Get contact number
$contact_number = !empty($unit['contact_number']) ? $unit['contact_number'] : '';
$whatsapp_number = $contact_number ? preg_replace('/[^0-9]/', '', $contact_number) : '';
$call_number = $contact_number ? 'tel:' . urlencode($contact_number) : '';

// Share URL - build this first as we'll use it in WhatsApp message
$share_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];

// Build full image URL for Open Graph and WhatsApp - use primary image
$og_image_url = '';
$primary_image = null;
if (!empty($unit_images)) {
    // Find primary image or use first image
    foreach ($unit_images as $img) {
        if (isset($img['is_primary']) && $img['is_primary'] == 1) {
            $primary_image = $img;
            break;
        }
    }
    // If no primary image found, use first image
    if (!$primary_image && !empty($unit_images)) {
        $primary_image = $unit_images[0];
    }
    
    if ($primary_image) {
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
        $host = $_SERVER['HTTP_HOST'];
        // Get base path from current request URI to handle subdirectories
        $request_dir = dirname($_SERVER['REQUEST_URI']);
        // Normalize the path
        if ($request_dir === '.' || $request_dir === '\\' || $request_dir === '/') {
            $base_path = '/';
        } else {
            $base_path = rtrim($request_dir, '/') . '/';
        }
        $og_image_url = $protocol . "://" . $host . $base_path . ltrim($primary_image['path'], '/');
    }
}

// Build WhatsApp message with unit details
if ($whatsapp_number) {
    // Use the same image URL as og:image for consistency
    $image_url = $og_image_url;
    
    $safe_unit_name = str_replace(['*', '_', '~', '`'], '', $unit_display_name);
    $whatsapp_message = "Hello! I'm interested in this property:\n\n";
    $whatsapp_message .= "🏠 *" . $safe_unit_name . "*\n\n";
    $whatsapp_message .= "📍 Location: " . ($unit['address'] . ', ' . $unit['city']) . "\n";
    
    if ($bedrooms > 0) {
        $whatsapp_message .= "🛏️ Bedrooms: " . $bedrooms . "\n";
    }
    if ($bathrooms > 0) {
        $whatsapp_message .= "🚿 Bathrooms: " . $bathrooms . "\n";
    }
    if ($square_feet) {
        $whatsapp_message .= "📐 Size: " . number_format($square_feet) . " sq ft\n";
    }
    if (!empty($unit['property_type'])) {
        $whatsapp_message .= "🏢 Type: " . $unit['property_type'] . "\n";
    }
    
    $whatsapp_message .= "\n💰 Monthly Rent: " . number_format($rent_amount, 0) . " ر.ق\n\n";
    $whatsapp_message .= "Please let me know if this property is still available and when I can schedule a viewing. Thank you!\n\n";
    $whatsapp_message .= "View details: " . $share_url;
    
    // Add image URL to the message - WhatsApp will show preview
    if (!empty($image_url)) {
        $whatsapp_message .= "\n\n" . $image_url;
    }
    
    $whatsapp_url = 'https://wa.me/' . $whatsapp_number . '?text=' . urlencode($whatsapp_message);
} else {
    $whatsapp_url = '#';
}
$share_title = $unit_display_name . ' - ' . number_format($rent_amount, 0) . ' ر.ق/month';
$share_text = "Check out this property: " . $unit_display_name . " in " . $unit['city'];

closeDBConnection($conn);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($unit_display_name); ?> - Properties for Rent</title>
    <meta name="description" content="<?php echo htmlspecialchars($share_text); ?>">
    
    <!-- Open Graph / Facebook - For WhatsApp and social media previews -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="<?php echo htmlspecialchars($share_url); ?>">
    <meta property="og:title" content="<?php echo htmlspecialchars($share_title); ?>">
    <meta property="og:description" content="<?php echo htmlspecialchars($share_text); ?>">
    <?php if (!empty($og_image_url)): 
        // Detect image type from URL
        $image_ext = strtolower(pathinfo($og_image_url, PATHINFO_EXTENSION));
        $image_type = 'image/jpeg'; // default
        if ($image_ext == 'png') $image_type = 'image/png';
        elseif ($image_ext == 'gif') $image_type = 'image/gif';
        elseif ($image_ext == 'webp') $image_type = 'image/webp';
    ?>
    <meta property="og:image" content="<?php echo htmlspecialchars($og_image_url); ?>">
    <meta property="og:image:secure_url" content="<?php echo htmlspecialchars($og_image_url); ?>">
    <meta property="og:image:type" content="<?php echo $image_type; ?>">
    <meta property="og:image:alt" content="<?php echo htmlspecialchars($unit_display_name . ' - Property Photo'); ?>">
    <?php endif; ?>
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="<?php echo htmlspecialchars($share_url); ?>">
    <meta name="twitter:title" content="<?php echo htmlspecialchars($share_title); ?>">
    <meta name="twitter:description" content="<?php echo htmlspecialchars($share_text); ?>">
    <?php if (!empty($og_image_url)): ?>
    <meta name="twitter:image" content="<?php echo htmlspecialchars($og_image_url); ?>">
    <?php endif; ?>
    
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }

        /* Header */
        .main-header {
            background: #fff;
            border-bottom: 1px solid #e0e0e0;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .header-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 70px;
        }

        .logo {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a1a;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .nav-menu {
            display: flex;
            gap: 30px;
            align-items: center;
        }

        .nav-menu a {
            color: #333;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }

        .nav-menu a:hover {
            color: #4f46e5;
        }

        .btn-header {
            background: #4f46e5;
            color: white;
            padding: 8px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.2s;
        }

        .btn-header:hover {
            background: #4338ca;
        }

        /* Unit Detail Container */
        .unit-detail-container {
            max-width: 1200px;
            margin: 40px auto;
            padding: 0 20px;
        }

        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #4f46e5;
            text-decoration: none;
            margin-bottom: 20px;
            font-weight: 500;
        }

        .back-link:hover {
            text-decoration: underline;
        }

        .unit-detail-card {
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .unit-image-section {
            position: relative;
            width: 100%;
            height: 500px;
            background: #f0f0f0;
        }

        .unit-image-carousel {
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
        }

        .unit-image-slides {
            display: flex;
            transition: transform 0.3s ease;
            height: 100%;
        }

        .unit-image-slide {
            min-width: 100%;
            height: 100%;
        }

        .unit-image-slide img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .unit-image-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.9);
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            z-index: 10;
        }

        .unit-image-nav:hover {
            background: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .unit-image-nav.prev {
            left: 20px;
        }

        .unit-image-nav.next {
            right: 20px;
        }

        .unit-image-nav:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .unit-image-dots {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
            z-index: 10;
        }

        .unit-image-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: none;
            background: rgba(255,255,255,0.5);
            cursor: pointer;
            transition: all 0.2s;
        }

        .unit-image-dot.active {
            background: #fff;
            width: 24px;
            border-radius: 5px;
        }

        .unit-image-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 120px;
            background: #e5e7eb;
        }

        .unit-content-section {
            padding: 40px;
        }

        .unit-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 20px;
        }

        .unit-title-section h1 {
            font-size: 32px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 8px;
        }

        .unit-location {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #64748b;
            font-size: 16px;
            margin-bottom: 16px;
        }

        .unit-share-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .btn-share {
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .btn-share-primary {
            background: #4f46e5;
            color: white;
        }

        .btn-share-primary:hover {
            background: #4338ca;
        }

        .btn-share-whatsapp {
            background: #25D366;
            color: white;
        }

        .btn-share-whatsapp:hover {
            background: #20BA5A;
        }

        .btn-share-call {
            background: #10b981;
            color: white;
        }

        .btn-share-call:hover {
            background: #059669;
        }

        .btn-share-link {
            background: #f3f4f6;
            color: #333;
            border: 1px solid #e5e7eb;
        }

        .btn-share-link:hover {
            background: #e5e7eb;
        }

        .unit-features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
        }

        .unit-feature-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }

        .unit-feature-icon {
            font-size: 32px;
            margin-bottom: 8px;
        }

        .unit-feature-label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 4px;
        }

        .unit-feature-value {
            font-size: 20px;
            font-weight: 700;
            color: #1a1a1a;
        }

        .unit-price-card {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 32px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 32px;
        }

        .unit-price-label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 8px;
        }

        .unit-price-amount {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .unit-price-period {
            font-size: 16px;
            opacity: 0.9;
        }

        .unit-details-section {
            margin-top: 32px;
        }

        .unit-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 24px;
        }

        .unit-detail-item {
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
        }

        .unit-detail-label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 4px;
        }

        .unit-detail-value {
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
        }

        .footer {
            background: #1a1a1a;
            color: #fff;
            text-align: center;
            padding: 40px 20px;
            margin-top: 80px;
        }

        @media (max-width: 768px) {
            .unit-image-section {
                height: 300px;
            }
            
            .unit-content-section {
                padding: 24px;
            }
            
            .unit-title-section h1 {
                font-size: 24px;
            }
            
            .unit-price-amount {
                font-size: 36px;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="main-header">
        <div class="header-container">
            <a href="landing.php" class="logo">
                <span>🏠</span>
                <span>Real Estate</span>
            </a>
            <nav class="nav-menu">
                <a href="landing.php">Properties</a>
                <a href="auth/login.php">Login</a>
                <a href="auth/register.php" class="btn-header">Sign Up</a>
            </nav>
        </div>
    </header>

    <!-- Unit Detail -->
    <div class="unit-detail-container">
        <a href="landing.php" class="back-link">
            ← Back to Properties
        </a>

        <div class="unit-detail-card">
            <!-- Image Section -->
            <div class="unit-image-section">
                <?php if (!empty($unit_images)): ?>
                    <div class="unit-image-carousel" id="unitCarousel">
                        <div class="unit-image-slides" id="unitSlides">
                            <?php foreach ($unit_images as $index => $image): ?>
                                <div class="unit-image-slide">
                                    <img src="<?php echo htmlspecialchars($image['path']); ?>" 
                                         alt="<?php echo htmlspecialchars($image['name']); ?>" 
                                         loading="<?php echo $index === 0 ? 'eager' : 'lazy'; ?>"
                                         onerror="this.style.display='none';">
                                </div>
                            <?php endforeach; ?>
                        </div>
                        
                        <?php if (count($unit_images) > 1): ?>
                            <button class="unit-image-nav prev" onclick="slideUnitImage(-1)" id="prevBtn">‹</button>
                            <button class="unit-image-nav next" onclick="slideUnitImage(1)" id="nextBtn">›</button>
                            <div class="unit-image-dots" id="unitDots">
                                <?php for ($i = 0; $i < count($unit_images); $i++): ?>
                                    <button class="unit-image-dot <?php echo $i === 0 ? 'active' : ''; ?>" 
                                            onclick="goToUnitImage(<?php echo $i; ?>)" 
                                            aria-label="Go to image <?php echo $i + 1; ?>"></button>
                                <?php endfor; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php else: ?>
                    <div class="unit-image-placeholder">
                        <span>🏠</span>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Content Section -->
            <div class="unit-content-section">
                <div class="unit-header">
                    <div class="unit-title-section">
                        <h1><?php echo htmlspecialchars($unit_display_name); ?></h1>
                        <div class="unit-location">
                            <span>📍</span>
                            <span><?php echo htmlspecialchars($unit['address'] . ', ' . $unit['city']); ?></span>
                        </div>
                    </div>
                    <div class="unit-share-actions">
                        <?php if (!empty($contact_number)): ?>
                            <a href="<?php echo $whatsapp_url; ?>" target="_blank" class="btn-share btn-share-whatsapp">
                                📱 WhatsApp
                            </a>
                            <a href="<?php echo $call_number; ?>" class="btn-share btn-share-call">
                                📞 Call
                            </a>
                        <?php endif; ?>
                        <button onclick="shareUnit()" class="btn-share btn-share-link" id="shareBtn">
                            🔗 Share
                        </button>
                    </div>
                </div>

                <!-- Features -->
                <div class="unit-features-grid">
                    <?php if ($bedrooms > 0): ?>
                    <div class="unit-feature-card">
                        <div class="unit-feature-icon">🛏️</div>
                        <div class="unit-feature-label">Bedrooms</div>
                        <div class="unit-feature-value"><?php echo $bedrooms; ?></div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($bathrooms > 0): ?>
                    <div class="unit-feature-card">
                        <div class="unit-feature-icon">🚿</div>
                        <div class="unit-feature-label">Bathrooms</div>
                        <div class="unit-feature-value"><?php echo $bathrooms; ?></div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($square_feet): ?>
                    <div class="unit-feature-card">
                        <div class="unit-feature-icon">📐</div>
                        <div class="unit-feature-label">Size</div>
                        <div class="unit-feature-value"><?php echo number_format($square_feet); ?> sq ft</div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if (!empty($unit['property_type'])): ?>
                    <div class="unit-feature-card">
                        <div class="unit-feature-icon">🏢</div>
                        <div class="unit-feature-label">Type</div>
                        <div class="unit-feature-value"><?php echo htmlspecialchars($unit['property_type']); ?></div>
                    </div>
                    <?php endif; ?>
                </div>

                <!-- Price -->
                <div class="unit-price-card">
                    <div class="unit-price-label">Monthly Rent</div>
                    <div class="unit-price-amount">
                        <?php echo number_format($rent_amount, 0); ?> ر.ق
                    </div>
                    <div class="unit-price-period">per month</div>
                </div>

                <!-- Additional Details -->
                <?php if (!empty($unit['state']) || !empty($unit['zip_code']) || !empty($unit['notes'])): ?>
                <div class="unit-details-section">
                    <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 20px; color: #1a1a1a;">Property Details</h2>
                    <div class="unit-details-grid">
                        <?php if (!empty($unit['state'])): ?>
                        <div class="unit-detail-item">
                            <div class="unit-detail-label">State</div>
                            <div class="unit-detail-value"><?php echo htmlspecialchars($unit['state']); ?></div>
                        </div>
                        <?php endif; ?>
                        
                        <?php if (!empty($unit['zip_code'])): ?>
                        <div class="unit-detail-item">
                            <div class="unit-detail-label">Zip Code</div>
                            <div class="unit-detail-value"><?php echo htmlspecialchars($unit['zip_code']); ?></div>
                        </div>
                        <?php endif; ?>
                        
                        <?php if (!empty($unit['notes'])): ?>
                        <div class="unit-detail-item" style="grid-column: 1 / -1;">
                            <div class="unit-detail-label">Description</div>
                            <div class="unit-detail-value" style="white-space: pre-wrap;"><?php echo htmlspecialchars($unit['notes']); ?></div>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <p>&copy; <?php echo date('Y'); ?> Real Estate Management. All rights reserved.</p>
        </div>
    </footer>

    <script>
        let currentUnitImage = 0;
        const unitImages = <?php echo count($unit_images); ?>;
        
        function slideUnitImage(direction) {
            if (unitImages <= 1) return;
            
            currentUnitImage += direction;
            
            if (currentUnitImage < 0) {
                currentUnitImage = unitImages - 1;
            } else if (currentUnitImage >= unitImages) {
                currentUnitImage = 0;
            }
            
            goToUnitImage(currentUnitImage);
        }
        
        function goToUnitImage(index) {
            currentUnitImage = index;
            const slides = document.getElementById('unitSlides');
            if (slides) {
                slides.style.transform = `translateX(-${index * 100}%)`;
            }
            
            // Update dots
            const dots = document.querySelectorAll('.unit-image-dot');
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
            
            // Update nav buttons
            updateUnitImageNav();
        }
        
        function updateUnitImageNav() {
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            if (prevBtn) prevBtn.disabled = unitImages <= 1;
            if (nextBtn) nextBtn.disabled = unitImages <= 1;
        }
        
        // Share functionality
        async function shareUnit() {
            const shareData = {
                title: <?php echo json_encode($share_title); ?>,
                text: <?php echo json_encode($share_text); ?>,
                url: <?php echo json_encode($share_url); ?>
            };
            
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    // Fallback: copy to clipboard
                    await navigator.clipboard.writeText(shareData.url);
                    alert('Link copied to clipboard!');
                }
            } catch (err) {
                // Fallback: copy to clipboard
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(shareData.url);
                    alert('Link copied to clipboard!');
                } else {
                    // Final fallback: show URL
                    prompt('Copy this link:', shareData.url);
                }
            }
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            updateUnitImageNav();
            
            // Touch support for carousel
            if (unitImages > 1) {
                const carousel = document.getElementById('unitCarousel');
                let startX = 0;
                let currentX = 0;
                let isDragging = false;
                
                carousel.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    isDragging = true;
                });
                
                carousel.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    currentX = e.touches[0].clientX;
                });
                
                carousel.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    const diff = startX - currentX;
                    if (Math.abs(diff) > 50) {
                        slideUnitImage(diff > 0 ? 1 : -1);
                    }
                });
            }
        });
    </script>
</body>
</html>

