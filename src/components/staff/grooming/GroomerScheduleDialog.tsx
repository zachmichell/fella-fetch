import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';

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

interface DaySchedule {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS_OF_WEEK.map(day => ({
  day_of_week: day.value,
  is_available: day.value >= 1 && day.value <= 5, // Mon-Fri default
  start_time: '09:00',
  end_time: '17:00',
}));

export const GroomerScheduleDialog = ({
  groomer,
  open,
  onOpenChange,
}: GroomerScheduleDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [schedules, setSchedules] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);

  // Fetch existing schedules
  const { data: existingSchedules, isLoading } = useQuery({
    queryKey: ['groomer-schedules', groomer?.id],
    queryFn: async () => {
      if (!groomer) return null;
      
      const { data, error } = await supabase
        .from('groomer_schedules')
        .select('day_of_week, is_available, start_time, end_time')
        .eq('groomer_id', groomer.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!groomer && open,
  });

  // Initialize schedules when data loads
  useEffect(() => {
    if (existingSchedules && existingSchedules.length > 0) {
      const mergedSchedules = DAYS_OF_WEEK.map(day => {
        const existing = existingSchedules.find(s => s.day_of_week === day.value);
        if (existing) {
          return {
            day_of_week: existing.day_of_week,
            is_available: existing.is_available,
            start_time: existing.start_time.slice(0, 5), // Remove seconds
            end_time: existing.end_time.slice(0, 5),
          };
        }
        return {
          day_of_week: day.value,
          is_available: false,
          start_time: '09:00',
          end_time: '17:00',
        };
      });
      setSchedules(mergedSchedules);
    } else if (open && !existingSchedules) {
      setSchedules(DEFAULT_SCHEDULE);
    }
  }, [existingSchedules, open]);

  // Save schedules mutation
  const saveSchedules = useMutation({
    mutationFn: async () => {
      if (!groomer) return;

      // Delete existing schedules
      await supabase
        .from('groomer_schedules')
        .delete()
        .eq('groomer_id', groomer.id);

      // Insert new schedules
      const { error } = await supabase
        .from('groomer_schedules')
        .insert(
          schedules.map(s => ({
            groomer_id: groomer.id,
            day_of_week: s.day_of_week,
            is_available: s.is_available,
            start_time: s.start_time,
            end_time: s.end_time,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groomer-schedules'] });
      toast({ title: 'Schedule saved', description: `${groomer?.name}'s weekly schedule has been updated` });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save schedule', variant: 'destructive' });
    },
  });

  const updateDaySchedule = (dayIndex: number, updates: Partial<DaySchedule>) => {
    setSchedules(prev => 
      prev.map((s, i) => i === dayIndex ? { ...s, ...updates } : s)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSchedules.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: groomer?.color || '#3b82f6' }}
            />
            {groomer?.name}'s Weekly Schedule
          </DialogTitle>
          <DialogDescription>
            Set the working days and hours for this groomer. Clients will only be able to book during available times.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day, index) => {
                const schedule = schedules[index];
                return (
                  <div 
                    key={day.value}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      schedule.is_available ? 'bg-accent/30 border-primary/30' : 'bg-muted/30'
                    }`}
                  >
                    <Switch
                      checked={schedule.is_available}
                      onCheckedChange={(checked) => 
                        updateDaySchedule(index, { is_available: checked })
                      }
                    />
                    <span className={`w-24 font-medium ${!schedule.is_available ? 'text-muted-foreground' : ''}`}>
                      {day.label}
                    </span>
                    
                    {schedule.is_available && (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`start-${day.value}`} className="sr-only">Start time</Label>
                          <Input
                            id={`start-${day.value}`}
                            type="time"
                            value={schedule.start_time}
                            onChange={(e) => updateDaySchedule(index, { start_time: e.target.value })}
                            className="w-28 h-8 text-sm"
                          />
                        </div>
                        <span className="text-muted-foreground text-sm">to</span>
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`end-${day.value}`} className="sr-only">End time</Label>
                          <Input
                            id={`end-${day.value}`}
                            type="time"
                            value={schedule.end_time}
                            onChange={(e) => updateDaySchedule(index, { end_time: e.target.value })}
                            className="w-28 h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                    
                    {!schedule.is_available && (
                      <span className="text-sm text-muted-foreground">Not working</span>
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveSchedules.isPending}>
                {saveSchedules.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Schedule
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
