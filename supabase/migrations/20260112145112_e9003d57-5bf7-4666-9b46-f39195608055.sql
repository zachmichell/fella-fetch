-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create enum for reservation status
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');

-- Create enum for service type
CREATE TYPE public.service_type AS ENUM ('daycare', 'boarding', 'grooming', 'training');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separated from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create clients table (pet owners)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create pets table
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  breed TEXT,
  color TEXT,
  weight DECIMAL(5,2),
  date_of_birth DATE,
  gender TEXT,
  spayed_neutered BOOLEAN DEFAULT false,
  vaccination_rabies DATE,
  vaccination_bordetella DATE,
  vaccination_distemper DATE,
  special_needs TEXT,
  feeding_instructions TEXT,
  behavior_notes TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  service_type service_type NOT NULL,
  status reservation_status DEFAULT 'pending' NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  price DECIMAL(10,2),
  notes TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES auth.users(id),
  checked_out_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create report_cards table (for sending pet updates to owners)
CREATE TABLE public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  mood TEXT,
  energy_level TEXT,
  appetite TEXT,
  activities TEXT,
  notes TEXT,
  photo_urls TEXT[],
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create staff_time_clock table
CREATE TABLE public.staff_time_clock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create daily_capacity table for tracking facility capacity
CREATE TABLE public.daily_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  service_type service_type NOT NULL,
  max_capacity INTEGER DEFAULT 20,
  current_count INTEGER DEFAULT 0,
  UNIQUE (date, service_type)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_time_clock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_capacity ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is staff or admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('staff', 'admin')
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

-- RLS Policies for user_roles (only admins can manage)
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for clients (staff/admin only)
CREATE POLICY "Staff can view all clients" ON public.clients FOR SELECT USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert clients" ON public.clients FOR INSERT WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update clients" ON public.clients FOR UPDATE USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for pets (staff/admin only)
CREATE POLICY "Staff can view all pets" ON public.pets FOR SELECT USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert pets" ON public.pets FOR INSERT WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update pets" ON public.pets FOR UPDATE USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins can delete pets" ON public.pets FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reservations (staff/admin only)
CREATE POLICY "Staff can view all reservations" ON public.reservations FOR SELECT USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert reservations" ON public.reservations FOR INSERT WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update reservations" ON public.reservations FOR UPDATE USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins can delete reservations" ON public.reservations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for report_cards (staff/admin only)
CREATE POLICY "Staff can view all report cards" ON public.report_cards FOR SELECT USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert report cards" ON public.report_cards FOR INSERT WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update report cards" ON public.report_cards FOR UPDATE USING (public.is_staff_or_admin(auth.uid()));

-- RLS Policies for staff_time_clock
CREATE POLICY "Staff can view own time clock" ON public.staff_time_clock FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can insert own time clock" ON public.staff_time_clock FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can update own time clock" ON public.staff_time_clock FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all time clocks" ON public.staff_time_clock FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_capacity (staff/admin only)
CREATE POLICY "Staff can view capacity" ON public.daily_capacity FOR SELECT USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can manage capacity" ON public.daily_capacity FOR ALL USING (public.is_staff_or_admin(auth.uid()));

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();