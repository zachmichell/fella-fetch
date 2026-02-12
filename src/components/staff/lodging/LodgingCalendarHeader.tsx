import { format, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, BedDouble, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { LodgingViewMode } from '@/pages/staff/StaffLodgingCalendar';

interface LodgingCalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: LodgingViewMode;
  onViewModeChange: (mode: LodgingViewMode) => void;
  showViewToggle?: boolean;
}

export const LodgingCalendarHeader = ({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  showViewToggle = true,
}: LodgingCalendarHeaderProps) => {
  const handlePrevious = () => {
    if (viewMode === 'monthly') {
      onDateChange(subMonths(currentDate, 1));
    } else {
      onDateChange(subWeeks(currentDate, 1));
    }
  };
  
  const handleNext = () => {
    if (viewMode === 'monthly') {
      onDateChange(addMonths(currentDate, 1));
    } else {
      onDateChange(addWeeks(currentDate, 1));
    }
  };
  
  const handleToday = () => onDateChange(new Date());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BedDouble className="h-5 w-5 sm:h-6 sm:w-6" />
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight">Lodging</h1>
        </div>

        {showViewToggle && (
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && onViewModeChange(value as LodgingViewMode)}
          >
            <ToggleGroupItem value="weekly" aria-label="Weekly view">
              <CalendarIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Week</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="monthly" aria-label="Monthly view">
              <LayoutGrid className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Month</span>
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm sm:text-lg font-medium text-center">
          {viewMode === 'monthly' 
            ? format(currentDate, 'MMMM yyyy')
            : format(currentDate, 'MMM d, yyyy')
          }
        </span>
      </div>
    </div>
  );
};