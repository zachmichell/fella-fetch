import { useMemo } from 'react';
import { format, addDays, isSameDay, isWithinInterval, parseISO, startOfMonth, endOfMonth, getDay, isSameMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardingReservation } from '@/pages/staff/StaffLodgingCalendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Suite {
  id: string;
  name: string;
}

interface LodgingMonthlyViewProps {
  startDate: Date;
  onPetClick: (reservation: BoardingReservation) => void;
  onAssignSuite: (reservation: BoardingReservation) => void;
  onCreateBooking: (suiteId: string, date: Date) => void;
}

export const LodgingMonthlyView = ({
  startDate,
  onPetClick,
  onAssignSuite,
  onCreateBooking,
}: LodgingMonthlyViewProps) => {
  const monthStart = startOfMonth(startDate);
  const monthEnd = endOfMonth(startDate);

  // Generate calendar days (including padding for week alignment)
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const startPadding = getDay(monthStart);
    
    // Add days from previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(addDays(monthStart, -i - 1));
    }
    
    // Add all days of current month
    let current = monthStart;
    while (current <= monthEnd) {
      days.push(current);
      current = addDays(current, 1);
    }
    
    // Add days to complete last week
    while (days.length % 7 !== 0) {
      days.push(addDays(monthEnd, days.length - (startPadding + (monthEnd.getDate()))));
    }
    
    return days;
  }, [monthStart, monthEnd]);

  // Fetch suites
  const { data: suites } = useQuery({
    queryKey: ['suites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suites')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Suite[];
    },
  });

  // Fetch boarding reservations for the month
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['boarding-reservations-month', format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          pet_id,
          start_date,
          end_date,
          status,
          suite_id,
          notes,
          checked_in_at,
          checked_out_at,
          pets (
            id,
            name,
            breed,
            clients (
              first_name,
              last_name
            )
          )
        `)
        .eq('service_type', 'boarding')
        .neq('status', 'cancelled')
        .lte('start_date', format(monthEnd, 'yyyy-MM-dd'))
        .or(`end_date.gte.${format(monthStart, 'yyyy-MM-dd')},end_date.is.null`);
      
      if (error) throw error;
      
      return data.map((r: any) => ({
        id: r.id,
        pet_id: r.pet_id,
        pet_name: r.pets?.name || 'Unknown',
        pet_breed: r.pets?.breed,
        client_name: r.pets?.clients 
          ? `${r.pets.clients.first_name} ${r.pets.clients.last_name}`
          : 'Unknown',
        start_date: r.start_date,
        end_date: r.end_date,
        status: r.status,
        suite_id: r.suite_id,
        notes: r.notes,
        checked_in_at: r.checked_in_at,
        checked_out_at: r.checked_out_at,
      })) as BoardingReservation[];
    },
  });

  // Get occupancy stats for a day
  const getOccupancyForDay = (date: Date) => {
    if (!reservations || !suites) return { occupied: 0, total: suites?.length || 0, unassigned: 0 };

    const dayReservations = reservations.filter((r) => {
      const resStart = parseISO(r.start_date);
      const resEnd = r.end_date ? parseISO(r.end_date) : resStart;
      
      return isSameDay(date, resStart) || 
        isSameDay(date, resEnd) || 
        isWithinInterval(date, { start: resStart, end: resEnd });
    });

    const assigned = dayReservations.filter(r => r.suite_id);
    const unassigned = dayReservations.filter(r => !r.suite_id);

    return {
      occupied: assigned.length,
      total: suites.length,
      unassigned: unassigned.length,
      reservations: dayReservations,
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardContent className="p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const occupancy = getOccupancyForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);
            const occupancyPercent = occupancy.total > 0 
              ? Math.round((occupancy.occupied / occupancy.total) * 100) 
              : 0;

            return (
              <Tooltip key={day.toISOString()}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "min-h-[100px] p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                      !isCurrentMonth && "opacity-40",
                      isToday && "border-primary border-2"
                    )}
                    onClick={() => {
                      // Could open a day detail view
                    }}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-2",
                      isToday && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </div>

                    {isCurrentMonth && occupancy.occupied > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {occupancy.occupied}/{occupancy.total} suites
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all",
                              occupancyPercent >= 90 ? "bg-red-500" :
                              occupancyPercent >= 70 ? "bg-amber-500" :
                              "bg-green-500"
                            )}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                        {occupancy.unassigned > 0 && (
                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {occupancy.unassigned} unassigned
                          </Badge>
                        )}
                      </div>
                    )}

                    {isCurrentMonth && occupancy.reservations && occupancy.reservations.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {occupancy.reservations.slice(0, 3).map((r) => (
                          <div
                            key={r.id}
                            className={cn(
                              "text-xs px-1 py-0.5 rounded truncate cursor-pointer",
                              r.status === 'checked_in' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              r.status === 'confirmed' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPetClick(r);
                            }}
                          >
                            {r.pet_name}
                          </div>
                        ))}
                        {occupancy.reservations.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{occupancy.reservations.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-medium">{format(day, 'EEEE, MMMM d')}</div>
                    <div>{occupancy.occupied} of {occupancy.total} suites occupied</div>
                    {occupancy.unassigned > 0 && (
                      <div className="text-amber-500">{occupancy.unassigned} pets need suite assignment</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
