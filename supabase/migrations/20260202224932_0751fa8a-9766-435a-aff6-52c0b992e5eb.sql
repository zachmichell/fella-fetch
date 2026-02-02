-- Add subscribed boolean to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS subscribed boolean NOT NULL DEFAULT false;

-- Create recurring daycare subscriptions table
CREATE TABLE public.daycare_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  day_type text NOT NULL CHECK (day_type IN ('full', 'half')),
  half_day_period text CHECK (half_day_period IN ('morning', 'afternoon') OR day_type = 'full'),
  days_of_week integer[] NOT NULL, -- 0=Sunday, 1=Monday, etc.
  is_active boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT false,
  approved_at timestamp with time zone,
  approved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  notes text
);

-- Create index for efficient queries
CREATE INDEX idx_daycare_subscriptions_client ON public.daycare_subscriptions(client_id);
CREATE INDEX idx_daycare_subscriptions_pet ON public.daycare_subscriptions(pet_id);
CREATE INDEX idx_daycare_subscriptions_active ON public.daycare_subscriptions(is_active, is_approved);

-- Enable RLS
ALTER TABLE public.daycare_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for daycare_subscriptions
CREATE POLICY "Clients can view their own subscriptions"
ON public.daycare_subscriptions
FOR SELECT
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients can insert their own subscriptions"
ON public.daycare_subscriptions
FOR INSERT
WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Staff can view all subscriptions"
ON public.daycare_subscriptions
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert subscriptions"
ON public.daycare_subscriptions
FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update subscriptions"
ON public.daycare_subscriptions
FOR UPDATE
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Admins can delete subscriptions"
ON public.daycare_subscriptions
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add subscription_id to reservations to link recurring instances
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.daycare_subscriptions(id) ON DELETE SET NULL;

-- Create index for subscription lookups
CREATE INDEX idx_reservations_subscription ON public.reservations(subscription_id);

-- Trigger to update updated_at
CREATE TRIGGER update_daycare_subscriptions_updated_at
BEFORE UPDATE ON public.daycare_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update client subscribed status based on active subscriptions
CREATE OR REPLACE FUNCTION public.update_client_subscribed_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the client's subscribed status based on active approved subscriptions
  UPDATE clients
  SET subscribed = EXISTS (
    SELECT 1 FROM daycare_subscriptions
    WHERE client_id = COALESCE(NEW.client_id, OLD.client_id)
      AND is_active = true
      AND is_approved = true
  )
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to auto-update subscribed status when subscriptions change
CREATE TRIGGER update_client_subscribed_on_subscription_change
AFTER INSERT OR UPDATE OR DELETE ON public.daycare_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_client_subscribed_status();

-- Add comment for documentation
COMMENT ON TABLE public.daycare_subscriptions IS 'Recurring daycare subscriptions for clients. Each subscription generates individual reservations for each occurrence.';
COMMENT ON COLUMN public.clients.subscribed IS 'True if client has at least one active and approved recurring daycare subscription';