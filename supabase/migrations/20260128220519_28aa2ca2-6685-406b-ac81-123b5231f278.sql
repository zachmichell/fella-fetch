-- Add separate address component columns to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS postal_code text;