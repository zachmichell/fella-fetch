import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'activity' | 'care';
  category: string;
  description: string;
  performedBy: string;
  details?: Record<string, unknown> | null;
}

export function useReservationTimeline(reservationId: string | undefined, petId: string | undefined) {
  return useQuery({
    queryKey: ['reservation-timeline', reservationId, petId],
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!reservationId || !petId) return [];

      // Fetch activity logs and care logs in parallel
      const [activityRes, careRes] = await Promise.all([
        supabase
          .from('pet_activity_logs')
          .select('id, created_at, action_type, action_category, description, details, performed_by')
          .eq('reservation_id', reservationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('pet_care_logs')
          .select('id, administered_at, log_type, amount_given, amount_taken, notes, administered_by, reference_id')
          .eq('reservation_id', reservationId)
          .eq('pet_id', petId)
          .order('administered_at', { ascending: false }),
      ]);

      const events: TimelineEvent[] = [];

      // Collect all staff IDs from activity logs for profile lookup
      const activityStaffIds = activityRes.data
        ? [...new Set(activityRes.data.map((l: any) => l.performed_by))]
        : [];

      // Map activity logs - resolve staff names after fetching profiles
      const allStaffIds = [
        ...activityStaffIds,
        ...(careRes.data ? [...new Set(careRes.data.map(l => l.administered_by))] : []),
      ];
      const uniqueStaffIds = [...new Set(allStaffIds)].filter(Boolean);

      // Fetch all staff profiles in one query
      const staffRes = uniqueStaffIds.length > 0
        ? await supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', uniqueStaffIds)
        : { data: [] };

      const staffMap = new Map(
        (staffRes.data || []).map(s => [s.user_id, `${s.first_name || ''} ${s.last_name || ''}`.trim()])
      );

      if (activityRes.data) {
        for (const log of activityRes.data as any[]) {
          const name = staffMap.get(log.performed_by) || 'Staff';
          events.push({
            id: `activity-${log.id}`,
            timestamp: log.created_at,
            type: 'activity',
            category: log.action_category,
            description: log.description,
            performedBy: name,
            details: log.details as Record<string, unknown> | null,
          });
        }
      }

      // Map care logs — need to resolve reference names
      if (careRes.data && careRes.data.length > 0) {
        const feedingIds = careRes.data.filter(l => l.log_type === 'feeding').map(l => l.reference_id);
        const medIds = careRes.data.filter(l => l.log_type === 'medication').map(l => l.reference_id);

        const [feedingRes, medRes] = await Promise.all([
          feedingIds.length > 0
            ? supabase.from('pet_feeding_schedules').select('id, food_type').in('id', feedingIds)
            : Promise.resolve({ data: [] }),
          medIds.length > 0
            ? supabase.from('pet_medications').select('id, name').in('id', medIds)
            : Promise.resolve({ data: [] }),
        ]);

        const feedingMap = new Map((feedingRes.data || []).map(f => [f.id, f.food_type]));
        const medMap = new Map((medRes.data || []).map(m => [m.id, m.name]));

        for (const log of careRes.data) {
          const refName = log.log_type === 'feeding'
            ? feedingMap.get(log.reference_id) || 'Food'
            : medMap.get(log.reference_id) || 'Medication';

          const parts = [];
          if (log.amount_given) parts.push(`Given: ${log.amount_given}`);
          if (log.amount_taken) parts.push(`Taken: ${log.amount_taken}`);
          if (log.notes) parts.push(log.notes);

          const desc = log.log_type === 'feeding'
            ? `Feeding logged: ${refName}${parts.length ? ` (${parts.join(', ')})` : ''}`
            : `Medication administered: ${refName}${parts.length ? ` (${parts.join(', ')})` : ''}`;

          events.push({
            id: `care-${log.id}`,
            timestamp: log.administered_at,
            type: 'care',
            category: log.log_type,
            description: desc,
            performedBy: staffMap.get(log.administered_by) || 'Staff',
          });
        }
      }

      // Sort all events by timestamp descending
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return events;
    },
    enabled: !!reservationId && !!petId,
    refetchInterval: 30000,
  });
}
