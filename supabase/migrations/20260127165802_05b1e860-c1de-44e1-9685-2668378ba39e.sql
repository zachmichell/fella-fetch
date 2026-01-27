-- Create service_types table for dynamic management
CREATE TABLE public.service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('reservation', 'service', 'add_on')),
  description text,
  credit_field text, -- 'daycare_credits', 'boarding_credits', or null for non-credit services
  credits_per_unit integer DEFAULT 1,
  color text DEFAULT 'gray',
  icon_name text DEFAULT 'calendar',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active service types"
ON public.service_types FOR SELECT
USING (is_active = true OR is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert service types"
ON public.service_types FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update service types"
ON public.service_types FOR UPDATE
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Admins can delete service types"
ON public.service_types FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_service_types_updated_at
BEFORE UPDATE ON public.service_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default service types (matching existing enum values plus new ones)
INSERT INTO public.service_types (name, display_name, category, credit_field, credits_per_unit, color, icon_name, sort_order) VALUES
('daycare', 'Full Day Daycare', 'reservation', 'daycare_credits', 1, 'blue', 'sun', 1),
('half_daycare', 'Half Day Daycare', 'reservation', 'daycare_credits', 1, 'sky', 'sunrise', 2),
('boarding', 'Boarding', 'reservation', 'boarding_credits', 1, 'purple', 'moon', 3),
('assessment', 'Assessment', 'reservation', null, 0, 'amber', 'clipboard-check', 4),
('grooming', 'Grooming', 'service', null, 0, 'pink', 'scissors', 10),
('training', 'Training', 'service', null, 0, 'green', 'graduation-cap', 11),
('nail_trim', 'Nail Trim', 'add_on', null, 0, 'orange', 'hand', 20),
('bath', 'Bath', 'add_on', null, 0, 'cyan', 'droplets', 21);