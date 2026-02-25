<?php
require_once 'config/database.php';

// Get database connection
$conn = getDBConnection();

// Get all vacant units/properties
// Check if unit fields exist
$check_unit_fields = $conn->query("SHOW COLUMNS FROM properties LIKE 'parent_property_id'");
$has_unit_fields = $check_unit_fields->num_rows > 0;

// Check if contact_number column exists and add it if not
$check_contact = $conn->query("SHOW COLUMNS FROM properties LIKE 'contact_number'");
if ($check_contact->num_rows == 0) {
    $conn->query("ALTER TABLE properties ADD COLUMN contact_number VARCHAR(20) DEFAULT NULL AFTER notes");
}

if ($has_unit_fields) {
    // Get only vacant units (exclude master properties)
    // Units are properties that have is_unit = 1 OR have a parent_property_id
    $query = "SELECT p.*, 
        parent.property_name as parent_property_name,
        parent.id as parent_id,
        (SELECT COUNT(*) FROM tenants WHERE property_id = p.id AND status = 'Active') as active_tenants
        FROM properties p
        LEFT JOIN properties parent ON p.parent_property_id = parent.id
        WHERE p.status = 'Vacant'
        AND (p.is_unit = 1 OR (p.parent_property_id IS NOT NULL AND p.parent_property_id <> 0))
        ORDER BY p.default_rent ASC, p.created_at DESC";
} else {
    // Fallback for older schema - get all vacant properties (no unit distinction)
    $query = "SELECT p.*, 
        (SELECT COUNT(*) FROM tenants WHERE property_id = p.id AND status = 'Active') as active_tenants
        FROM properties p
        WHERE p.status = 'Vacant'
        ORDER BY p.default_rent ASC, p.created_at DESC";
}

$vacant_units = $conn->query($query);

// Get filter options (only from units, not master properties)
if ($has_unit_fields) {
    $property_types = $conn->query("SELECT DISTINCT property_type FROM properties WHERE status = 'Vacant' AND property_type IS NOT NULL AND (is_unit = 1 OR (parent_property_id IS NOT NULL AND parent_property_id <> 0)) ORDER BY property_type");
    $cities = $conn->query("SELECT DISTINCT city FROM properties WHERE status = 'Vacant' AND city IS NOT NULL AND (is_unit = 1 OR (parent_property_id IS NOT NULL AND parent_property_id <> 0)) ORDER BY city");
    $bedrooms_list = $conn->query("SELECT DISTINCT bedrooms FROM properties WHERE status = 'Vacant' AND bedrooms IS NOT NULL AND bedrooms > 0 AND (is_unit = 1 OR (parent_property_id IS NOT NULL AND parent_property_id <> 0)) ORDER BY bedrooms ASC");
} else {
    $property_types = $conn->query("SELECT DISTINCT property_type FROM properties WHERE status = 'Vacant' AND property_type IS NOT NULL ORDER BY property_type");
    $cities = $conn->query("SELECT DISTINCT city FROM properties WHERE status = 'Vacant' AND city IS NOT NULL ORDER BY city");
    $bedrooms_list = $conn->query("SELECT DISTINCT bedrooms FROM properties WHERE status = 'Vacant' AND bedrooms IS NOT NULL AND bedrooms > 0 ORDER BY bedrooms ASC");
}

// Get search and filter parameters
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
$type_filter = isset($_GET['type']) ? $conn->real_escape_string($_GET['type']) : '';
$city_filter = isset($_GET['city']) ? $conn->real_escape_string($_GET['city']) : '';
$beds_filter = isset($_GET['beds']) ? intval($_GET['beds']) : '';
$min_rent = isset($_GET['min_rent']) ? floatval($_GET['min_rent']) : '';
$max_rent = isset($_GET['max_rent']) ? floatval($_GET['max_rent']) : '';

// Filter units based on search criteria
$filtered_units = [];
while ($unit = $vacant_units->fetch_assoc()) {
    $match = true;
    
    if (!empty($search)) {
        $search_lower = strtolower($search);
        $unit_name = strtolower($unit['property_name'] . ' ' . ($unit['unit_name'] ?? ''));
        $address = strtolower($unit['address'] . ' ' . $unit['city']);
        if (strpos($unit_name, $search_lower) === false && strpos($address, $search_lower) === false) {
            $match = false;
        }
    }
    
    if (!empty($type_filter) && $unit['property_type'] != $type_filter) {
        $match = false;
    }
    
    if (!empty($city_filter) && $unit['city'] != $city_filter) {
        $match = false;
    }
    
    if (!empty($beds_filter) && ($unit['bedrooms'] ?? 0) != $beds_filter) {
        $match = false;
    }
    
    if (!empty($min_rent) && ($unit['default_rent'] ?? 0) < $min_rent) {
        $match = false;
    }
    
    if (!empty($max_rent) && ($unit['default_rent'] ?? 0) > $max_rent) {
        $match = false;
    }
    
    if ($match) {
        $filtered_units[] = $unit;
    }
}

