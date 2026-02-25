-- Add Qatar ID column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS qatar_id VARCHAR(20) NULL AFTER alternate_phone;


