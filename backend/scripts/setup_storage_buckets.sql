-- Setup script for Supabase Storage Buckets
-- Run this script in your Supabase SQL editor to create the required storage buckets

-- Create avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create creations bucket for user creations/gallery
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creations',
  'creations', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create requests bucket for request images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'requests',
  'requests',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create messages bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messages',
  'messages',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Create temp bucket for temporary uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp',
  'temp',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up RLS policies for creations bucket
CREATE POLICY "Creation images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'creations');

CREATE POLICY "Users can upload their own creations" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'creations' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own creations" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'creations' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own creations" ON storage.objects
FOR DELETE USING (
  bucket_id = 'creations' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up RLS policies for requests bucket
CREATE POLICY "Request images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'requests');

CREATE POLICY "Users can upload their own request images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'requests' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own request images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'requests' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own request images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'requests' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up RLS policies for messages bucket
CREATE POLICY "Message attachments are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'messages');

CREATE POLICY "Users can upload their own message attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'messages' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own message attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'messages' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own message attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'messages' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up RLS policies for temp bucket
CREATE POLICY "Temp files are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'temp');

CREATE POLICY "Users can upload temp files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'temp' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update temp files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'temp' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete temp files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'temp' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
