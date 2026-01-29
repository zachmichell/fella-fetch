-- Create storage bucket for pet vaccination documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-vaccinations', 'pet-vaccinations', false);

-- Add document URL columns to pets table
ALTER TABLE public.pets
ADD COLUMN vaccination_rabies_doc_url text,
ADD COLUMN vaccination_bordetella_doc_url text,
ADD COLUMN vaccination_distemper_doc_url text;

-- Storage policies for clients to upload their own pets' documents
CREATE POLICY "Clients can upload their pets vaccination docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pet-vaccinations' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their pets vaccination docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pet-vaccinations'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can delete their pets vaccination docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pet-vaccinations'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- Staff can manage all vaccination documents
CREATE POLICY "Staff can manage all vaccination docs"
ON storage.objects FOR ALL
USING (
  bucket_id = 'pet-vaccinations'
  AND is_staff_or_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'pet-vaccinations'
  AND is_staff_or_admin(auth.uid())
);