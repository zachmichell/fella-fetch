import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemSetting {
  id: string;
  key: string;
  value: string | number | boolean | object;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useSystemSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');
      
      if (error) throw error;
      return data as SystemSetting[];
    },
  });

  const getSetting = <T = string>(key: string, defaultValue: T): T => {
    const setting = settings?.find(s => s.key === key);
    if (!setting) return defaultValue;
    
    // Parse the JSONB value
    const value = setting.value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    }
    return value as T;
  };

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | number | boolean | object }) => {
      const { data, error } = await supabase
        .from('system_settings')
        .update({ value: JSON.stringify(value) })
        .eq('key', key)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });

  return {
    settings,
    isLoading,
    getSetting,
    updateSetting,
  };
}

export function usePetInactivityDays() {
  const { getSetting, isLoading } = useSystemSettings();
  return {
    inactivityDays: getSetting<number>('pet_inactivity_days', 90),
    isLoading,
  };
}
