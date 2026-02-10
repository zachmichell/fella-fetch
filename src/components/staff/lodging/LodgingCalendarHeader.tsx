import { format, addWeeks, subWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, BedDouble } from 'lucide-react';

interface LodgingCalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const LodgingCalendarHeader = ({
  currentDate,
  onDateChange,
}: LodgingCalendarHeaderProps) => {
  const handlePrevious = () => onDateChange(subWeeks(currentDate, 1));
  const handleNext = () => onDateChange(addWeeks(currentDate, 1));
  const handleToday = () => onDateChange(new Date());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BedDouble className="h-5 w-5 sm:h-6 sm:w-6" />
        <h1 className="text-lg sm:text-2xl font-semibold tracking-tight">Lodging</h1>
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
          {format(currentDate, 'MMM d, yyyy')}
        </span>
      </div>
    </div>
  );
};
