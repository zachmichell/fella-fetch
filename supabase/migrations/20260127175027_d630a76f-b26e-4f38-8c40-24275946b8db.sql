-- Create system settings table for configurable values
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert settings"
ON public.system_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.system_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
ON public.system_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default inactivity threshold setting
INSERT INTO public.system_settings (key, value, description)
VALUES ('pet_inactivity_days', '90', 'Number of days without a reservation before showing an inactivity warning');