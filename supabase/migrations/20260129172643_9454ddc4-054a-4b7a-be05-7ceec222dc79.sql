-- Pet medications table
CREATE TABLE public.pet_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pet feeding schedules table
CREATE TABLE public.pet_feeding_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  food_type TEXT NOT NULL,
  amount TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pet care logs table (for tracking medication/feeding administration)
CREATE TABLE public.pet_care_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL CHECK (log_type IN ('medication', 'feeding')),
  reference_id UUID NOT NULL,
  administered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  administered_by UUID NOT NULL,
  amount_given TEXT,
  amount_taken TEXT,
  notes TEXT,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_feeding_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_care_logs ENABLE ROW LEVEL SECURITY;

-- RLS for pet_medications
CREATE POLICY "Clients can view their pets medications"
  ON public.pet_medications FOR SELECT
  USING (pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can insert their pets medications"
  ON public.pet_medications FOR INSERT
  WITH CHECK (pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can update their pets medications"
  ON public.pet_medications FOR UPDATE
  USING (pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can delete their pets medications"
  ON public.pet_medications FOR DELETE
  USING (pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Staff can view all medications"
  ON public.pet_medications FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update medications"
  ON public.pet_medications FOR UPDATE
  USING (is_staff_or_admin(auth.uid()));

-- RLS for pet_feeding_schedules
CREATE POLICY "Clients can view their pets feeding schedules"
  ON public.pet_feeding_schedules FOR SELECT
  USING (pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can insert their pets feeding schedules"
  ON public.pet_feeding_schedules FOR INSERT
  WITH CHECK (pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can update their pets feeding schedules"
  ON public.pet_feeding_schedules FOR UPDATE
  USING (pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can delete their pets feeding schedules"
  ON public.pet_feeding_schedules FOR DELETE
  USING (pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Staff can view all feeding schedules"
  ON public.pet_feeding_schedules FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update feeding schedules"
  ON public.pet_feeding_schedules FOR UPDATE
  USING (is_staff_or_admin(auth.uid()));

-- RLS for pet_care_logs
CREATE POLICY "Clients can view their pets care logs"
  ON public.pet_care_logs FOR SELECT
  USING (pet_id IN (
    SELECT p.id FROM pets p
    JOIN clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Staff can view all care logs"
  ON public.pet_care_logs FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert care logs"
  ON public.pet_care_logs FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update care logs"
  ON public.pet_care_logs FOR UPDATE
  USING (is_staff_or_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_pet_medications_updated_at
  BEFORE UPDATE ON public.pet_medications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pet_feeding_schedules_updated_at
  BEFORE UPDATE ON public.pet_feeding_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better performance
CREATE INDEX idx_pet_medications_pet_id ON public.pet_medications(pet_id);
CREATE INDEX idx_pet_feeding_schedules_pet_id ON public.pet_feeding_schedules(pet_id);
CREATE INDEX idx_pet_care_logs_pet_id ON public.pet_care_logs(pet_id);
CREATE INDEX idx_pet_care_logs_reference_id ON public.pet_care_logs(reference_id);
CREATE INDEX idx_pet_care_logs_administered_at ON public.pet_care_logs(administered_at DESC);