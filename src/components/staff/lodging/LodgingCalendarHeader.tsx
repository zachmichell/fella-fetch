import { format, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, BedDouble, Calendar, CalendarDays } from 'lucide-react';
import { ViewMode } from '@/pages/staff/StaffLodgingCalendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface LodgingCalendarHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const LodgingCalendarHeader = ({
  viewMode,
  onViewModeChange,
  currentDate,
  onDateChange,
}: LodgingCalendarHeaderProps) => {
  const handlePrevious = () => {
    if (viewMode === 'weekly') {
      onDateChange(subWeeks(currentDate, 1));
    } else {
      onDateChange(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'weekly') {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BedDouble className="h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Lodging Calendar</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-lg font-medium min-w-[180px] text-center">
          {viewMode === 'weekly'
            ? format(currentDate, 'MMM d, yyyy')
            : format(currentDate, 'MMMM yyyy')}
        </span>

        {/* View Toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && onViewModeChange(value as ViewMode)}
        >
          <ToggleGroupItem value="weekly" aria-label="Weekly view">
            <Calendar className="h-4 w-4 mr-2" />
            Week
          </ToggleGroupItem>
          <ToggleGroupItem value="monthly" aria-label="Monthly view">
            <CalendarDays className="h-4 w-4 mr-2" />
            Month
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};
