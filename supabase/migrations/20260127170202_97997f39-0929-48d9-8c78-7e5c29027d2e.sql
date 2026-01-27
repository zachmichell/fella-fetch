-- Add half_daycare_credits column to clients table
ALTER TABLE public.clients 
ADD COLUMN half_daycare_credits integer NOT NULL DEFAULT 0;