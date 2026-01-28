-- Allow authenticated clients to view service mappings for booking purposes
CREATE POLICY "Authenticated users can view service mappings for booking"
ON public.shopify_service_mappings
FOR SELECT
USING (auth.uid() IS NOT NULL);