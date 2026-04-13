CREATE POLICY "Authenticated users can view active groomers via public view"
ON public.groomers
FOR SELECT
TO authenticated
USING (is_active = true);