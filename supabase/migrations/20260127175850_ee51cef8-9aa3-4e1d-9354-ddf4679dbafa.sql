-- Add is_alert column to trait_templates
ALTER TABLE public.trait_templates
ADD COLUMN is_alert boolean NOT NULL DEFAULT false;

-- Add is_alert column to pet_traits (inherited when trait is assigned)
ALTER TABLE public.pet_traits
ADD COLUMN is_alert boolean NOT NULL DEFAULT false;