-- Add Low Half Day Credits preset segment
INSERT INTO public.marketing_segments (name, description, filters, is_preset)
VALUES (
  'Low Half Day Credits',
  'Clients with 2 or fewer half-day credits',
  '[{"field": "half_daycare_credits", "operator": "lte", "value": 2}]'::jsonb,
  true
);