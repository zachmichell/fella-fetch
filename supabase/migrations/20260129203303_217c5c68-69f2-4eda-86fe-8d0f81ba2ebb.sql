-- Add payment_pending field to reservations table
ALTER TABLE public.reservations 
ADD COLUMN payment_pending boolean NOT NULL DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.reservations.payment_pending IS 'Indicates if the client chose "Pay In Store" at booking and payment is still owed';