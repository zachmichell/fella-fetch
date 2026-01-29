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

interface GroomingTimeSlotsProps {
  selectedDate: Date;
  selectedGroomerId: string | null;
  groomers: { id: string; name: string; color?: string | null }[];
  schedules: GroomerSchedule[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  existingReservations?: ExistingReservation[];
  slotDurationMinutes?: number;
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
}: GroomingTimeSlotsProps) => {
  const dayOfWeek = selectedDate.getDay();
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Get reservations for this date with groomer info
  const dayReservations = useMemo(() => {
    return existingReservations
      .filter((r) => r.start_date === dateStr)
      .map((r) => ({
        ...r,
        groomerName: groomers.find(g => g.id === r.groomer_id)?.name || "Unknown",
        groomerColor: groomers.find(g => g.id === r.groomer_id)?.color || "#6b7280",
      }));
  }, [existingReservations, dateStr, groomers]);

  // Generate time slots based on groomer availability
  const timeSlots = useMemo(() => {
    // Get relevant schedules for this day
    const daySchedules = schedules.filter(
      (s) => s.day_of_week === dayOfWeek && s.is_available
    );

    if (daySchedules.length === 0) return [];

    // If specific groomer selected, use their schedule
    // If "any available", use the earliest start and latest end
    let startTime: string;
    let endTime: string;

    if (selectedGroomerId) {
      const schedule = daySchedules.find((s) => s.groomer_id === selectedGroomerId);
      if (!schedule) return [];
      startTime = schedule.start_time;
      endTime = schedule.end_time;
    } else {
      // Find earliest start and latest end among all available groomers
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

  // Check if a time slot is already booked and get booking info
  const getSlotBookingInfo = (timeSlot: string): { isBooked: boolean; reservation?: typeof dayReservations[0] } => {
    if (dayReservations.length === 0) return { isBooked: false };

    // Find reservation that overlaps with this time slot
    const matchingReservation = dayReservations.find((r) => {
      if (!r.start_time) return false;
      
      // If groomer is specified, only check that groomer's bookings
      if (selectedGroomerId && r.groomer_id !== selectedGroomerId) return false;
      
      // Parse reservation times
      const baseDate = new Date(2000, 0, 1);
      const resStart = parse(r.start_time, "HH:mm:ss", baseDate);
      const resEnd = r.end_time 
        ? parse(r.end_time, "HH:mm:ss", baseDate)
        : addMinutes(resStart, slotDurationMinutes);
      
      // Parse slot time
      const slotTime = parse(timeSlot, "h:mm a", baseDate);
      const slotEnd = addMinutes(slotTime, 15); // 15-minute slot

      // Check for overlap
      return slotTime < resEnd && slotEnd > resStart;
    });

    return { 
      isBooked: !!matchingReservation, 
      reservation: matchingReservation 
    };
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
          const { isBooked, reservation } = getSlotBookingInfo(time);

          if (isBooked && reservation) {
            return (
              <Tooltip key={time}>
                <TooltipTrigger asChild>
                  <div
                    className="py-3 px-4 rounded-xl border-2 font-medium flex items-center justify-center gap-2 
                      border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-70"
                    style={{ borderLeftColor: reservation.groomerColor, borderLeftWidth: '4px' }}
                  >
                    <User className="w-3 h-3" />
                    <span className="text-sm">{time}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="text-sm">
                    <p className="font-medium">{reservation.pet_name || "Appointment"}</p>
                    <p className="text-muted-foreground">
                      {reservation.groomerName} • {reservation.client_name || "Booked"}
                    </p>
                  </div>
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
