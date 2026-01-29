-- Make pet-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'pet-photos';

-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Anyone can view pet photos" ON storage.objects;

-- Create owner-scoped SELECT policy for clients viewing their own pets' photos
CREATE POLICY "Clients can view their own pets photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pet-photos' AND
  EXISTS (
    SELECT 1 FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
    AND (storage.foldername(name))[1] = p.id::text
  )
);

-- Staff can view all pet photos
CREATE POLICY "Staff can view all pet photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pet-photos' AND
  is_staff_or_admin(auth.uid())
);