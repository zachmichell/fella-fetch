import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CareLogEntry {
  id: string;
  log_type: 'feeding' | 'medication';
  administered_at: string;
  administered_by: string;
  amount_given: string | null;
  amount_taken: string | null;
  notes: string | null;
  pet_id: string;
  reservation_id: string | null;
  reference_id: string;
  // Joined data
  reference_name?: string;
}

export function useVisitCareLogs(petId: string | undefined, reservationId: string | undefined) {
  return useQuery({
    queryKey: ['visit-care-logs', petId, reservationId],
    queryFn: async () => {
      if (!petId) return [];

      // Get care logs for this pet from the current reservation (or recent ones if no reservation)
      let query = supabase
        .from('pet_care_logs')
        .select('*')
        .eq('pet_id', petId)
        .order('administered_at', { ascending: false })
        .limit(10);

      if (reservationId) {
        query = query.eq('reservation_id', reservationId);
      }

      const { data: logs, error } = await query;

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      // Get feeding schedule names
      const feedingIds = logs
        .filter(l => l.log_type === 'feeding')
        .map(l => l.reference_id);
      
      // Get medication names
      const medIds = logs
        .filter(l => l.log_type === 'medication')
        .map(l => l.reference_id);

      const [feedingRes, medRes] = await Promise.all([
        feedingIds.length > 0
          ? supabase
              .from('pet_feeding_schedules')
              .select('id, food_type')
              .in('id', feedingIds)
          : Promise.resolve({ data: [] }),
        medIds.length > 0
          ? supabase
              .from('pet_medications')
              .select('id, name')
              .in('id', medIds)
          : Promise.resolve({ data: [] }),
      ]);

      const feedingMap = new Map(
        (feedingRes.data || []).map(f => [f.id, f.food_type])
      );
      const medMap = new Map(
        (medRes.data || []).map(m => [m.id, m.name])
      );

      // Enrich logs with reference names
      return logs.map(log => ({
        ...log,
        log_type: log.log_type as 'feeding' | 'medication',
        reference_name:
          log.log_type === 'feeding'
            ? feedingMap.get(log.reference_id) || 'Food'
            : medMap.get(log.reference_id) || 'Medication',
      })) as CareLogEntry[];
    },
    enabled: !!petId,
    refetchInterval: 30000, // Refresh every 30 seconds for live updates
  });
}
