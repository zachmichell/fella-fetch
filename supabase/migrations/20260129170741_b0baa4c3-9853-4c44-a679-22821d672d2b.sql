-- Create storage bucket for pet photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-photos', 'pet-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow clients to upload photos for their own pets
CREATE POLICY "Clients can upload their pet photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pet-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- Allow clients to update their pet photos
CREATE POLICY "Clients can update their pet photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'pet-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- Allow clients to delete their pet photos
CREATE POLICY "Clients can delete their pet photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'pet-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- Allow anyone to view pet photos (public bucket)
CREATE POLICY "Anyone can view pet photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pet-photos');

-- Staff can manage all pet photos
CREATE POLICY "Staff can manage all pet photos"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'pet-photos' AND
  is_staff_or_admin(auth.uid())
);