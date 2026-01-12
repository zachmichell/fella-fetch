-- Create chat_messages table for storing conversation history
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_chat_messages_client_id ON public.chat_messages(client_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- RLS policies: clients can only see their own messages
CREATE POLICY "Clients can view their own messages"
ON public.chat_messages
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Clients can insert their own messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Staff can view all messages for support purposes
CREATE POLICY "Staff can view all messages"
ON public.chat_messages
FOR SELECT
USING (
  public.is_staff_or_admin(auth.uid())
);