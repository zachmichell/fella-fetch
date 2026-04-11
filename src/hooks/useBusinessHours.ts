import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HolidayEntry {
  date: string; // YYYY-MM-DD
  name: string;
  closed: boolean;
  open?: string;
  close?: string;
}

export interface BusinessHours {
  weekday: {
    open: string;
    close: string;
  };
  weekend: {
    open: string;
    close: string;
  };
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  weekday: {
    open: '7:00 AM',
    close: '6:00 PM',
  },
  weekend: {
    open: '8:00 AM',
    close: '5:00 PM',
  },
};

export function useBusinessHours() {
  const queryClient = useQueryClient();

  const { data: businessHours, isLoading } = useQuery({
    queryKey: ['business-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'business_hours')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.value) {
        // Parse the JSONB value
        const value = data.value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value) as BusinessHours;
          } catch {
            return DEFAULT_BUSINESS_HOURS;
          }
        }
        // Check if value has the expected structure
        if (typeof value === 'object' && value !== null && 'weekday' in value && 'weekend' in value) {
          return value as unknown as BusinessHours;
        }
        return DEFAULT_BUSINESS_HOURS;
      }
      
      return DEFAULT_BUSINESS_HOURS;
    },
  });

  const updateBusinessHours = useMutation({
    mutationFn: async (hours: BusinessHours) => {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert(
          { key: 'business_hours', value: hours as any, description: 'Business operating hours for weekdays and weekends' },
          { onConflict: 'key' }
        )
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holiday-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'holiday_hours')
        .maybeSingle();
      if (error) throw error;
      if (data?.value && Array.isArray(data.value)) {
        return data.value as unknown as HolidayEntry[];
      }
      return [] as HolidayEntry[];
    },
  });

  /**
   * Get effective hours for a specific date, accounting for holidays.
   * Returns null if the business is closed on that date.
   */
  const getHoursForDate = (date: Date | string): { open: string; close: string } | null => {
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const holiday = holidays.find(h => h.date === dateStr);
    if (holiday) {
      if (holiday.closed) return null;
      return { open: holiday.open || '9:00 AM', close: holiday.close || '5:00 PM' };
    }

    const hours = businessHours || DEFAULT_BUSINESS_HOURS;
    const day = d.getDay();
    return day === 0 || day === 6 ? hours.weekend : hours.weekday;
  };

  const isHoliday = (date: Date | string): boolean => {
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return holidays.some(h => h.date === dateStr);
  };

  return {
    businessHours: businessHours || DEFAULT_BUSINESS_HOURS,
    holidays,
    isLoading,
    updateBusinessHours,
    getHoursForDate,
    isHoliday,
  };
}

// Helper function to generate time slots
export function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number = 30): string[] {
  const slots: string[] = [];
  
  const parseTime = (timeStr: string): { hours: number; minutes: number } => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return { hours: 0, minutes: 0 };
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return { hours, minutes };
  };

  const formatTime = (hours: number, minutes: number): string => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  let currentMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(formatTime(hours, minutes));
    currentMinutes += intervalMinutes;
  }

  return slots;
}

// Get time slots for daycare based on business hours and day type
export function getDaycareTimeSlots(
  businessHours: BusinessHours,
  isWeekend: boolean,
  daycareType: 'full' | 'half',
  isDropOff: boolean
): string[] {
  const hours = isWeekend ? businessHours.weekend : businessHours.weekday;
  
  if (daycareType === 'full') {
    // Full day: drop-off from open to 12 PM, pick-up from 12 PM to close
    if (isDropOff) {
      return generateTimeSlots(hours.open, '12:00 PM');
    } else {
      return generateTimeSlots('12:00 PM', hours.close);
    }
  } else {
    // Half day morning: drop-off from open, pick-up by 12 PM
    // Half day afternoon: drop-off from 1 PM, pick-up by close
    if (isDropOff) {
      // For drop-off on half day, we need to determine if morning or afternoon
      // Morning: open to 11:30 AM (so pick-up can be by noon)
      // Afternoon: 1 PM to 4 PM (reasonable afternoon start times)
      // We'll show morning slots - user context will clarify
      return generateTimeSlots(hours.open, '11:30 AM');
    } else {
      // For pick-up on half day
      // Morning: by 12:00 PM
      // This will be filtered based on drop-off time selection
      return generateTimeSlots('12:00 PM', '12:00 PM');
    }
  }
}

// Check if a date is a weekend
export function isWeekendDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}
