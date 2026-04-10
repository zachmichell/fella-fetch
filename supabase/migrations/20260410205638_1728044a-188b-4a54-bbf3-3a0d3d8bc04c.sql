
-- Create function to auto-insert disabled service permissions for new clients
CREATE OR REPLACE FUNCTION public.create_default_service_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_service_permissions (client_id, service_type_id, is_allowed)
  SELECT NEW.id, st.id, false
  FROM public.service_types st
  WHERE st.is_active = true;
  
  RETURN NEW;
END;
$$;

-- Create trigger on clients table
CREATE TRIGGER on_client_created_add_permissions
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_service_permissions();
