-- Create pet_traits table to store icon traits for each pet
CREATE TABLE public.pet_traits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  icon_name TEXT NOT NULL,
  color_key TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate icon+color combinations per pet
CREATE UNIQUE INDEX idx_pet_traits_unique ON public.pet_traits(pet_id, icon_name, color_key);

-- Create index for faster lookups by pet_id
CREATE INDEX idx_pet_traits_pet_id ON public.pet_traits(pet_id);

-- Enable Row Level Security
ALTER TABLE public.pet_traits ENABLE ROW LEVEL SECURITY;

-- Staff can view all pet traits
CREATE POLICY "Staff can view all pet traits" 
ON public.pet_traits 
FOR SELECT 
USING (is_staff_or_admin(auth.uid()));

-- Staff can insert pet traits
CREATE POLICY "Staff can insert pet traits" 
ON public.pet_traits 
FOR INSERT 
WITH CHECK (is_staff_or_admin(auth.uid()));

-- Staff can update pet traits
CREATE POLICY "Staff can update pet traits" 
ON public.pet_traits 
FOR UPDATE 
USING (is_staff_or_admin(auth.uid()));

-- Staff can delete pet traits
CREATE POLICY "Staff can delete pet traits" 
ON public.pet_traits 
FOR DELETE 
USING (is_staff_or_admin(auth.uid()));

-- Clients can view their own pets' traits
CREATE POLICY "Clients can view their pets traits" 
ON public.pet_traits 
FOR SELECT 
USING (pet_id IN (
  SELECT p.id FROM pets p
  JOIN clients c ON p.client_id = c.id
  WHERE c.user_id = auth.uid()
));