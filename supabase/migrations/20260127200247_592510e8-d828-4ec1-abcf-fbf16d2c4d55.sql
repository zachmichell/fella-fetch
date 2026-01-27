-- Create table for groomer-specific service durations
CREATE TABLE public.groomer_service_durations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  groomer_id UUID NOT NULL REFERENCES public.groomers(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(groomer_id, shopify_variant_id)
);

-- Enable RLS
ALTER TABLE public.groomer_service_durations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view all groomer durations"
  ON public.groomer_service_durations
  FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert groomer durations"
  ON public.groomer_service_durations
  FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update groomer durations"
  ON public.groomer_service_durations
  FOR UPDATE
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete groomer durations"
  ON public.groomer_service_durations
  FOR DELETE
  USING (is_staff_or_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_groomer_service_durations_updated_at
  BEFORE UPDATE ON public.groomer_service_durations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();