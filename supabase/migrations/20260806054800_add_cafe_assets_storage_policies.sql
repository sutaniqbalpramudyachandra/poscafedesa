/*
# Storage policies for cafe-assets bucket

## Overview
The cafe-assets storage bucket is a public bucket for cafe logo and QR code images.
These policies allow anon+authenticated to upload, read, update, and delete objects.

## Security
- Public read access (the bucket is public, images are displayed in the app).
- Anon+authenticated can insert/update/delete (single-tenant, no auth app).
*/

-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public) VALUES ('cafe-assets', 'cafe-assets', true) ON CONFLICT (id) DO NOTHING;

-- Storage object policies for cafe-assets bucket
DROP POLICY IF EXISTS "anon_read_cafe_assets" ON storage.objects;
CREATE POLICY "anon_read_cafe_assets" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'cafe-assets');

DROP POLICY IF EXISTS "anon_insert_cafe_assets" ON storage.objects;
CREATE POLICY "anon_insert_cafe_assets" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (bucket_id = 'cafe-assets');

DROP POLICY IF EXISTS "anon_update_cafe_assets" ON storage.objects;
CREATE POLICY "anon_update_cafe_assets" ON storage.objects FOR UPDATE
TO anon, authenticated USING (bucket_id = 'cafe-assets') WITH CHECK (bucket_id = 'cafe-assets');

DROP POLICY IF EXISTS "anon_delete_cafe_assets" ON storage.objects;
CREATE POLICY "anon_delete_cafe_assets" ON storage.objects FOR DELETE
TO anon, authenticated USING (bucket_id = 'cafe-assets');
