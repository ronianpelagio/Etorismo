-- ETorismo Audio Bucket Policies
-- These policies control who can read, upload, and delete audio files

-- 1. Allow public (anonymous) users to READ audio files
CREATE POLICY "Public can read audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio');

-- 2. Allow authenticated users to UPLOAD audio files
-- (Only authenticated users with proper permissions - typically admins)
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio' 
  AND auth.role() = 'authenticated'
);

-- 3. Allow authenticated users (admins/staff) to UPDATE audio files
CREATE POLICY "Authenticated users can update audio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'audio' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'audio' AND auth.role() = 'authenticated');

-- 4. Allow authenticated users (admins/staff) to DELETE audio files
CREATE POLICY "Authenticated users can delete audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio' AND auth.role() = 'authenticated');

-- ALTERNATIVE: More Restrictive Version (Recommended for production)
-- Only allow admin role to upload/delete
-- First, you need to add a 'role' column to your users table:
-- ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
-- Then update policies:

-- CREATE POLICY "Only admins can upload audio"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'audio' 
--   AND auth.role() = 'authenticated'
--   AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
-- );

-- CREATE POLICY "Only admins can delete audio"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'audio' 
--   AND auth.role() = 'authenticated'
--   AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
-- );
