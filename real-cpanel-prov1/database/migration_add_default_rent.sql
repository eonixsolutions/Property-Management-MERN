-- Migration: Add default_rent column to properties table
-- Run this if you already have an existing database

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS default_rent DECIMAL(10,2) DEFAULT 0.00 
AFTER purchase_date;
