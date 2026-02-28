-- Migration script to add username column to users table
-- Run this script in your Supabase SQL editor

-- Add username column to users table
ALTER TABLE users 
ADD COLUMN username TEXT;

-- Add unique constraint to ensure usernames are unique
ALTER TABLE users 
ADD CONSTRAINT unique_username UNIQUE (username);

-- Create index for better performance when searching by username
CREATE INDEX idx_users_username ON users(username);

-- Optional: Set default username for existing users based on email
-- UPDATE users 
-- SET username = split_part(email, '@', 1) 
-- WHERE username IS NULL;
