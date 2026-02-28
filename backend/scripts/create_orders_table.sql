-- Migration script to create the orders table for completed requests (user perspective)
-- Run this script in your Supabase SQL editor

-- Create the orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add orders_count column to users table
ALTER TABLE users
ADD COLUMN orders_count INTEGER DEFAULT 0;

-- Create a function to update the orders_count when a new order is added or deleted
CREATE OR REPLACE FUNCTION update_orders_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE users SET orders_count = orders_count + 1 WHERE id = NEW.user_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE users SET orders_count = orders_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the update_orders_count function
CREATE TRIGGER orders_count_trigger
AFTER INSERT OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION update_orders_count();