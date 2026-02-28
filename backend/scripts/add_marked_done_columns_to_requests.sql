-- Migration script to add marked_done columns to requests table
-- Run this script in your Supabase SQL editor

ALTER TABLE requests
ADD COLUMN requester_marked_done BOOLEAN DEFAULT FALSE,
ADD COLUMN artist_marked_done BOOLEAN DEFAULT FALSE;
