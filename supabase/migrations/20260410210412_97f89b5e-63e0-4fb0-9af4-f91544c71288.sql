CREATE POLICY "Clients can view their pets activity logs"
ON public.pet_activity_logs FOR SELECT
TO authenticated
USING (
  pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);