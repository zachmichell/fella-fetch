-- Add allergies field to pets table
ALTER TABLE public.pets 
ADD COLUMN allergies text;

-- Create pet_notes table for staff notes on pets
CREATE TABLE public.pet_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  note text NOT NULL,
  source_type text, -- 'manual', 'reservation', 'grooming', etc.
  source_id uuid, -- optional reference to reservation/service
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create client_notes table for staff notes on clients
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note text NOT NULL,
  source_type text, -- 'manual', 'reservation', etc.
  source_id uuid, -- optional reference
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Pet notes policies (staff only)
CREATE POLICY "Staff can view all pet notes"
  ON public.pet_notes FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert pet notes"
  ON public.pet_notes FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update pet notes"
  ON public.pet_notes FOR UPDATE
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete pet notes"
  ON public.pet_notes FOR DELETE
  USING (is_staff_or_admin(auth.uid()));

-- Client notes policies (staff only)
CREATE POLICY "Staff can view all client notes"
  ON public.client_notes FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert client notes"
  ON public.client_notes FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update client notes"
  ON public.client_notes FOR UPDATE
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete client notes"
  ON public.client_notes FOR DELETE
  USING (is_staff_or_admin(auth.uid()));

-- Create updated_at triggers
CREATE TRIGGER update_pet_notes_updated_at
  BEFORE UPDATE ON public.pet_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_notes_updated_at
  BEFORE UPDATE ON public.client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();