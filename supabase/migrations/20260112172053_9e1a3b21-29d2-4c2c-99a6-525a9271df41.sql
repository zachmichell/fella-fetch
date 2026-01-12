-- Add credits columns to clients table
ALTER TABLE public.clients
ADD COLUMN daycare_credits integer NOT NULL DEFAULT 0,
ADD COLUMN boarding_credits integer NOT NULL DEFAULT 0;

-- Add check constraint to prevent negative credits
ALTER TABLE public.clients
ADD CONSTRAINT daycare_credits_non_negative CHECK (daycare_credits >= 0),
ADD CONSTRAINT boarding_credits_non_negative CHECK (boarding_credits >= 0);