// Reset query for display
$vacant_units->data_seek(0);

// Fetch all images for all filtered units (for carousel)
$unit_images = [];
if (count($filtered_units) > 0) {
    // Check if property_images table exists
    $check_images_table = $conn->query("SHOW TABLES LIKE 'property_images'");
    if ($check_images_table->num_rows > 0) {
        // Get property IDs from filtered units
        $property_ids = array_map(function($unit) {
            return intval($unit['id']);
        }, $filtered_units);
        
        if (!empty($property_ids)) {
            $ids_string = implode(',', $property_ids);
            // Get ALL images for these properties, ordered by primary first, then display_order
            $images_query = "SELECT property_id, image_path, image_name, is_primary, display_order
                           FROM property_images 
                           WHERE property_id IN ($ids_string) 
                           ORDER BY property_id, is_primary DESC, display_order ASC";
            $images_result = $conn->query($images_query);
            
            if ($images_result && $images_result->num_rows > 0) {
                while ($image = $images_result->fetch_assoc()) {
                    $prop_id = $image['property_id'];
                    if (!isset($unit_images[$prop_id])) {
                        $unit_images[$prop_id] = [];
                    }
                    $unit_images[$prop_id][] = [
                        'path' => $image['image_path'],
                        'name' => $image['image_name'],
                        'is_primary' => $image['is_primary']
                    ];
                }
            }
        }
    }
}

