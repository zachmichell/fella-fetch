-- Add user_id column to clients table to link clients with auth users
ALTER TABLE public.clients 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_clients_user_id ON public.clients(user_id);

-- Add RLS policy for clients to view their own data
CREATE POLICY "Clients can view their own record"
ON public.clients
FOR SELECT
USING (auth.uid() = user_id);

-- Add RLS policy for clients to view their own pets
CREATE POLICY "Clients can view their own pets"
ON public.pets
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Add RLS policy for clients to view their own reservations through their pets
CREATE POLICY "Clients can view their own reservations"
ON public.reservations
FOR SELECT
USING (
  pet_id IN (
    SELECT p.id FROM public.pets p
    JOIN public.clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);