-- Add end_date column to daycare_subscriptions
ALTER TABLE public.daycare_subscriptions
ADD COLUMN end_date date NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.daycare_subscriptions.end_date IS 'Optional end date for the subscription. If null, subscription continues indefinitely until cancelled.';