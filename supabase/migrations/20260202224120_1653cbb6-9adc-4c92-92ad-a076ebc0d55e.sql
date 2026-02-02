-- Drop the existing view and recreate with SECURITY INVOKER (the safe default)
DROP VIEW IF EXISTS public.groomers_public;

CREATE VIEW public.groomers_public 
WITH (security_invoker = true)
AS
SELECT id, name, color, is_active, sort_order
FROM public.groomers
WHERE is_active = true;

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.groomers_public TO anon, authenticated;

-- Add a comment explaining the purpose
COMMENT ON VIEW public.groomers_public IS 'Public view of groomers for booking - excludes email/phone for privacy. Uses SECURITY INVOKER for safe RLS enforcement.';