
CREATE TABLE public.sent_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id TEXT NOT NULL,
  service_type_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reservation_id, service_type_id)
);

ALTER TABLE public.sent_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.sent_reminders FOR ALL USING (false);

CREATE INDEX idx_sent_reminders_lookup ON public.sent_reminders (reservation_id, service_type_id);
