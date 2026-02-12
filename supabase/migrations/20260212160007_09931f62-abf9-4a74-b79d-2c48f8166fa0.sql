-- Add attachment columns to chat_messages
ALTER TABLE public.chat_messages 
  ADD COLUMN attachment_url text DEFAULT NULL,
  ADD COLUMN attachment_name text DEFAULT NULL,
  ADD COLUMN attachment_type text DEFAULT NULL;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Storage policies for chat attachments
CREATE POLICY "Anyone authenticated can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);