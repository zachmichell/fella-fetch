-- Allow clients to update read_at on messages sent to them (staff messages)
CREATE POLICY "Clients can update read_at on their messages"
ON public.chat_messages
FOR UPDATE
USING (client_id IN (
  SELECT clients.id
  FROM clients
  WHERE clients.user_id = auth.uid()
))
WITH CHECK (client_id IN (
  SELECT clients.id
  FROM clients
  WHERE clients.user_id = auth.uid()
));