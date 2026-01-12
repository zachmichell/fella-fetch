-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Clients can view their own record" ON public.clients;

CREATE POLICY "Clients can view their own record"
ON public.clients
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);