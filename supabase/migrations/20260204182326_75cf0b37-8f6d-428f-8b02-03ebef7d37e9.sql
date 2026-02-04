-- Create marketing_segments table for storing saved filter configurations
CREATE TABLE public.marketing_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.marketing_segments ENABLE ROW LEVEL SECURITY;

-- Only admins can view marketing segments
CREATE POLICY "Admins can view marketing segments"
ON public.marketing_segments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can create marketing segments
CREATE POLICY "Admins can create marketing segments"
ON public.marketing_segments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update marketing segments
CREATE POLICY "Admins can update marketing segments"
ON public.marketing_segments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete marketing segments (but not presets)
CREATE POLICY "Admins can delete non-preset marketing segments"
ON public.marketing_segments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND is_preset = false);

-- Add trigger for updated_at
CREATE TRIGGER update_marketing_segments_updated_at
BEFORE UPDATE ON public.marketing_segments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default preset segments
INSERT INTO public.marketing_segments (name, description, filters, is_preset) VALUES
('Inactive 30 Days', 'Pets who haven''t visited in 30 days', '[{"field": "days_since_last_visit", "operator": "gte", "value": 30}]'::jsonb, true),
('Inactive 60 Days', 'Pets who haven''t visited in 60 days', '[{"field": "days_since_last_visit", "operator": "gte", "value": 60}]'::jsonb, true),
('Inactive 90 Days', 'Pets who haven''t visited in 90 days', '[{"field": "days_since_last_visit", "operator": "gte", "value": 90}]'::jsonb, true),
('No Groom 60 Days', 'Pets who haven''t had a groom in 60 days', '[{"field": "days_since_last_groom", "operator": "gte", "value": 60}]'::jsonb, true),
('No Groom 90 Days', 'Pets who haven''t had a groom in 90 days', '[{"field": "days_since_last_groom", "operator": "gte", "value": 90}]'::jsonb, true),
('No Groom 120 Days', 'Pets who haven''t had a groom in 120 days', '[{"field": "days_since_last_groom", "operator": "gte", "value": 120}]'::jsonb, true),
('Low Daycare Credits', 'Clients with 2 or fewer daycare credits', '[{"field": "daycare_credits", "operator": "lte", "value": 2}]'::jsonb, true),
('Zero Credits', 'Clients with no credits of any type', '[{"field": "daycare_credits", "operator": "eq", "value": 0}, {"field": "boarding_credits", "operator": "eq", "value": 0}]'::jsonb, true);