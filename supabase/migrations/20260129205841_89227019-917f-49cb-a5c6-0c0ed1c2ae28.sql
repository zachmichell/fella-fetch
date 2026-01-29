-- Create function to deduct half daycare credit
CREATE OR REPLACE FUNCTION public.deduct_half_daycare_credit(p_client_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_credits INTEGER;
BEGIN
  -- Authorization check: only staff or admin can modify credits
  IF NOT is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: staff access required';
  END IF;
  
  UPDATE clients
  SET half_daycare_credits = half_daycare_credits - 1
  WHERE id = p_client_id AND half_daycare_credits > 0
  RETURNING half_daycare_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$function$;

-- Create function to restore half daycare credit
CREATE OR REPLACE FUNCTION public.restore_half_daycare_credit(p_client_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_credits INTEGER;
BEGIN
  -- Authorization check: only staff or admin can modify credits
  IF NOT is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: staff access required';
  END IF;
  
  UPDATE clients
  SET half_daycare_credits = half_daycare_credits + 1
  WHERE id = p_client_id
  RETURNING half_daycare_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$function$;