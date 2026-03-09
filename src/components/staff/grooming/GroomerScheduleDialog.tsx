import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameDay, isBefore, startOfDay } from 'date-fns';

interface Groomer {
  id: string;
  name: string;
  color: string | null;
}

interface GroomerScheduleDialogProps {
  groomer: Groomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const GroomerScheduleDialog = ({
  groomer,
  open,
  onOpenChange,
}: GroomerScheduleDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hasChanges, setHasChanges] = useState(false);

  // Reset month when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentMonth(startOfMonth(new Date()));
      setHasChanges(false);
    }
  }, [open]);

  // Fetch existing available dates for this groomer
  const { data: existingDates, isLoading } = useQuery({
    queryKey: ['groomer-available-dates', groomer?.id],
    queryFn: async () => {
      if (!groomer) return null;
      const { data, error } = await supabase
        .from('groomer_available_dates')
        .select('available_date, start_time, end_time')
        .eq('groomer_id', groomer.id);
      if (error) throw error;
      return data;
    },
    enabled: !!groomer && open,
  });

  // Initialize selected dates from existing data
  useEffect(() => {
    if (existingDates) {
      const dateSet = new Set(existingDates.map(d => d.available_date));
      setSelectedDates(dateSet);
      // Use hours from first existing entry if available
      if (existingDates.length > 0) {
        setStartTime(existingDates[0].start_time.slice(0, 5));
        setEndTime(existingDates[0].end_time.slice(0, 5));
      }
      setHasChanges(false);
    }
  }, [existingDates]);

  // Calendar grid for current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(monthStart);

    // Pad beginning with nulls
    const paddedDays: (Date | null)[] = Array(startDayOfWeek).fill(null);
    paddedDays.push(...days);

    // Pad end to fill last row
    while (paddedDays.length % 7 !== 0) {
      paddedDays.push(null);
    }

    return paddedDays;
  }, [currentMonth]);

  const toggleDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
    setHasChanges(true);
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.has(format(date, 'yyyy-MM-dd'));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!groomer) return;

      // Delete all existing dates for this groomer
      await supabase
        .from('groomer_available_dates')
        .delete()
        .eq('groomer_id', groomer.id);

      // Insert all selected dates
      if (selectedDates.size > 0) {
        const rows = Array.from(selectedDates).map(dateStr => ({
          groomer_id: groomer.id,
          available_date: dateStr,
          start_time: startTime,
          end_time: endTime,
        }));

        const { error } = await supabase
          .from('groomer_available_dates')
          .insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groomer-available-dates'] });
      toast({ title: 'Schedule saved', description: `${groomer?.name}'s availability has been updated` });
      setHasChanges(false);
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save schedule', variant: 'destructive' });
    },
  });

  // Count selected dates in current month view
  const selectedInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    let count = 0;
    selectedDates.forEach(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      if (d >= monthStart && d <= monthEnd) count++;
    });
    return count;
  }, [selectedDates, currentMonth]);

  const today = startOfDay(new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: groomer?.color || '#3b82f6' }}
            />
            {groomer?.name}'s Availability
          </DialogTitle>
          <DialogDescription>
            Click dates to toggle availability. All selected days use the same working hours.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hours */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-sm whitespace-nowrap">Hours:</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); setHasChanges(true); }}
                  className="h-8 text-sm"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => { setEndTime(e.target.value); setHasChanges(true); }}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <span className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({selectedInMonth} day{selectedInMonth !== 1 ? 's' : ''} selected)
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {DAY_HEADERS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }

                const isPast = isBefore(day, today);
                const selected = isDateSelected(day);
                const isToday = isSameDay(day, today);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isPast}
                    onClick={() => toggleDate(day)}
                    className={`
                      aspect-square rounded-md text-sm font-medium transition-all
                      flex items-center justify-center
                      ${isPast ? 'text-muted-foreground/40 cursor-not-allowed' : 'cursor-pointer hover:bg-accent'}
                      ${selected && !isPast ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                      ${!selected && !isPast ? 'hover:bg-accent' : ''}
                      ${isToday ? 'ring-1 ring-primary' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              Total: {selectedDates.size} day{selectedDates.size !== 1 ? 's' : ''} selected across all months
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !hasChanges}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Schedule
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
