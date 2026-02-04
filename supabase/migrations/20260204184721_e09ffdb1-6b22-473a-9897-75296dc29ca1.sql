-- Create junction table for client service permissions
-- By default, all clients can book all services (no record = allowed)
-- A record with is_allowed = false means the client cannot book that service type
CREATE TABLE public.client_service_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  is_allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, service_type_id)
);

-- Enable RLS
ALTER TABLE public.client_service_permissions ENABLE ROW LEVEL SECURITY;

-- Staff/Admin can manage all permissions
CREATE POLICY "Staff and admin can view all client service permissions"
  ON public.client_service_permissions
  FOR SELECT
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff and admin can insert client service permissions"
  ON public.client_service_permissions
  FOR INSERT
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff and admin can update client service permissions"
  ON public.client_service_permissions
  FOR UPDATE
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff and admin can delete client service permissions"
  ON public.client_service_permissions
  FOR DELETE
  USING (public.is_staff_or_admin(auth.uid()));

-- Clients can view their own permissions (to know what they can book)
CREATE POLICY "Clients can view their own service permissions"
  ON public.client_service_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_service_permissions.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Create trigger for updating updated_at
CREATE TRIGGER update_client_service_permissions_updated_at
  BEFORE UPDATE ON public.client_service_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();