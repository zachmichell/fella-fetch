-- We need to add back a policy for staff to view all groomers (including email/phone)
-- The public view is for unauthenticated/client access only

-- Staff can view all groomers (including sensitive fields) for management
CREATE POLICY "Staff can view all groomers including contact info"
ON public.groomers
FOR SELECT
USING (is_staff_or_admin(auth.uid()));