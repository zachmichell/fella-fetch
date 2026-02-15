
-- Add Shopify staff linking columns to groomers
ALTER TABLE public.groomers
ADD COLUMN shopify_staff_id text UNIQUE,
ADD COLUMN shopify_staff_name text;
