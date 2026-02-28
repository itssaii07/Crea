-- Migration script to create the creations table and add creations_count to users table
-- Run this script in your Supabase SQL editor

-- Create the creations table
CREATE TABLE creations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add creations_count column to users table
ALTER TABLE users
ADD COLUMN creations_count INTEGER DEFAULT 0;

-- Create a function to update the creations_count when a new creation is added or deleted
CREATE OR REPLACE FUNCTION update_creations_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE users SET creations_count = creations_count + 1 WHERE id = NEW.user_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE users SET creations_count = creations_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the update_creations_count function
CREATE TRIGGER creations_count_trigger
AFTER INSERT OR DELETE ON creations
FOR EACH ROW EXECUTE FUNCTION update_creations_count();
