-- Migration: Add contact_number column to properties table
-- This column stores the contact number for units to display on landing page
-- Run this if you already have an existing database

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20) DEFAULT NULL AFTER notes;

