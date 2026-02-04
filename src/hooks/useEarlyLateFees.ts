import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EarlyLateFeesSettings {
  weekday: {
    earlyDropOffBefore: string;
    latePickupAfter: string;
  };
  weekend: {
    earlyDropOffBefore: string;
    latePickupAfter: string;
  };
  earlyDropOffProductId: string | null;
  earlyDropOffProductTitle: string | null;
  latePickupProductId: string | null;
  latePickupProductTitle: string | null;
}

const DEFAULT_EARLY_LATE_FEES: EarlyLateFeesSettings = {
  weekday: {
    earlyDropOffBefore: '7:00 AM',
    latePickupAfter: '6:00 PM',
  },
  weekend: {
    earlyDropOffBefore: '8:00 AM',
    latePickupAfter: '5:00 PM',
  },
  earlyDropOffProductId: null,
  earlyDropOffProductTitle: null,
  latePickupProductId: null,
  latePickupProductTitle: null,
};

export function useEarlyLateFees() {
  const queryClient = useQueryClient();

  const { data: earlyLateFees, isLoading } = useQuery({
    queryKey: ['early-late-fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'early_late_fees')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.value) {
        const value = data.value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value) as EarlyLateFeesSettings;
          } catch {
            return DEFAULT_EARLY_LATE_FEES;
          }
        }
        if (typeof value === 'object' && value !== null && 'weekday' in value && 'weekend' in value) {
          return value as unknown as EarlyLateFeesSettings;
        }
        return DEFAULT_EARLY_LATE_FEES;
      }
      
      return DEFAULT_EARLY_LATE_FEES;
    },
  });

  const updateEarlyLateFees = useMutation({
    mutationFn: async (settings: EarlyLateFeesSettings) => {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'early_late_fees')
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('system_settings')
          .update({ value: JSON.stringify(settings) })
          .eq('key', 'early_late_fees')
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('system_settings')
          .insert({ 
            key: 'early_late_fees', 
            value: JSON.stringify(settings),
            description: 'Early drop-off and late pickup fee thresholds with linked Shopify products'
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['early-late-fees'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });

  return {
    earlyLateFees: earlyLateFees || DEFAULT_EARLY_LATE_FEES,
    isLoading,
    updateEarlyLateFees,
  };
}
