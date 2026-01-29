-- Allow clients to insert reservations for their own pets
CREATE POLICY "Clients can insert reservations for their own pets"
ON public.reservations
FOR INSERT
WITH CHECK (
  pet_id IN (
    SELECT p.id 
    FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);