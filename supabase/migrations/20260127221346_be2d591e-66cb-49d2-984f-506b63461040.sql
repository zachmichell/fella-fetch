-- Fix PUBLIC_SERVICE_TYPES: Restrict service_types SELECT to authenticated users only
-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active service types" ON public.service_types;

-- Create new policy that requires authentication
-- Authenticated users can view active service types, staff can view all
CREATE POLICY "Authenticated users can view active service types" 
ON public.service_types 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    (is_active = true) OR is_staff_or_admin(auth.uid())
  )
);