-- Migration: Add property units support
-- Allows properties to be split into multiple units with separate tenants
-- Example: Villa rented from owner, split into 5 apartments

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS parent_property_id INT DEFAULT NULL AFTER user_id,
ADD COLUMN IF NOT EXISTS unit_name VARCHAR(100) DEFAULT NULL AFTER parent_property_id,
ADD COLUMN IF NOT EXISTS is_unit BOOLEAN DEFAULT FALSE AFTER unit_name,
ADD FOREIGN KEY IF NOT EXISTS fk_parent_property (parent_property_id) REFERENCES properties(id) ON DELETE CASCADE;
