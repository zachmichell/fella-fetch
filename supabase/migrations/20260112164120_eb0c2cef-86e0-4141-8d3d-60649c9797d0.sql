-- Allow clients to insert pets for themselves
CREATE POLICY "Clients can insert their own pets"
ON public.pets
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);