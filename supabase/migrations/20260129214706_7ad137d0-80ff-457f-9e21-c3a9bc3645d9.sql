-- Update groomers RLS policy to allow public access for booking
DROP POLICY IF EXISTS "Clients can view active groomers for booking" ON public.groomers;
CREATE POLICY "Anyone can view active groomers for booking" 
ON public.groomers 
FOR SELECT 
USING (is_active = true);

-- Update groomer_schedules RLS policy to allow public access for booking
DROP POLICY IF EXISTS "Clients can view groomer schedules for booking" ON public.groomer_schedules;
CREATE POLICY "Anyone can view groomer schedules for booking" 
ON public.groomer_schedules 
FOR SELECT 
USING (true);