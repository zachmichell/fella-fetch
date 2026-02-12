
-- 1. Turn-aways table
CREATE TABLE public.turn_aways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL CHECK (service_type IN ('daycare', 'boarding')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  estimated_value numeric,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.turn_aways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view turn_aways" ON public.turn_aways FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert turn_aways" ON public.turn_aways FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update turn_aways" ON public.turn_aways FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins can delete turn_aways" ON public.turn_aways FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 2. Incidents table
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id),
  reservation_id uuid REFERENCES public.reservations(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  severity text NOT NULL CHECK (severity IN ('Low', 'Medium', 'High')),
  category text NOT NULL CHECK (category IN ('Bite', 'Injury', 'Illness', 'Escape', 'Fight', 'Other')),
  description text NOT NULL,
  action_taken text,
  reported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view incidents" ON public.incidents FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert incidents" ON public.incidents FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update incidents" ON public.incidents FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins can delete incidents" ON public.incidents FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 3. Class types
CREATE TABLE public.class_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  description text,
  max_capacity integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.class_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view class_types" ON public.class_types FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert class_types" ON public.class_types FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update class_types" ON public.class_types FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins can delete class_types" ON public.class_types FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 4. Class sessions
CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id uuid NOT NULL REFERENCES public.class_types(id),
  start_date date NOT NULL,
  end_date date,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  instructor text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view class_sessions" ON public.class_sessions FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert class_sessions" ON public.class_sessions FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update class_sessions" ON public.class_sessions FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins can delete class_sessions" ON public.class_sessions FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 5. Class enrollments
CREATE TABLE public.class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_session_id uuid NOT NULL REFERENCES public.class_sessions(id),
  pet_id uuid NOT NULL REFERENCES public.pets(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  status text NOT NULL DEFAULT 'Interested' CHECK (status IN ('Interested', 'Enrolled', 'Graduated', 'Dropped')),
  enrolled_at timestamptz,
  graduated_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view class_enrollments" ON public.class_enrollments FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert class_enrollments" ON public.class_enrollments FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update class_enrollments" ON public.class_enrollments FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins can delete class_enrollments" ON public.class_enrollments FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 6. Add commission_rate to groomers
ALTER TABLE public.groomers ADD COLUMN commission_rate numeric NOT NULL DEFAULT 50;

-- 7. Add update triggers
CREATE TRIGGER update_class_types_updated_at BEFORE UPDATE ON public.class_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_sessions_updated_at BEFORE UPDATE ON public.class_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_enrollments_updated_at BEFORE UPDATE ON public.class_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
