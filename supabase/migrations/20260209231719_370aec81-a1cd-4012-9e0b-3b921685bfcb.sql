-- Add granular notification preference columns to clients
ALTER TABLE public.clients
  ADD COLUMN sms_reminders_opt_in boolean DEFAULT true,
  ADD COLUMN email_reminders_opt_in boolean DEFAULT true;

-- Migrate existing preferences: if they had sms_opt_in=false, disable sms reminders too
UPDATE public.clients SET sms_reminders_opt_in = false WHERE sms_opt_in = false;
UPDATE public.clients SET email_reminders_opt_in = false WHERE email_opt_in = false;

-- The existing sms_opt_in and email_opt_in columns will now represent marketing preferences