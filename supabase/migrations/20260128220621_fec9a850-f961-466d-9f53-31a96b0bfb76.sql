-- Add communication preference columns to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS sms_opt_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_opt_in boolean DEFAULT false;