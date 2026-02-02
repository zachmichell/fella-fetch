-- Create a secure view for public groomer data that only exposes safe fields
CREATE OR REPLACE VIEW public.groomers_public AS
SELECT id, name, color, is_active, sort_order
FROM public.groomers
WHERE is_active = true;

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.groomers_public TO anon, authenticated;

-- Add a comment explaining the purpose
COMMENT ON VIEW public.groomers_public IS 'Public view of groomers for booking - excludes email/phone for privacy';

-- Drop the existing public policy on groomers table that exposes all fields
DROP POLICY IF EXISTS "Anyone can view active groomers for booking" ON public.groomers;