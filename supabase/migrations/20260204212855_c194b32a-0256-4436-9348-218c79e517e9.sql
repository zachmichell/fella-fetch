-- Create enum for staff code roles
CREATE TYPE public.staff_code_role AS ENUM ('basic', 'supervisor', 'admin');

-- Add role column to staff_codes table
ALTER TABLE public.staff_codes 
ADD COLUMN role public.staff_code_role NOT NULL DEFAULT 'basic';

-- Migrate existing is_admin data to role column
UPDATE public.staff_codes 
SET role = CASE 
  WHEN is_admin = true THEN 'admin'::public.staff_code_role
  ELSE 'basic'::public.staff_code_role
END;

-- Drop the is_admin column after migration
ALTER TABLE public.staff_codes DROP COLUMN is_admin;