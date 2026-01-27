-- Create suites table for lodging calendar
CREATE TABLE public.suites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suites ENABLE ROW LEVEL SECURITY;

-- Staff can view all suites
CREATE POLICY "Staff can view all suites"
ON public.suites
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

-- Staff can insert suites
CREATE POLICY "Staff can insert suites"
ON public.suites
FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

-- Staff can update suites
CREATE POLICY "Staff can update suites"
ON public.suites
FOR UPDATE
USING (is_staff_or_admin(auth.uid()));

-- Admins can delete suites
CREATE POLICY "Admins can delete suites"
ON public.suites
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add suite_id to reservations for boarding assignments
ALTER TABLE public.reservations
ADD COLUMN suite_id UUID REFERENCES public.suites(id);

-- Create trigger for updated_at
CREATE TRIGGER update_suites_updated_at
BEFORE UPDATE ON public.suites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default suites
INSERT INTO public.suites (name, description, sort_order) VALUES
  ('Suite 1', 'Standard boarding suite', 1),
  ('Suite 2', 'Standard boarding suite', 2),
  ('Suite 3', 'Standard boarding suite', 3),
  ('Suite 4', 'Standard boarding suite', 4),
  ('Suite 5', 'Large suite for big dogs', 5),
  ('Suite 6', 'Large suite for big dogs', 6);