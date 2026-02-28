-- Migration script to create the artist_mode_sessions table
-- Run this script in your Supabase SQL editor

CREATE TABLE artist_mode_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
