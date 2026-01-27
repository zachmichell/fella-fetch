-- Create trait_templates table for reusable trait definitions
CREATE TABLE public.trait_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon_name TEXT NOT NULL,
  color_key TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(icon_name, color_key, title)
);

-- Enable Row Level Security
ALTER TABLE public.trait_templates ENABLE ROW LEVEL SECURITY;

-- Staff can view all templates
CREATE POLICY "Staff can view all templates"
ON public.trait_templates
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

-- Staff can insert templates
CREATE POLICY "Staff can insert templates"
ON public.trait_templates
FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

-- Staff can update templates
CREATE POLICY "Staff can update templates"
ON public.trait_templates
FOR UPDATE
USING (is_staff_or_admin(auth.uid()));

-- Staff can delete templates
CREATE POLICY "Staff can delete templates"
ON public.trait_templates
FOR DELETE
USING (is_staff_or_admin(auth.uid()));