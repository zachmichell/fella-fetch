
-- Fix 1: Restrict system_settings SELECT to authenticated users, 
-- with public access only for safe booking-related keys
DROP POLICY "Anyone can view settings" ON public.system_settings;

CREATE POLICY "Public can view safe settings"
ON public.system_settings
FOR SELECT
USING (
  key IN ('business_hours', 'capacity_daycare', 'capacity_boarding', 'capacity_grooming', 'capacity_training')
);

CREATE POLICY "Authenticated can view all settings"
ON public.system_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 2: Restrict marketing_templates to staff only
DROP POLICY "Allow all access to marketing_templates" ON public.marketing_templates;

CREATE POLICY "Staff can view marketing templates"
ON public.marketing_templates
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert marketing templates"
ON public.marketing_templates
FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update marketing templates"
ON public.marketing_templates
FOR UPDATE
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Admins can delete marketing templates"
ON public.marketing_templates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
