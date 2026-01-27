import { supabase } from '@/integrations/supabase/client';

export interface PetLastActivity {
  petId: string;
  lastReservationDate: string | null;
  daysSinceLastActivity: number | null;
  isInactive: boolean;
}

export async function checkPetInactivity(
  petId: string,
  inactivityThresholdDays: number
): Promise<PetLastActivity> {
  // Get the most recent completed reservation for this pet
  const { data, error } = await supabase
    .from('reservations')
    .select('start_date, status')
    .eq('pet_id', petId)
    .in('status', ['checked_out', 'confirmed', 'checked_in'])
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching pet last activity:', error);
    return {
      petId,
      lastReservationDate: null,
      daysSinceLastActivity: null,
      isInactive: false,
    };
  }

  if (!data) {
    // No previous reservations - this is a new pet
    return {
      petId,
      lastReservationDate: null,
      daysSinceLastActivity: null,
      isInactive: true, // Flag as inactive since no history
    };
  }

  const lastDate = new Date(data.start_date);
  const today = new Date();
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return {
    petId,
    lastReservationDate: data.start_date,
    daysSinceLastActivity: diffDays,
    isInactive: diffDays >= inactivityThresholdDays,
  };
}
