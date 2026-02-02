-- Add staff_id column to track who responded
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add read_at column for message status
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Update RLS policies to allow staff to insert messages (responses)
CREATE POLICY "Staff can insert messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (is_staff_or_admin(auth.uid()));

-- Allow staff to update messages (mark as read)
CREATE POLICY "Staff can update messages" 
ON public.chat_messages 
FOR UPDATE 
USING (is_staff_or_admin(auth.uid()));

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;