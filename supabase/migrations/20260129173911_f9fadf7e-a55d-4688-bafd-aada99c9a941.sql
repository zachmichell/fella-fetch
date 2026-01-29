-- Create notifications table for in-app notifications
CREATE TABLE public.client_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data JSONB
);

-- Create push subscriptions table for browser push
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_client_notifications_client_id ON public.client_notifications(client_id);
CREATE INDEX idx_client_notifications_read_at ON public.client_notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_push_subscriptions_client_id ON public.push_subscriptions(client_id);

-- Enable RLS
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_notifications
CREATE POLICY "Clients can view their own notifications"
ON public.client_notifications FOR SELECT
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients can update their own notifications"
ON public.client_notifications FOR UPDATE
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Staff can insert notifications"
ON public.client_notifications FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can view all notifications"
ON public.client_notifications FOR SELECT
USING (is_staff_or_admin(auth.uid()));

-- RLS policies for push_subscriptions
CREATE POLICY "Clients can manage their own push subscriptions"
ON public.push_subscriptions FOR ALL
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Staff can view push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (is_staff_or_admin(auth.uid()));