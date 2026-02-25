-- Fix property_type ENUM to include all property types
-- Run this on both local and VPS

-- Update property_type ENUM to include all types from the form
ALTER TABLE properties MODIFY COLUMN property_type ENUM(
    'Apartment', 
    'Villa', 
    'House', 
    'Condo', 
    'Townhouse', 
    'Studio', 
    'Penthouse', 
    'Commercial', 
    'Office', 
    'Shop', 
    'Warehouse', 
    'Land', 
    'Other'
) NOT NULL;

-- Verify the change
SHOW COLUMNS FROM properties LIKE 'property_type';


