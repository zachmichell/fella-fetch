-- Create table for Shopify product/collection mappings to service types
CREATE TABLE public.shopify_service_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_product_id text NOT NULL,
    shopify_product_title text NOT NULL,
    service_type public.service_type NOT NULL,
    credit_value integer DEFAULT 1,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(shopify_product_id, service_type)
);

-- Create table for collection categorization
CREATE TABLE public.shopify_collection_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_collection_id text NOT NULL UNIQUE,
    shopify_collection_title text NOT NULL,
    category text NOT NULL CHECK (category IN ('reservations', 'services', 'retail')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopify_service_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_collection_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopify_service_mappings
CREATE POLICY "Staff can view all service mappings"
ON public.shopify_service_mappings FOR SELECT
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert service mappings"
ON public.shopify_service_mappings FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update service mappings"
ON public.shopify_service_mappings FOR UPDATE
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete service mappings"
ON public.shopify_service_mappings FOR DELETE
USING (is_staff_or_admin(auth.uid()));

-- RLS Policies for shopify_collection_mappings
CREATE POLICY "Staff can view all collection mappings"
ON public.shopify_collection_mappings FOR SELECT
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert collection mappings"
ON public.shopify_collection_mappings FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update collection mappings"
ON public.shopify_collection_mappings FOR UPDATE
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete collection mappings"
ON public.shopify_collection_mappings FOR DELETE
USING (is_staff_or_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_shopify_service_mappings_updated_at
BEFORE UPDATE ON public.shopify_service_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopify_collection_mappings_updated_at
BEFORE UPDATE ON public.shopify_collection_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();