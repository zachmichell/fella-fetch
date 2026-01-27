-- Create a new table to link service_types to Shopify products
CREATE TABLE public.service_type_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  shopify_product_title TEXT NOT NULL,
  credit_value INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_type_id, shopify_product_id)
);

-- Enable RLS
ALTER TABLE public.service_type_products ENABLE ROW LEVEL SECURITY;

-- Create policies for staff access
CREATE POLICY "Staff can view all service type products"
  ON public.service_type_products FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert service type products"
  ON public.service_type_products FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update service type products"
  ON public.service_type_products FOR UPDATE
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete service type products"
  ON public.service_type_products FOR DELETE
  USING (is_staff_or_admin(auth.uid()));