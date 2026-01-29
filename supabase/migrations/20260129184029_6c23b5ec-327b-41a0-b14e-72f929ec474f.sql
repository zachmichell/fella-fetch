-- Add grooming preferences to pets table
ALTER TABLE public.pets 
ADD COLUMN grooming_product_id text,
ADD COLUMN grooming_product_title text,
ADD COLUMN grooming_frequency text,
ADD COLUMN last_grooming_date date;

-- Add comment for documentation
COMMENT ON COLUMN public.pets.grooming_product_id IS 'Shopify product ID for recommended grooming service';
COMMENT ON COLUMN public.pets.grooming_product_title IS 'Title of the recommended grooming product';
COMMENT ON COLUMN public.pets.grooming_frequency IS 'Recommended grooming frequency (e.g., "4 weeks", "6 weeks", "8 weeks")';
COMMENT ON COLUMN public.pets.last_grooming_date IS 'Date of last grooming appointment for scheduling suggestions';