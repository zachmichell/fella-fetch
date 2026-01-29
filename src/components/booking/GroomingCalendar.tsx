import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";

interface GroomerSchedule {
  groomer_id: string;
  day_of_week: number;
  is_available: boolean;
}

interface GroomingCalendarProps {
  selectedGroomerId: string | null;
  groomers: { id: string; name: string }[];
  schedules: GroomerSchedule[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  existingReservations?: { start_date: string; groomer_id: string | null }[];
}

export const GroomingCalendar = ({
  selectedGroomerId,
  groomers,
  schedules,
  selectedDate,
  onSelectDate,
  existingReservations = [],
}: GroomingCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Calculate starting empty cells for the first week
  const startingDayOfWeek = getDay(startOfMonth(currentMonth));

  // Check if a day is available based on groomer schedules
  const isDayAvailable = (date: Date): boolean => {
    const dayOfWeek = getDay(date);
    const today = startOfDay(new Date());

    // Past dates are not available
    if (isBefore(date, today)) {
      return false;
    }

    if (selectedGroomerId) {
      // Check specific groomer's schedule
      const schedule = schedules.find(
        (s) => s.groomer_id === selectedGroomerId && s.day_of_week === dayOfWeek
      );
      return schedule?.is_available ?? false;
    } else {
      // "Any available" - check if at least one groomer is available
      return schedules.some(
        (s) => s.day_of_week === dayOfWeek && s.is_available
      );
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevMonth}
          className="h-10 w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="font-display text-xl font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="h-10 w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before the first of the month */}
        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Days of the month */}
        {days.map((day) => {
          const available = isDayAvailable(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => available && onSelectDate(day)}
              disabled={!available}
              className={`
                aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all
                ${!isSameMonth(day, currentMonth) ? "text-muted-foreground/30" : ""}
                ${selected 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : available
                    ? "bg-green-500/10 text-foreground hover:bg-green-500/20 border border-green-500/30"
                    : "text-muted-foreground/50 cursor-not-allowed"
                }
                ${today && !selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span className="text-muted-foreground">Selected</span>
        </div>
      </div>
    </div>
  );
};
