
-- Create groomer_available_dates table for specific date-based scheduling
CREATE TABLE public.groomer_available_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  groomer_id uuid NOT NULL REFERENCES public.groomers(id) ON DELETE CASCADE,
  available_date date NOT NULL,
  start_time time NOT NULL DEFAULT '09:00:00',
  end_time time NOT NULL DEFAULT '17:00:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(groomer_id, available_date)
);

-- Enable RLS
ALTER TABLE public.groomer_available_dates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view available dates for booking"
  ON public.groomer_available_dates FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert available dates"
  ON public.groomer_available_dates FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update available dates"
  ON public.groomer_available_dates FOR UPDATE
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete available dates"
  ON public.groomer_available_dates FOR DELETE
  USING (is_staff_or_admin(auth.uid()));
