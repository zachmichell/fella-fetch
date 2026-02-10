import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, ChevronLeft, ChevronRight, Scissors, User } from 'lucide-react';
import { format, addDays, subDays, addWeeks, subWeeks } from 'date-fns';
import { GroomingViewMode } from '@/pages/staff/StaffGroomingCalendar';
import { cn } from '@/lib/utils';

interface Groomer {
  id: string;
  name: string;
  color: string | null;
}

interface GroomingCalendarHeaderProps {
  viewMode: GroomingViewMode;
  onViewModeChange: (mode: GroomingViewMode) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  groomers?: Groomer[];
  selectedGroomerId: string | null;
  onGroomerFilterChange: (groomerId: string | null) => void;
}

export const GroomingCalendarHeader = ({
  viewMode,
  onViewModeChange,
  currentDate,
  onDateChange,
  groomers = [],
  selectedGroomerId,
  onGroomerFilterChange,
}: GroomingCalendarHeaderProps) => {
  const handlePrevious = () => {
    if (viewMode === 'day') {
      onDateChange(subDays(currentDate, 1));
    } else {
      onDateChange(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      onDateChange(addDays(currentDate, 1));
    } else {
      onDateChange(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">Grooming</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Manage grooming and add-on appointments
            </p>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as GroomingViewMode)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Groomer Filter */}
        <Select
          value={selectedGroomerId || 'all'}
          onValueChange={(v) => onGroomerFilterChange(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[140px] sm:w-[180px]">
            <User className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groomers</SelectItem>
            {groomers.map((groomer) => (
              <SelectItem key={groomer.id} value={groomer.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: groomer.color || '#6b7280' }}
                  />
                  {groomer.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[120px] sm:min-w-[180px] h-8 text-xs sm:text-sm">
                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                {format(currentDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && onDateChange(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToday}>
            Today
          </Button>
        </div>
      </div>
    </div>
  );
};
