-- Add parent_reservation_id to link add-on services to parent reservations
ALTER TABLE public.reservations 
ADD COLUMN parent_reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE;

-- Add index for efficient lookups
CREATE INDEX idx_reservations_parent_id ON public.reservations(parent_reservation_id) WHERE parent_reservation_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.reservations.parent_reservation_id IS 'Links add-on services (e.g., grooming) to parent reservations (e.g., daycare/boarding)';