closeDBConnection($conn);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Properties for Rent - Real Estate</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f9fafb;
            color: #111827;
        }

        /* Header - Qatar Living Style */
        .main-header {
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .header-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 64px;
        }

        .logo {
            font-size: 20px;
            font-weight: 700;
            color: #1a1a1a;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .nav-menu {
            display: flex;
            gap: 24px;
            align-items: center;
        }

        .nav-menu a {
            color: #374151;
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            transition: color 0.2s;
        }

        .nav-menu a:hover {
            color: #4f46e5;
        }

        .btn-header {
            padding: 8px 20px;
            background: #4f46e5;
            color: white;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 13px;
            transition: background 0.2s;
        }

        .btn-header:hover {
            background: #4338ca;
        }

        /* Tab Navigation - Qatar Living Style */
        .tabs-section {
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
        }

        .tabs-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
        }

        .tabs-nav {
            display: flex;
            gap: 0;
            border-bottom: 2px solid transparent;
        }

        .tab-button {
            padding: 16px 24px;
            background: none;
            border: none;
            font-size: 15px;
            font-weight: 600;
            color: #6b7280;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            position: relative;
            top: 2px;
            font-family: inherit;
        }

        .tab-button:hover {
            color: #374151;
        }

        .tab-button.active {
            color: #4f46e5;
            border-bottom-color: #4f46e5;
        }

        /* Filters Section - Qatar Living Style */
        .filters-section {
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
            padding: 16px 0;
        }

        .filters-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
        }

        .filters-form {
            display: grid;
            grid-template-columns: 2fr 1.2fr 1fr 1fr 1.2fr auto;
            gap: 12px;
            align-items: end;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
        }

        .filter-group label {
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 6px;
            text-transform: none;
            letter-spacing: 0;
        }

        .filter-group select,
        .filter-group input {
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            background: #fff;
            color: #111827;
            transition: all 0.2s;
            width: 100%;
            height: 42px;
        }

        .filter-group select:focus,
        .filter-group input:focus {
            outline: none;
            border-color: #4f46e5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .filter-group input[type="text"] {
            padding: 10px 12px;
        }

        .filter-group select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
            cursor: pointer;
        }

        .btn-filter {
            padding: 10px 24px;
            background: #4f46e5;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
            white-space: nowrap;
            height: 42px;
        }

        .btn-filter:hover {
            background: #4338ca;
        }

        .btn-clear {
            padding: 10px 16px;
            background: #f9fafb;
            color: #6b7280;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-weight: 500;
            font-size: 13px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.2s;
            height: 42px;
        }

        .btn-clear:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
        }

        /* Properties Grid - Qatar Living Style */
        .properties-section {
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px 20px;
            background: #f9fafb;
        }

        .properties-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .properties-header h2 {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
        }

        .properties-count {
            font-size: 14px;
            color: #6b7280;
        }

        .properties-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        /* Property Card - Qatar Living Style */
        .property-card {
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            cursor: pointer;
            border: 1px solid #e5e7eb;
        }

        .property-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateY(-2px);
            border-color: #d1d5db;
        }

        .property-image {
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            position: relative;
            overflow: hidden;
        }

        .property-carousel {
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
        }

        .property-carousel.has-multiple {
            cursor: grab;
        }

        .property-carousel.has-multiple:active {
            cursor: grabbing;
        }

        .property-carousel-slides {
            display: flex;
            width: 100%;
            height: 100%;
            transition: transform 0.4s ease-in-out;
        }

        .property-carousel-slide {
            min-width: 100%;
            height: 100%;
            flex-shrink: 0;
        }

        .property-carousel-slide img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .property-carousel-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.9);
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: #333;
            transition: all 0.2s;
            z-index: 2;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .property-carousel-nav:hover {
            background: rgba(255, 255, 255, 1);
            box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }

        .property-carousel-nav.prev {
            left: 8px;
        }

        .property-carousel-nav.next {
            right: 8px;
        }

        .property-carousel-nav:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .property-carousel-dots {
            position: absolute;
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 6px;
            z-index: 2;
        }

        .property-carousel-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            padding: 0;
        }

        .property-carousel-dot.active {
            background: rgba(255, 255, 255, 1);
            width: 24px;
            border-radius: 4px;
        }

        .property-image-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            font-size: 64px;
            color: white;
        }

        .property-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(16, 185, 129, 0.95);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            z-index: 3;
            pointer-events: none;
        }

        .property-content {
            padding: 16px;
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .property-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 6px;
            line-height: 1.4;
        }

        .property-location {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #6b7280;
            font-size: 13px;
            margin-bottom: 12px;
        }

        .property-features {
            display: flex;
            gap: 16px;
            padding: 12px 0;
            border-top: 1px solid #f3f4f6;
            border-bottom: 1px solid #f3f4f6;
            margin-bottom: 12px;
        }

        .property-feature {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            color: #6b7280;
        }

        .property-feature-icon {
            font-size: 16px;
        }

        .property-price {
            margin-top: auto;
        }

        .property-price-label {
            font-size: 11px;
            color: #9ca3af;
            text-transform: none;
            letter-spacing: 0;
            margin-bottom: 2px;
        }

        .property-price-amount {
            font-size: 24px;
            font-weight: 700;
            color: #10b981;
            margin-bottom: 2px;
        }

        .property-price-period {
            font-size: 12px;
            color: #9ca3af;
        }

        .property-actions {
            display: flex;
            gap: 6px;
            margin-top: 12px;
            flex-wrap: wrap;
        }
        
        .property-actions .btn-property {
            min-width: 0;
            flex: 1 1 auto;
        }
        
        .property-actions .btn-property-primary {
            flex: 1 1 120px;
        }

        .btn-property {
            flex: 1;
            padding: 8px 14px;
            border-radius: 6px;
            text-decoration: none;
            text-align: center;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
            font-family: inherit;
        }

        .btn-property-primary {
            background: #4f46e5;
            color: white;
        }

        .btn-property-primary:hover {
            background: #4338ca;
        }

        .btn-property-secondary {
            background: #f5f5f5;
            color: #333;
            border: 1px solid #ddd;
        }

        .btn-property-secondary:hover {
            background: #e5e5e5;
        }


        .btn-property-whatsapp {
            background: #25D366;
            color: white;
        }

        .btn-property-whatsapp:hover {
            background: #20BA5A;
        }

        .btn-property-call {
            background: #10b981;
            color: white;
        }

        .btn-property-call:hover {
            background: #059669;
        }

        /* No Results */
        .no-results {
            text-align: center;
            padding: 80px 20px;
            background: #fff;
            border-radius: 8px;
        }

        .no-results-icon {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.5;
        }

        .no-results h3 {
            font-size: 24px;
            color: #1a1a1a;
            margin-bottom: 12px;
        }

        .no-results p {
            font-size: 16px;
            color: #666;
        }

        /* Footer */
        .footer {
            background: #1a1a1a;
            color: #fff;
            padding: 40px 20px;
            text-align: center;
            margin-top: 60px;
        }

        .footer-content {
            max-width: 1400px;
            margin: 0 auto;
        }

        /* Responsive - Qatar Living Style */
        @media (max-width: 1200px) {
            .filters-form {
                grid-template-columns: 1fr 1fr 1fr;
            }
        }

        @media (max-width: 992px) {
            .filters-form {
                grid-template-columns: 1fr 1fr;
            }
        }

        @media (max-width: 768px) {
            /* Header - Compact */
            .header-container {
                flex-direction: row;
                height: 56px;
                padding: 8px 12px;
            }

            .logo {
                font-size: 18px;
                gap: 6px;
            }

            .nav-menu {
                flex-direction: row;
                gap: 12px;
                width: auto;
                margin-top: 0;
            }

            .nav-menu a {
                font-size: 13px;
            }

            .btn-header {
                padding: 6px 14px;
                font-size: 12px;
            }

            /* Tabs - Compact */
            .tabs-container {
                padding: 0 12px;
            }

            .tab-button {
                padding: 12px 16px;
                font-size: 14px;
            }

            /* Filters - Compact */
            .filters-section {
                padding: 12px 0;
            }

            .filters-container {
                padding: 0 12px;
            }

            .filters-form {
                grid-template-columns: 1fr;
                gap: 10px;
            }

            .filter-group label {
                font-size: 11px;
                margin-bottom: 5px;
            }

            .filter-group select,
            .filter-group input {
                padding: 9px 11px;
                font-size: 13px;
                height: 40px;
            }

            .btn-filter,
            .btn-clear {
                height: 40px;
                padding: 9px 18px;
                font-size: 13px;
            }

            /* Properties - Compact */
            .properties-section {
                padding: 16px 12px;
            }

            .properties-header h2 {
                font-size: 18px;
            }

            .properties-count {
                font-size: 12px;
            }

            .properties-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }

            .property-image {
                height: 160px;
            }

            .property-content {
                padding: 12px;
            }

            .property-title {
                font-size: 15px;
                line-height: 1.3;
            }

            .property-location {
                font-size: 11px;
                margin-bottom: 8px;
                gap: 3px;
            }

            .property-features {
                gap: 8px;
                padding: 8px 0;
                margin-bottom: 8px;
            }

            .property-feature {
                font-size: 11px;
                gap: 3px;
            }

            .property-feature-icon {
                font-size: 14px;
            }

            .property-price-label {
                font-size: 10px;
                margin-bottom: 2px;
            }

            .property-price-amount {
                font-size: 20px;
                margin-bottom: 2px;
            }

            .property-price-period {
                font-size: 11px;
            }

            .property-actions {
                gap: 4px;
                margin-top: 8px;
            }

            .btn-property {
                padding: 7px 10px;
                font-size: 11px;
            }

            .property-badge {
                padding: 4px 8px;
                font-size: 10px;
                top: 8px;
                right: 8px;
            }
        }

        @media (max-width: 480px) {
            .header-container {
                height: 52px;
                padding: 6px 10px;
            }

            .logo {
                font-size: 16px;
            }

            .nav-menu {
                gap: 8px;
            }

            .nav-menu a {
                font-size: 12px;
            }

            .btn-header {
                padding: 5px 12px;
                font-size: 11px;
            }

            .tab-button {
                padding: 10px 12px;
                font-size: 13px;
            }

            .filters-container {
                padding: 0 10px;
            }

            .filter-group select,
            .filter-group input {
                padding: 8px 10px;
                font-size: 12px;
                height: 38px;
            }

            .btn-filter,
            .btn-clear {
                height: 38px;
                padding: 8px 14px;
                font-size: 12px;
            }

            .properties-section {
                padding: 12px 10px;
            }

            .properties-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }

            .property-image {
                height: 140px;
            }

            .property-content {
                padding: 10px;
            }

            .property-title {
                font-size: 14px;
                line-height: 1.3;
                margin-bottom: 4px;
            }

            .property-location {
                font-size: 10px;
                margin-bottom: 6px;
            }

            .property-features {
                gap: 6px;
                padding: 6px 0;
                margin-bottom: 6px;
            }

            .property-feature {
                font-size: 10px;
            }

            .property-feature-icon {
                font-size: 12px;
            }

            .property-price-label {
                font-size: 9px;
            }

            .property-price-amount {
                font-size: 18px;
            }

            .property-price-period {
                font-size: 10px;
            }

            .property-actions {
                gap: 4px;
                margin-top: 6px;
            }

            .btn-property {
                padding: 6px 8px;
                font-size: 10px;
            }

            .property-badge {
                padding: 3px 6px;
                font-size: 9px;
                top: 6px;
                right: 6px;
            }
        }

        /* Very small screens - back to 1 column */
        @media (max-width: 360px) {
            .properties-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .property-image {
                height: 180px;
            }

            .property-content {
                padding: 12px;
            }

            .property-title {
                font-size: 16px;
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

    <!-- Tabs Navigation - Qatar Living Style -->
    <section class="tabs-section">
        <div class="tabs-container">
            <div class="tabs-nav">
                <button class="tab-button active" onclick="window.location.href='landing.php'">For Rent</button>
                <button class="tab-button" onclick="alert('For Sale coming soon')">For Sale</button>
            </div>
        </div>
    </section>

    <!-- Filters - Qatar Living Style -->
    <section class="filters-section">
        <div class="filters-container">
            <form method="GET" action="" class="filters-form">
                <div class="filter-group">
                    <label>Location</label>
                    <input type="text" name="search" placeholder="Property name, address..." value="<?php echo htmlspecialchars($search); ?>">
                </div>
                <div class="filter-group">
                    <label>Property type</label>
                    <select name="type">
                        <option value="">Choose</option>
                        <?php 
                        $property_types->data_seek(0);
                        while ($type = $property_types->fetch_assoc()): 
                        ?>
                            <option value="<?php echo htmlspecialchars($type['property_type']); ?>" <?php echo $type_filter == $type['property_type'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($type['property_type']); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Beds</label>
                    <select name="beds">
                        <option value="">Choose</option>
                        <?php 
                        $bedrooms_list->data_seek(0);
                        while ($bed = $bedrooms_list->fetch_assoc()): 
                        ?>
                            <option value="<?php echo $bed['bedrooms']; ?>" <?php echo $beds_filter == $bed['bedrooms'] ? 'selected' : ''; ?>>
                                <?php echo $bed['bedrooms']; ?> Bedroom<?php echo $bed['bedrooms'] > 1 ? 's' : ''; ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="filter-group">
                    <label>City</label>
                    <select name="city">
                        <option value="">Choose</option>
                        <?php 
                        $cities->data_seek(0);
                        while ($city = $cities->fetch_assoc()): 
                        ?>
                            <option value="<?php echo htmlspecialchars($city['city']); ?>" <?php echo $city_filter == $city['city'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($city['city']); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Price (QAR)</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <input type="number" name="min_rent" placeholder="Min" value="<?php echo htmlspecialchars($min_rent); ?>" step="0.01" style="height: 42px;">
                        <input type="number" name="max_rent" placeholder="Max" value="<?php echo htmlspecialchars($max_rent); ?>" step="0.01" style="height: 42px;">
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: end;">
                    <button type="submit" class="btn-filter">Show results</button>
                    <?php if (!empty($search) || !empty($type_filter) || !empty($city_filter) || !empty($beds_filter) || !empty($min_rent) || !empty($max_rent)): ?>
                        <a href="landing.php" class="btn-clear">Clear</a>
                    <?php endif; ?>
                </div>
            </form>
        </div>
    </section>

    <!-- Properties Grid -->
    <section class="properties-section">
        <div class="properties-header">
            <div>
                <h2>Available Properties</h2>
                <p class="properties-count"><?php echo count($filtered_units); ?> property<?php echo count($filtered_units) != 1 ? 'ies' : ''; ?> found</p>
            </div>
        </div>

        <?php if (count($filtered_units) > 0): ?>
            <div class="properties-grid">
                <?php foreach ($filtered_units as $unit): 
                    $rent_amount = $unit['default_rent'] ?? 0;
                    $bedrooms = $unit['bedrooms'] ?? 0;
                    $bathrooms = $unit['bathrooms'] ?? 0;
                    $square_feet = $unit['square_feet'] ?? null;
                    $unit_display_name = !empty($unit['unit_name']) ? $unit['unit_name'] : $unit['property_name'];
                    if (!empty($unit['parent_property_name'])) {
                        $unit_display_name = $unit['parent_property_name'] . ' - ' . $unit_display_name;
                    }
                    
                    // Check if unit has images
                    $unit_id = $unit['id'];
                    $has_images = isset($unit_images[$unit_id]) && !empty($unit_images[$unit_id]) && is_array($unit_images[$unit_id]);
                    $images = $has_images ? $unit_images[$unit_id] : [];
                    $image_count = count($images);
                    
                    // Get contact number
                    $contact_number = !empty($unit['contact_number']) ? $unit['contact_number'] : '';
                    // Clean phone number for WhatsApp (remove spaces, dashes, and + sign)
                    $whatsapp_number = $contact_number ? preg_replace('/[^0-9]/', '', $contact_number) : '';
                    $call_number = $contact_number ? 'tel:' . urlencode($contact_number) : '';
                    
                    // Build WhatsApp message with unit details
                    if ($whatsapp_number) {
                        // Build unit URL - construct full URL to unit detail page
                        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
                        $host = $_SERVER['HTTP_HOST'];
                        $request_uri = $_SERVER['REQUEST_URI'];
                        // Get directory path, handling both /landing.php and /real/landing.php cases
                        $path = dirname($request_uri);
                        // Normalize path - ensure it ends with / unless it's root
                        if ($path === '.' || $path === '\\') {
                            $path = '/';
                        } elseif ($path !== '/' && substr($path, -1) !== '/') {
                            $path .= '/';
                        }
                        $unit_url = $protocol . "://" . $host . $path . 'unit.php?id=' . $unit_id;
                        
                        // Build full image URL if images exist - use primary image
                        $image_url = '';
                        if ($has_images && $image_count > 0) {
                            // Find primary image or use first image
                            $primary_image = null;
                            foreach ($images as $img) {
                                if (isset($img['is_primary']) && $img['is_primary'] == 1) {
                                    $primary_image = $img;
                                    break;
                                }
                            }
                            // If no primary image found, use first image
                            if (!$primary_image && !empty($images)) {
                                $primary_image = $images[0];
                            }
                            
                            if ($primary_image) {
                                $image_path = $primary_image['path'];
                                // Build full URL for the image - use same base as unit_url
                                $image_url = $protocol . "://" . $host . $path . ltrim($image_path, '/');
                            }
                        }
                        
                        // Remove WhatsApp formatting characters from unit name to avoid conflicts, then add bold
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
                        $whatsapp_message .= "View details: " . $unit_url;
                        
                        // The image will show as preview in WhatsApp via og:image meta tag on unit.php page
                        // WhatsApp automatically fetches og:image when the link is shared to show preview card
                        
                        $whatsapp_url = 'https://wa.me/' . $whatsapp_number . '?text=' . urlencode($whatsapp_message);
                    } else {
                        $whatsapp_url = '#';
                    }
                ?>
                    <div class="property-card" onclick="window.location.href='unit.php?id=<?php echo $unit_id; ?>'">
                        <div class="property-image" onclick="event.stopPropagation();" style="cursor: default;">
                            <?php if ($has_images && $image_count > 0): ?>
                                <div class="property-carousel <?php echo $image_count > 1 ? 'has-multiple' : ''; ?>" data-carousel-id="carousel-<?php echo $unit_id; ?>">
                                    <div class="property-carousel-slides" id="slides-<?php echo $unit_id; ?>">
                                        <?php foreach ($images as $index => $image): ?>
                                            <div class="property-carousel-slide">
                                                <img src="<?php echo htmlspecialchars($image['path']); ?>" 
                                                     alt="<?php echo htmlspecialchars($image['name']); ?>" 
                                                     loading="<?php echo $index === 0 ? 'eager' : 'lazy'; ?>"
                                                     onerror="this.style.display='none';">
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                    
                                    <?php if ($image_count > 1): ?>
                                        <button class="property-carousel-nav prev" onclick="slideCarousel('<?php echo $unit_id; ?>', -1)" aria-label="Previous image">
                                            ‹
                                        </button>
                                        <button class="property-carousel-nav next" onclick="slideCarousel('<?php echo $unit_id; ?>', 1)" aria-label="Next image">
                                            ›
                                        </button>
                                        <div class="property-carousel-dots" id="dots-<?php echo $unit_id; ?>">
                                            <?php for ($i = 0; $i < $image_count; $i++): ?>
                                                <button class="property-carousel-dot <?php echo $i === 0 ? 'active' : ''; ?>" 
                                                        onclick="goToSlide('<?php echo $unit_id; ?>', <?php echo $i; ?>)" 
                                                        aria-label="Go to image <?php echo $i + 1; ?>"></button>
                                            <?php endfor; ?>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            <?php else: ?>
                                <div class="property-image-placeholder">
                                    <span>🏠</span>
                                </div>
                            <?php endif; ?>
                            <span class="property-badge">Available</span>
                        </div>
                        <div class="property-content" onclick="event.stopPropagation();" style="cursor: default;">
                            <h3 class="property-title" style="cursor: pointer; color: #111827;" onclick="event.stopPropagation(); window.location.href='unit.php?id=<?php echo $unit_id; ?>';"><?php echo htmlspecialchars($unit_display_name); ?></h3>
                            <div class="property-location">
                                <span>📍</span>
                                <span><?php echo htmlspecialchars($unit['address'] . ', ' . $unit['city']); ?></span>
                            </div>

                            <div class="property-features">
                                <?php if ($bedrooms > 0): ?>
                                <div class="property-feature">
                                    <span class="property-feature-icon">🛏️</span>
                                    <span><?php echo $bedrooms; ?> Bed<?php echo $bedrooms > 1 ? 's' : ''; ?></span>
                                </div>
                                <?php endif; ?>
                                <?php if ($bathrooms > 0): ?>
                                <div class="property-feature">
                                    <span class="property-feature-icon">🚿</span>
                                    <span><?php echo $bathrooms; ?> Bath<?php echo $bathrooms > 1 ? 's' : ''; ?></span>
                                </div>
                                <?php endif; ?>
                                <?php if ($square_feet): ?>
                                <div class="property-feature">
                                    <span class="property-feature-icon">📐</span>
                                    <span><?php echo number_format($square_feet); ?> sq ft</span>
                                </div>
                                <?php endif; ?>
                            </div>

                            <div class="property-price">
                                <div class="property-price-label">Monthly Rent</div>
                                <div class="property-price-amount">
                                    <?php 
                                    $currency = 'QAR';
                                    $symbol = 'ر.ق';
                                    $formatted = number_format($rent_amount, 0);
                                    echo $formatted . ' ' . $symbol;
                                    ?>
                                </div>
                                <div class="property-price-period">per month</div>
                            </div>

                            <div class="property-actions" onclick="event.stopPropagation();">
                                <a href="unit.php?id=<?php echo $unit_id; ?>" class="btn-property btn-property-primary" onclick="event.stopPropagation();">View Details</a>
                                <?php if (!empty($contact_number)): ?>
                                    <a href="<?php echo $whatsapp_url; ?>" target="_blank" class="btn-property btn-property-whatsapp" title="Contact via WhatsApp" onclick="event.stopPropagation();">
                                        📱 WhatsApp
                                    </a>
                                    <a href="<?php echo $call_number; ?>" class="btn-property btn-property-call" title="Call now" onclick="event.stopPropagation();">
                                        📞 Call
                                    </a>
                                <?php endif; ?>
                                <button type="button" onclick="event.stopPropagation(); shareUnit(<?php echo $unit_id; ?>, <?php echo json_encode($unit_display_name); ?>, <?php echo json_encode($unit['address'] . ', ' . $unit['city']); ?>, <?php echo $rent_amount; ?>);" class="btn-property btn-property-secondary" title="Share this property">
                                    🔗 Share
                                </button>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div class="no-results">
                <div class="no-results-icon">🏢</div>
                <h3>No Properties Found</h3>
                <p>We couldn't find any properties matching your criteria. Try adjusting your filters.</p>
            </div>
        <?php endif; ?>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <p>&copy; <?php echo date('Y'); ?> Real Estate Management. All rights reserved.</p>
        </div>
    </footer>

    <script>
        // Carousel state management
        const carouselState = {};

        // Initialize carousels on page load
        document.addEventListener('DOMContentLoaded', function() {
            const carousels = document.querySelectorAll('.property-carousel');
            carousels.forEach(carousel => {
                const carouselId = carousel.getAttribute('data-carousel-id');
                const unitId = carouselId.replace('carousel-', '');
                const slides = carousel.querySelectorAll('.property-carousel-slide');
                
                if (slides.length > 0) {
                    carouselState[unitId] = {
                        currentSlide: 0,
                        totalSlides: slides.length
                    };
                    
                    // Set initial position
                    const slidesContainer = document.getElementById('slides-' + unitId);
                    if (slidesContainer) {
                        slidesContainer.style.transform = 'translateX(0%)';
                    }
                    
                    // Only initialize touch/swipe support if there are multiple slides
                    if (slides.length > 1) {
                        initTouchSupport(carousel, unitId);
                    }
                    
                    // Update navigation on load
                    updateCarouselNav(unitId);
                }
            });
        });

        function slideCarousel(unitId, direction) {
            if (!carouselState[unitId]) return;
            
            const state = carouselState[unitId];
            const newSlide = state.currentSlide + direction;
            
            if (newSlide < 0 || newSlide >= state.totalSlides) {
                return; // Can't go beyond boundaries
            }
            
            goToSlide(unitId, newSlide);
        }

        function goToSlide(unitId, slideIndex) {
            if (!carouselState[unitId]) return;
            
            const state = carouselState[unitId];
            if (slideIndex < 0 || slideIndex >= state.totalSlides) return;
            
            state.currentSlide = slideIndex;
            
            const slidesContainer = document.getElementById('slides-' + unitId);
            if (slidesContainer) {
                const translateX = -slideIndex * 100;
                slidesContainer.style.transform = `translateX(${translateX}%)`;
            }
            
            updateCarouselNav(unitId);
        }

        function updateCarouselNav(unitId) {
            if (!carouselState[unitId]) return;
            
            const state = carouselState[unitId];
            const carousel = document.querySelector('[data-carousel-id="carousel-' + unitId + '"]');
            if (!carousel) return;
            
            // Update prev/next buttons
            const prevBtn = carousel.querySelector('.property-carousel-nav.prev');
            const nextBtn = carousel.querySelector('.property-carousel-nav.next');
            
            if (prevBtn) {
                prevBtn.disabled = state.currentSlide === 0;
            }
            if (nextBtn) {
                nextBtn.disabled = state.currentSlide === state.totalSlides - 1;
            }
            
            // Update dots
            const dots = carousel.querySelectorAll('.property-carousel-dot');
            dots.forEach((dot, index) => {
                if (index === state.currentSlide) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }

        function initTouchSupport(carousel, unitId) {
            let startX = 0;
            let currentX = 0;
            let isDragging = false;
            let startTranslate = 0;
            let currentTranslate = 0;
            
            const slidesContainer = carousel.querySelector('.property-carousel-slides');
            if (!slidesContainer) return;
            
            carousel.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                isDragging = true;
                const state = carouselState[unitId];
                if (state) {
                    startTranslate = -state.currentSlide * 100;
                    currentTranslate = startTranslate;
                }
                carousel.style.cursor = 'grabbing';
            });
            
            carousel.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                currentX = e.touches[0].clientX;
                const diff = startX - currentX;
                currentTranslate = startTranslate - (diff / carousel.offsetWidth) * 100;
                
                // Apply transform
                slidesContainer.style.transition = 'none';
                slidesContainer.style.transform = `translateX(${currentTranslate}%)`;
            });
            
            carousel.addEventListener('touchend', () => {
                if (!isDragging) return;
                isDragging = false;
                carousel.style.cursor = 'grab';
                slidesContainer.style.transition = 'transform 0.4s ease-in-out';
                
                const state = carouselState[unitId];
                if (!state) return;
                
                const moved = startTranslate - currentTranslate;
                const threshold = 30; // Minimum swipe distance
                
                if (Math.abs(moved) > threshold) {
                    if (moved > 0 && state.currentSlide < state.totalSlides - 1) {
                        // Swiped left - go to next
                        goToSlide(unitId, state.currentSlide + 1);
                    } else if (moved < 0 && state.currentSlide > 0) {
                        // Swiped right - go to previous
                        goToSlide(unitId, state.currentSlide - 1);
                    } else {
                        // Snap back to current slide
                        goToSlide(unitId, state.currentSlide);
                    }
                } else {
                    // Snap back to current slide
                    goToSlide(unitId, state.currentSlide);
                }
            });
            
            // Mouse drag support for desktop
            let mouseStartX = 0;
            let mouseIsDragging = false;
            let mouseStartTranslate = 0;
            let mouseCurrentTranslate = 0;
            
            carousel.addEventListener('mousedown', (e) => {
                mouseStartX = e.clientX;
                mouseIsDragging = true;
                const state = carouselState[unitId];
                if (state) {
                    mouseStartTranslate = -state.currentSlide * 100;
                    mouseCurrentTranslate = mouseStartTranslate;
                }
                carousel.style.cursor = 'grabbing';
                e.preventDefault();
            });
            
            carousel.addEventListener('mousemove', (e) => {
                if (!mouseIsDragging) return;
                e.preventDefault();
                const diff = mouseStartX - e.clientX;
                mouseCurrentTranslate = mouseStartTranslate - (diff / carousel.offsetWidth) * 100;
                
                slidesContainer.style.transition = 'none';
                slidesContainer.style.transform = `translateX(${mouseCurrentTranslate}%)`;
            });
            
            carousel.addEventListener('mouseup', () => {
                if (!mouseIsDragging) return;
                mouseIsDragging = false;
                carousel.style.cursor = 'grab';
                slidesContainer.style.transition = 'transform 0.4s ease-in-out';
                
                const state = carouselState[unitId];
                if (!state) return;
                
                const moved = mouseStartTranslate - mouseCurrentTranslate;
                const threshold = 30;
                
                if (Math.abs(moved) > threshold) {
                    if (moved > 0 && state.currentSlide < state.totalSlides - 1) {
                        goToSlide(unitId, state.currentSlide + 1);
                    } else if (moved < 0 && state.currentSlide > 0) {
                        goToSlide(unitId, state.currentSlide - 1);
                    } else {
                        goToSlide(unitId, state.currentSlide);
                    }
                } else {
                    goToSlide(unitId, state.currentSlide);
                }
            });
            
            carousel.addEventListener('mouseleave', () => {
                if (mouseIsDragging) {
                    mouseIsDragging = false;
                    carousel.style.cursor = 'grab';
                    slidesContainer.style.transition = 'transform 0.4s ease-in-out';
                    const state = carouselState[unitId];
                    if (state) {
                        goToSlide(unitId, state.currentSlide);
                    }
                }
            });
        }

        // Share unit functionality
        async function shareUnit(unitId, unitName, location, rentAmount) {
            // Build share URL - get current directory
            const currentPath = window.location.pathname;
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
            const shareUrl = window.location.origin + basePath + 'unit.php?id=' + unitId;
            const shareTitle = unitName + ' - ' + Math.round(rentAmount).toLocaleString() + ' ر.ق/month';
            const shareText = 'Check out this property: ' + unitName + ' in ' + location;
            
            const shareData = {
                title: shareTitle,
                text: shareText,
                url: shareUrl
            };
            
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    // Fallback: copy to clipboard
                    if (navigator.clipboard) {
                        await navigator.clipboard.writeText(shareUrl);
                        alert('Link copied to clipboard!');
                    } else {
                        // Final fallback: show URL
                        prompt('Copy this link:', shareUrl);
                    }
                }
            } catch (err) {
                // User cancelled or error occurred
                if (err.name !== 'AbortError') {
                    // Fallback: copy to clipboard
                    if (navigator.clipboard) {
                        await navigator.clipboard.writeText(shareUrl);
                        alert('Link copied to clipboard!');
                    } else {
                        prompt('Copy this link:', shareUrl);
                    }
                }
            }
        }
    </script>
</body>
</html>
