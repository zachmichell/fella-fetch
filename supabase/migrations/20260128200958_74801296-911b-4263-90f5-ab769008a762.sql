-- Add emergency contact relationship field to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;

-- Create client_agreements table for storing signed documents
CREATE TABLE public.client_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  signed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_agreements ENABLE ROW LEVEL SECURITY;

-- Clients can view their own agreements
CREATE POLICY "Clients can view their own agreements"
ON public.client_agreements
FOR SELECT
USING (client_id IN (
  SELECT id FROM clients WHERE user_id = auth.uid()
));

-- Staff can view all agreements
CREATE POLICY "Staff can view all agreements"
ON public.client_agreements
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

-- Staff can insert agreements
CREATE POLICY "Staff can insert agreements"
ON public.client_agreements
FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

-- Staff can update agreements
CREATE POLICY "Staff can update agreements"
ON public.client_agreements
FOR UPDATE
USING (is_staff_or_admin(auth.uid()));

-- Staff can delete agreements
CREATE POLICY "Staff can delete agreements"
ON public.client_agreements
FOR DELETE
USING (is_staff_or_admin(auth.uid()));

-- Create storage bucket for client agreements
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-agreements', 'client-agreements', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-agreements bucket
CREATE POLICY "Staff can upload agreements"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'client-agreements' AND is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update agreements"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'client-agreements' AND is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete agreements"
ON storage.objects
FOR DELETE
USING (bucket_id = 'client-agreements' AND is_staff_or_admin(auth.uid()));

CREATE POLICY "Clients can view their own agreement files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-agreements' 
  AND (
    is_staff_or_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  )
);