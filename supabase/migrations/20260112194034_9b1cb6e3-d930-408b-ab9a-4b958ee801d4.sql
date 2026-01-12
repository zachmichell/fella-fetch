-- Add RLS policy for clients to view their pets' report cards
CREATE POLICY "Clients can view their pets report cards"
ON public.report_cards
FOR SELECT
USING (
  pet_id IN (
    SELECT p.id FROM public.pets p
    JOIN public.clients c ON p.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- Create atomic credit deduction function for daycare
CREATE OR REPLACE FUNCTION public.deduct_daycare_credit(p_client_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE clients
  SET daycare_credits = daycare_credits - 1
  WHERE id = p_client_id AND daycare_credits > 0
  RETURNING daycare_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$;

-- Create atomic credit deduction function for boarding
CREATE OR REPLACE FUNCTION public.deduct_boarding_credits(p_client_id UUID, p_nights INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE clients
  SET boarding_credits = GREATEST(0, boarding_credits - p_nights)
  WHERE id = p_client_id AND boarding_credits >= 0
  RETURNING boarding_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$;

-- Create atomic credit restoration function for daycare (for revert)
CREATE OR REPLACE FUNCTION public.restore_daycare_credit(p_client_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE clients
  SET daycare_credits = daycare_credits + 1
  WHERE id = p_client_id
  RETURNING daycare_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$;

-- Create atomic credit restoration function for boarding (for revert)
CREATE OR REPLACE FUNCTION public.restore_boarding_credits(p_client_id UUID, p_nights INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE clients
  SET boarding_credits = boarding_credits + p_nights
  WHERE id = p_client_id
  RETURNING boarding_credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$;