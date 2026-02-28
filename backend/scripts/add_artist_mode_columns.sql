-- Migration script to add artist mode columns to users table
-- Run this script in your Supabase SQL editor

-- Add artist_mode_enabled column to users table
ALTER TABLE users 
ADD COLUMN artist_mode_enabled BOOLEAN DEFAULT FALSE;

-- Add experience column to users table
ALTER TABLE users 
ADD COLUMN experience INTEGER DEFAULT 0;
