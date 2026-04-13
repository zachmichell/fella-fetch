-- Allow public/anon access to active groomers for booking
-- The existing "Authenticated users can view active groomers via public view" policy 
-- doesn't work for Shopify-authenticated clients who don't have Supabase sessions
DROP POLICY IF EXISTS "Authenticated users can view active groomers via public view" ON public.groomers;

CREATE POLICY "Public can view active groomers for booking"
ON public.groomers
FOR SELECT
TO anon, authenticated
USING (is_active = true);