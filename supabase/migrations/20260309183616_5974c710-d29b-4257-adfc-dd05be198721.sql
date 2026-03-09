
-- 1. Add grooming fields to pets table
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS coat_type text,
  ADD COLUMN IF NOT EXISTS current_condition text,
  ADD COLUMN IF NOT EXISTS groom_level integer,
  ADD COLUMN IF NOT EXISTS level_expiration_date date;

-- 2. Add intake/scheduling fields and user_id to groomers table
ALTER TABLE public.groomers
  ADD COLUMN IF NOT EXISTS intake_style text NOT NULL DEFAULT 'One-At-A-Time',
  ADD COLUMN IF NOT EXISTS stagger_duration integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS end_of_day_safeguard boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eod_buffer_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_concurrent integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- 3. Create groomer_service_matrix table
CREATE TABLE public.groomer_service_matrix (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  groomer_id uuid NOT NULL REFERENCES public.groomers(id) ON DELETE CASCADE,
  shopify_product_id text NOT NULL,
  shopify_variant_id text NOT NULL,
  pet_size text NOT NULL,
  groom_level integer NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (groomer_id, shopify_variant_id, pet_size, groom_level)
);

ALTER TABLE public.groomer_service_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view service matrix" ON public.groomer_service_matrix
  FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert service matrix" ON public.groomer_service_matrix
  FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update service matrix" ON public.groomer_service_matrix
  FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete service matrix" ON public.groomer_service_matrix
  FOR DELETE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Anyone can view service matrix for booking" ON public.groomer_service_matrix
  FOR SELECT USING (true);

-- 4. Create groom_questionnaires table
CREATE TABLE public.groom_questionnaires (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  coat_condition text,
  matting_level text,
  behavior_concerns text,
  last_groom_location text,
  last_groom_timeframe text,
  photo_urls text[] DEFAULT '{}',
  admin_notes text,
  assigned_groom_level integer,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.groom_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can insert own questionnaires" ON public.groom_questionnaires
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );
CREATE POLICY "Clients can view own questionnaires" ON public.groom_questionnaires
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );
CREATE POLICY "Staff can view all questionnaires" ON public.groom_questionnaires
  FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert questionnaires" ON public.groom_questionnaires
  FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update questionnaires" ON public.groom_questionnaires
  FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete questionnaires" ON public.groom_questionnaires
  FOR DELETE USING (is_staff_or_admin(auth.uid()));

-- 5. Helper function
CREATE OR REPLACE FUNCTION public.is_groomer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'groomer'
  )
$$;

-- 6. Groomer RLS policies
CREATE POLICY "Groomers can view own record" ON public.groomers
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Groomers can update own settings" ON public.groomers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Groomers can view own schedules" ON public.groomer_schedules
  FOR SELECT USING (
    groomer_id IN (SELECT id FROM public.groomers WHERE user_id = auth.uid())
  );

CREATE POLICY "Groomers can view own reservations" ON public.reservations
  FOR SELECT USING (
    groomer_id IN (SELECT id FROM public.groomers WHERE user_id = auth.uid())
  );
CREATE POLICY "Groomers can update own reservations" ON public.reservations
  FOR UPDATE USING (
    groomer_id IN (SELECT id FROM public.groomers WHERE user_id = auth.uid())
  );

CREATE POLICY "Groomers can update pets groom level" ON public.pets
  FOR UPDATE USING (is_groomer(auth.uid()));
CREATE POLICY "Groomers can view pets" ON public.pets
  FOR SELECT USING (is_groomer(auth.uid()));
CREATE POLICY "Groomers can view clients" ON public.clients
  FOR SELECT USING (is_groomer(auth.uid()));
CREATE POLICY "Groomers can view settings" ON public.system_settings
  FOR SELECT USING (is_groomer(auth.uid()));

CREATE POLICY "Groomers can view own service matrix" ON public.groomer_service_matrix
  FOR SELECT USING (
    groomer_id IN (SELECT id FROM public.groomers WHERE user_id = auth.uid())
  );

-- 7. Update groomers_public view
DROP VIEW IF EXISTS public.groomers_public;
CREATE VIEW public.groomers_public AS
  SELECT id, name, color, is_active, sort_order, intake_style, stagger_duration, max_concurrent, end_of_day_safeguard, eod_buffer_minutes
  FROM public.groomers
  WHERE is_active = true;
