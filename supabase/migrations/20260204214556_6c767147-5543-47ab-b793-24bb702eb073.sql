-- Create marketing templates table
CREATE TABLE public.marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sms', 'email')),
  subject TEXT, -- Only for email
  content TEXT NOT NULL, -- For SMS this is the message, for email this is JSON content
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;

-- Staff can manage templates (no auth required for staff portal)
CREATE POLICY "Allow all access to marketing_templates"
ON public.marketing_templates
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_marketing_templates_updated_at
BEFORE UPDATE ON public.marketing_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();