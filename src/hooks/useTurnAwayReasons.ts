import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_REASONS = [
  'Capacity Full',
  'Failed Assessment',
  'Waitlisted',
  'Vaccination Missing',
  'Behavior Issue',
  'Client Cancelled',
  'No Show',
  'Schedule Conflict',
  'Other',
];

export const useTurnAwayReasons = () => {
  const { data: reasons = DEFAULT_REASONS, isLoading } = useQuery({
    queryKey: ['system-settings', 'turn_away_reasons'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'turn_away_reasons')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value)) {
        return data.value as string[];
      }
      return DEFAULT_REASONS;
    },
  });

  return { reasons, isLoading };
};
