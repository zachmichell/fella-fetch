-- Drop the existing client insert policy and recreate with authenticated role
DROP POLICY IF EXISTS "Clients can insert own questionnaires" ON public.groom_questionnaires;

CREATE POLICY "Clients can insert own questionnaires"
ON public.groom_questionnaires
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (
    SELECT clients.id FROM clients WHERE clients.user_id = auth.uid()
  )
);