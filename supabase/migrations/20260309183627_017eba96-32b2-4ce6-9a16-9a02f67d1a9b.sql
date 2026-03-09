
-- Fix security definer view by making it security invoker
DROP VIEW IF EXISTS public.groomers_public;
CREATE VIEW public.groomers_public WITH (security_invoker = true) AS
  SELECT id, name, color, is_active, sort_order, intake_style, stagger_duration, max_concurrent, end_of_day_safeguard, eod_buffer_minutes
  FROM public.groomers
  WHERE is_active = true;
