-- Create groomer_schedules table to store weekly availability for each groomer
CREATE TABLE public.groomer_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  groomer_id UUID NOT NULL REFERENCES public.groomers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(groomer_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.groomer_schedules ENABLE ROW LEVEL SECURITY;

-- Staff can view all schedules
CREATE POLICY "Staff can view all groomer schedules"
ON public.groomer_schedules
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

-- Staff can insert schedules
CREATE POLICY "Staff can insert groomer schedules"
ON public.groomer_schedules
FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

-- Staff can update schedules
CREATE POLICY "Staff can update groomer schedules"
ON public.groomer_schedules
FOR UPDATE
USING (is_staff_or_admin(auth.uid()));

-- Staff can delete schedules
CREATE POLICY "Staff can delete groomer schedules"
ON public.groomer_schedules
FOR DELETE
USING (is_staff_or_admin(auth.uid()));

-- Authenticated clients can view schedules for booking
CREATE POLICY "Clients can view groomer schedules for booking"
ON public.groomer_schedules
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Also allow clients to view groomers for booking
CREATE POLICY "Clients can view active groomers for booking"
ON public.groomers
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Add update trigger
CREATE TRIGGER update_groomer_schedules_updated_at
BEFORE UPDATE ON public.groomer_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default schedules for existing groomers (Mon-Sat, 9am-5pm)
INSERT INTO public.groomer_schedules (groomer_id, day_of_week, start_time, end_time, is_available)
SELECT g.id, dow.day, '09:00', '17:00', CASE WHEN dow.day = 0 THEN false ELSE true END
FROM public.groomers g
CROSS JOIN (SELECT generate_series(0, 6) AS day) dow
ON CONFLICT (groomer_id, day_of_week) DO NOTHING;