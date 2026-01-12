-- Add thread_id column to clients table for OpenAI Assistant thread tracking
ALTER TABLE public.clients 
ADD COLUMN thread_id text;