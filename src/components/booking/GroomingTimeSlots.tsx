import { useMemo } from "react";
import { Check, Clock, User } from "lucide-react";
import { format, parse, addMinutes, isBefore } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GroomerSchedule {
  groomer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface ExistingReservation {
  start_date: string;
  start_time: string | null;
  end_time: string | null;
  groomer_id: string | null;
  pet_name?: string;
  client_name?: string;
}

interface GroomerIntakeSettings {
  intake_style?: string;
  stagger_duration?: number;
  max_concurrent?: number;
  end_of_day_safeguard?: boolean;
  eod_buffer_minutes?: number;
}

interface GroomingTimeSlotsProps {
  selectedDate: Date;
  selectedGroomerId: string | null;
  groomers: { id: string; name: string; color?: string | null } & Partial<GroomerIntakeSettings>[];
  schedules: GroomerSchedule[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  existingReservations?: ExistingReservation[];
  slotDurationMinutes?: number;
  /** Pet's groom level for EOD safeguard check */
  petGroomLevel?: number | null;
  /** Groomer intake settings (from groomers_public or groomers table) */
  groomerIntakeSettings?: GroomerIntakeSettings;
}

export const GroomingTimeSlots = ({
  selectedDate,
  selectedGroomerId,
  groomers,
  schedules,
  selectedTime,
  onSelectTime,
  existingReservations = [],
  slotDurationMinutes = 60,
  petGroomLevel,
  groomerIntakeSettings,
}: GroomingTimeSlotsProps) => {
  const dayOfWeek = selectedDate.getDay();
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const intakeStyle = groomerIntakeSettings?.intake_style || 'One-At-A-Time';
  const maxConcurrent = groomerIntakeSettings?.max_concurrent || 1;
  const staggerDuration = groomerIntakeSettings?.stagger_duration || 15;
  const eodSafeguard = groomerIntakeSettings?.end_of_day_safeguard || false;
  const eodBuffer = groomerIntakeSettings?.eod_buffer_minutes || 60;

  // Get reservations for this date with groomer info
  const dayReservations = useMemo(() => {
    return existingReservations
      .filter((r) => r.start_date === dateStr)
      .map((r) => ({
        ...r,
        groomerName: (groomers as any[]).find((g: any) => g.id === r.groomer_id)?.name || "Unknown",
        groomerColor: (groomers as any[]).find((g: any) => g.id === r.groomer_id)?.color || "#6b7280",
      }));
  }, [existingReservations, dateStr, groomers]);

  // Generate time slots based on groomer availability
  const timeSlots = useMemo(() => {
    const daySchedules = schedules.filter(
      (s) => s.day_of_week === dayOfWeek && s.is_available
    );

    if (daySchedules.length === 0) return [];

    let startTime: string;
    let endTime: string;

    if (selectedGroomerId) {
      const schedule = daySchedules.find((s) => s.groomer_id === selectedGroomerId);
      if (!schedule) return [];
      startTime = schedule.start_time;
      endTime = schedule.end_time;
    } else {
      startTime = daySchedules.reduce((earliest, s) => 
        s.start_time < earliest ? s.start_time : earliest, 
        "23:59"
      );
      endTime = daySchedules.reduce((latest, s) => 
        s.end_time > latest ? s.end_time : latest, 
        "00:00"
      );
    }

    // Generate 15-minute interval slots
    const slots: string[] = [];
    const baseDate = new Date(2000, 0, 1);
    const start = parse(startTime, "HH:mm:ss", baseDate);
    const end = parse(endTime, "HH:mm:ss", baseDate);

    let current = start;
    while (isBefore(current, end)) {
      slots.push(format(current, "h:mm a"));
      current = addMinutes(current, 15);
    }

    return slots;
  }, [selectedDate, selectedGroomerId, schedules, dayOfWeek]);

  // Get the groomer's end time for EOD safeguard
  const groomerEndTime = useMemo(() => {
    if (!selectedGroomerId) return null;
    const schedule = schedules.find(
      s => s.groomer_id === selectedGroomerId && s.day_of_week === dayOfWeek && s.is_available
    );
    if (!schedule) return null;
    return parse(schedule.end_time, "HH:mm:ss", new Date(2000, 0, 1));
  }, [selectedGroomerId, schedules, dayOfWeek]);

  // Count overlapping appointments at a given time
  const getOverlapCount = (slotTime: Date): number => {
    const baseDate = new Date(2000, 0, 1);
    return dayReservations.filter(r => {
      if (!r.start_time) return false;
      if (selectedGroomerId && r.groomer_id !== selectedGroomerId) return false;
      const resStart = parse(r.start_time, "HH:mm:ss", baseDate);
      const resEnd = r.end_time 
        ? parse(r.end_time, "HH:mm:ss", baseDate)
        : addMinutes(resStart, slotDurationMinutes);
      return slotTime >= resStart && slotTime < resEnd;
    }).length;
  };

  // Check if slot aligns with stagger intervals from existing appointments
  const alignsWithStagger = (slotTime: Date): boolean => {
    if (intakeStyle !== 'Concurrent-Staggered') return true;
    const baseDate = new Date(2000, 0, 1);
    const groomerRes = dayReservations.filter(r => {
      if (!r.start_time) return false;
      if (selectedGroomerId && r.groomer_id !== selectedGroomerId) return false;
      return true;
    });
    if (groomerRes.length === 0) return true; // No existing, any slot works
    
    // Check if this slot is at a stagger interval from any existing start
    return groomerRes.some(r => {
      const resStart = parse(r.start_time!, "HH:mm:ss", baseDate);
      const diffMs = Math.abs(slotTime.getTime() - resStart.getTime());
      const diffMins = diffMs / 60000;
      return diffMins % staggerDuration === 0;
    });
  };

  // Check if a time slot is available considering intake rules
  const getSlotBookingInfo = (timeSlot: string): { isBooked: boolean; reservation?: typeof dayReservations[0]; isBlocked?: boolean; blockReason?: string } => {
    const baseDate = new Date(2000, 0, 1);
    const slotTime = parse(timeSlot, "h:mm a", baseDate);
    const slotEnd = addMinutes(slotTime, slotDurationMinutes);

    // EOD Safeguard: block L3/L4 dogs near end of day
    if (eodSafeguard && petGroomLevel && petGroomLevel >= 3 && groomerEndTime) {
      const bufferStart = addMinutes(groomerEndTime, -eodBuffer);
      if (slotEnd > bufferStart) {
        return { isBooked: true, isBlocked: true, blockReason: 'EOD safeguard: Level 3/4 dogs cannot be booked this late' };
      }
    }

    // Check intake style rules
    if (intakeStyle === 'One-At-A-Time') {
      // No overlapping allowed during the entire duration
      for (let t = slotTime; isBefore(t, slotEnd); t = addMinutes(t, 15)) {
        if (getOverlapCount(t) > 0) {
          const res = dayReservations.find(r => {
            if (!r.start_time) return false;
            if (selectedGroomerId && r.groomer_id !== selectedGroomerId) return false;
            const resStart = parse(r.start_time, "HH:mm:ss", baseDate);
            const resEnd = r.end_time ? parse(r.end_time, "HH:mm:ss", baseDate) : addMinutes(resStart, slotDurationMinutes);
            return t >= resStart && t < resEnd;
          });
          return { isBooked: true, reservation: res };
        }
      }
    } else if (intakeStyle === 'Concurrent-Block') {
      // Check if concurrent count < max at slot start
      if (getOverlapCount(slotTime) >= maxConcurrent) {
        const res = dayReservations.find(r => {
          if (!r.start_time) return false;
          if (selectedGroomerId && r.groomer_id !== selectedGroomerId) return false;
          const resStart = parse(r.start_time, "HH:mm:ss", baseDate);
          const resEnd = r.end_time ? parse(r.end_time, "HH:mm:ss", baseDate) : addMinutes(resStart, slotDurationMinutes);
          return slotTime >= resStart && slotTime < resEnd;
        });
        return { isBooked: true, reservation: res };
      }
    } else if (intakeStyle === 'Concurrent-Staggered') {
      // Must align to stagger intervals AND not exceed max concurrent
      if (!alignsWithStagger(slotTime) || getOverlapCount(slotTime) >= maxConcurrent) {
        return { isBooked: true, isBlocked: true, blockReason: 'Slot not available (stagger/capacity)' };
      }
    }

    // Fallback: legacy overlap check for slots without intake info
    if (!groomerIntakeSettings) {
      const matchingReservation = dayReservations.find((r) => {
        if (!r.start_time) return false;
        if (selectedGroomerId && r.groomer_id !== selectedGroomerId) return false;
        const resStart = parse(r.start_time, "HH:mm:ss", baseDate);
        const resEnd = r.end_time ? parse(r.end_time, "HH:mm:ss", baseDate) : addMinutes(resStart, slotDurationMinutes);
        const slotEndCheck = addMinutes(slotTime, 15);
        return slotTime < resEnd && slotEndCheck > resStart;
      });
      return { isBooked: !!matchingReservation, reservation: matchingReservation };
    }

    return { isBooked: false };
  };

  if (timeSlots.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">No Available Times</h3>
        <p className="text-muted-foreground text-sm">
          There are no available time slots for this date. Please select a different day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-5 h-5" />
        <span>Available times for {format(selectedDate, "EEEE, MMMM d")}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {timeSlots.map((time) => {
          const isSelected = selectedTime === time;
          const { isBooked, reservation, isBlocked, blockReason } = getSlotBookingInfo(time);

          if (isBooked) {
            const tooltipContent = isBlocked && blockReason
              ? blockReason
              : reservation
                ? `${reservation.pet_name || 'Appointment'} — ${reservation.groomerName}`
                : 'Unavailable';

            return (
              <Tooltip key={time}>
                <TooltipTrigger asChild>
                  <div
                    className="py-3 px-4 rounded-xl border-2 font-medium flex items-center justify-center gap-2 
                      border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-70"
                    style={reservation ? { borderLeftColor: reservation.groomerColor, borderLeftWidth: '4px' } : undefined}
                  >
                    <User className="w-3 h-3" />
                    <span className="text-sm">{time}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">{tooltipContent}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <button
              key={time}
              onClick={() => onSelectTime(time)}
              className={`
                py-3 px-4 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2
                ${isSelected 
                  ? "border-primary bg-primary text-primary-foreground" 
                  : "border-border hover:border-primary/50 text-foreground bg-card"
                }
              `}
            >
              {time}
              {isSelected && <Check className="w-4 h-4" />}
            </button>
          );
        })}
      </div>

      {dayReservations.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="w-3 h-3" />
          Slots with a colored border are already booked
        </p>
      )}
    </div>
  );
};
