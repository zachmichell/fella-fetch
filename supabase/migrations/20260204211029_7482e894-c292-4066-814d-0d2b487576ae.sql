-- Create staff codes table for 4-digit PIN authentication
CREATE TABLE public.staff_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT code_format CHECK (code ~ '^\d{4}$')
);

-- Enable RLS
ALTER TABLE public.staff_codes ENABLE ROW LEVEL SECURITY;

-- Only staff/admin can view staff codes
CREATE POLICY "Staff can view staff codes"
ON public.staff_codes
FOR SELECT
TO authenticated
USING (is_staff_or_admin(auth.uid()));

-- Only admins can insert staff codes
CREATE POLICY "Admins can insert staff codes"
ON public.staff_codes
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update staff codes
CREATE POLICY "Admins can update staff codes"
ON public.staff_codes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete staff codes
CREATE POLICY "Admins can delete staff codes"
ON public.staff_codes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_staff_codes_updated_at
BEFORE UPDATE ON public.staff_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default admin code for initial setup
INSERT INTO public.staff_codes (name, code, is_admin) 
VALUES ('Admin', '0000', true);