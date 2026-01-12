-- Create activity log table for tracking all pet-related actions
CREATE TABLE public.pet_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  description TEXT NOT NULL,
  details JSONB,
  performed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_pet_activity_logs_pet_id ON public.pet_activity_logs(pet_id);
CREATE INDEX idx_pet_activity_logs_reservation_id ON public.pet_activity_logs(reservation_id);
CREATE INDEX idx_pet_activity_logs_created_at ON public.pet_activity_logs(created_at DESC);
CREATE INDEX idx_pet_activity_logs_action_type ON public.pet_activity_logs(action_type);

-- Enable RLS
ALTER TABLE public.pet_activity_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view all activity logs
CREATE POLICY "Staff can view all activity logs"
ON public.pet_activity_logs
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

-- Staff can insert activity logs
CREATE POLICY "Staff can insert activity logs"
ON public.pet_activity_logs
FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

-- Add comment for documentation
COMMENT ON TABLE public.pet_activity_logs IS 'Comprehensive audit trail for all pet-related actions including check-ins, check-outs, profile updates, and reservation changes';