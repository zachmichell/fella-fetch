import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export type ActionCategory = 
  | 'check_in'
  | 'check_out'
  | 'reservation'
  | 'profile'
  | 'vaccination'
  | 'feeding'
  | 'behavior'
  | 'grooming'
  | 'training'
  | 'medical'
  | 'report_card'
  | 'general';

export type ActionType =
  | 'pet_checked_in'
  | 'pet_checked_out'
  | 'reservation_created'
  | 'reservation_updated'
  | 'reservation_cancelled'
  | 'reservation_confirmed'
  | 'profile_viewed'
  | 'profile_updated'
  | 'photo_uploaded'
  | 'photo_removed'
  | 'vaccination_updated'
  | 'vaccination_expired'
  | 'feeding_instruction_updated'
  | 'behavior_note_added'
  | 'behavior_note_updated'
  | 'special_needs_updated'
  | 'weight_updated'
  | 'grooming_completed'
  | 'training_session_completed'
  | 'medical_note_added'
  | 'report_card_created'
  | 'report_card_sent'
  | 'general_note_added';

interface LogActivityParams {
  petId: string;
  reservationId?: string | null;
  actionType: ActionType;
  actionCategory: ActionCategory;
  description: string;
  details?: Record<string, unknown>;
}

export function usePetActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(async ({
    petId,
    reservationId,
    actionType,
    actionCategory,
    description,
    details
  }: LogActivityParams) => {
    if (!user) {
      console.error('Cannot log activity: No authenticated user');
      return { error: new Error('No authenticated user') };
    }

    // Using type assertion since the types file hasn't been regenerated yet
    const { error } = await supabase
      .from('pet_activity_logs' as any)
      .insert({
        pet_id: petId,
        reservation_id: reservationId || null,
        action_type: actionType,
        action_category: actionCategory,
        description,
        details: details || null,
        performed_by: user.id,
      });

    if (error) {
      console.error('Failed to log activity:', error);
    }

    return { error };
  }, [user]);

  const getActivityLogs = useCallback(async (petId: string, limit = 50) => {
    const { data, error } = await supabase
      .from('pet_activity_logs' as any)
      .select(`
        *,
        profiles:performed_by (
          first_name,
          last_name
        )
      `)
      .eq('pet_id', petId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  }, []);

  const getReservationLogs = useCallback(async (reservationId: string) => {
    const { data, error } = await supabase
      .from('pet_activity_logs' as any)
      .select(`
        *,
        profiles:performed_by (
          first_name,
          last_name
        )
      `)
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false });

    return { data, error };
  }, []);

  return {
    logActivity,
    getActivityLogs,
    getReservationLogs,
  };
}
