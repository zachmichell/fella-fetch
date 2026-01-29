import { useMemo } from "react";
import { Check, Clock } from "lucide-react";
import { format, parse, addMinutes, isBefore, isAfter, setHours, setMinutes } from "date-fns";

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
}

interface GroomingTimeSlotsProps {
  selectedDate: Date;
  selectedGroomerId: string | null;
  groomers: { id: string; name: string }[];
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
    const baseDate = new Date(2000, 0, 1); // Arbitrary date for time calculations
    const start = parse(startTime, "HH:mm:ss", baseDate);
    const end = parse(endTime, "HH:mm:ss", baseDate);

    let current = start;
    while (isBefore(current, end)) {
      slots.push(format(current, "h:mm a"));
      current = addMinutes(current, 15);
    }

    return slots;
  }, [selectedDate, selectedGroomerId, schedules, dayOfWeek]);

  // Check if a time slot is already booked
  const isSlotBooked = (timeSlot: string): boolean => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    // Filter reservations for this date
    const dayReservations = existingReservations.filter(
      (r) => r.start_date === dateStr
    );

    if (dayReservations.length === 0) return false;

    // Check if any reservation overlaps with this time slot
    // For simplicity, we're just checking if the start time matches
    return dayReservations.some((r) => {
      if (!r.start_time) return false;
      
      // If groomer is specified, only check that groomer's bookings
      if (selectedGroomerId && r.groomer_id !== selectedGroomerId) return false;
      
      // Parse the reservation time and check for overlap
      const resTime = format(parse(r.start_time, "HH:mm:ss", new Date()), "h:mm a");
      return resTime === timeSlot;
    });
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
          const isBooked = isSlotBooked(time);

          return (
            <button
              key={time}
              onClick={() => !isBooked && onSelectTime(time)}
              disabled={isBooked}
              className={`
                py-3 px-4 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2
                ${isSelected 
                  ? "border-primary bg-primary text-primary-foreground" 
                  : isBooked
                    ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50"
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
    </div>
  );
};
