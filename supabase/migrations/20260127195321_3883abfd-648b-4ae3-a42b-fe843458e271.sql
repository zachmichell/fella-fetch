-- Create groomers table for managing grooming staff
CREATE TABLE public.groomers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.groomers ENABLE ROW LEVEL SECURITY;

-- Staff can view all groomers
CREATE POLICY "Staff can view all groomers" 
ON public.groomers 
FOR SELECT 
USING (is_staff_or_admin(auth.uid()));

-- Staff can insert groomers
CREATE POLICY "Staff can insert groomers" 
ON public.groomers 
FOR INSERT 
WITH CHECK (is_staff_or_admin(auth.uid()));

-- Staff can update groomers
CREATE POLICY "Staff can update groomers" 
ON public.groomers 
FOR UPDATE 
USING (is_staff_or_admin(auth.uid()));

-- Admins can delete groomers
CREATE POLICY "Admins can delete groomers" 
ON public.groomers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_groomers_updated_at
BEFORE UPDATE ON public.groomers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add groomer_id column to reservations for grooming assignments
ALTER TABLE public.reservations ADD COLUMN groomer_id UUID REFERENCES public.groomers(id);

-- Insert some sample groomers
INSERT INTO public.groomers (name, email, color, sort_order) VALUES
('Sarah Smith', 'sarah@fellafetch.ca', '#3b82f6', 1),
('Mike Johnson', 'mike@fellafetch.ca', '#10b981', 2),
('Emma Wilson', 'emma@fellafetch.ca', '#f59e0b', 3);