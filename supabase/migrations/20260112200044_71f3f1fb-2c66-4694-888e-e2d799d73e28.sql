-- Fix credit functions to require staff/admin authorization
-- Drop existing functions and recreate with authorization checks

DROP FUNCTION IF EXISTS public.deduct_daycare_credit(uuid);
DROP FUNCTION IF EXISTS public.deduct_boarding_credits(uuid, integer);
DROP FUNCTION IF EXISTS public.restore_daycare_credit(uuid);
DROP FUNCTION IF EXISTS public.restore_boarding_credits(uuid, integer);

-- Recreate deduct_daycare_credit with authorization check
CREATE OR REPLACE FUNCTION public.deduct_daycare_credit(p_client_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  -- Authorization check: only staff or admin can modify credits
  IF NOT is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: staff access required';
  END IF;
  
  UPDATE clients
  SET daycare_credits = daycare_credits - 1
  WHERE id = p_client_id AND daycare_credits > 0
  RETURNING daycare_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$;

-- Recreate deduct_boarding_credits with authorization check
CREATE OR REPLACE FUNCTION public.deduct_boarding_credits(p_client_id UUID, p_nights INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  -- Authorization check: only staff or admin can modify credits
  IF NOT is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: staff access required';
  END IF;
  
  UPDATE clients
  SET boarding_credits = GREATEST(0, boarding_credits - p_nights)
  WHERE id = p_client_id AND boarding_credits >= 0
  RETURNING boarding_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$;

-- Recreate restore_daycare_credit with authorization check
CREATE OR REPLACE FUNCTION public.restore_daycare_credit(p_client_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  -- Authorization check: only staff or admin can modify credits
  IF NOT is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: staff access required';
  END IF;
  
  UPDATE clients
  SET daycare_credits = daycare_credits + 1
  WHERE id = p_client_id
  RETURNING daycare_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$;

-- Recreate restore_boarding_credits with authorization check
CREATE OR REPLACE FUNCTION public.restore_boarding_credits(p_client_id UUID, p_nights INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  -- Authorization check: only staff or admin can modify credits
  IF NOT is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: staff access required';
  END IF;
  
  UPDATE clients
  SET boarding_credits = boarding_credits + p_nights
  WHERE id = p_client_id
  RETURNING boarding_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$;