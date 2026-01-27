import { useMemo, useState } from 'react';
import { format, addDays, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardingReservation } from '@/pages/staff/StaffLodgingCalendar';
import { LodgingDropZone } from './LodgingDropZone';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Suite {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  is_active: boolean;
  sort_order: number;
}

interface LodgingWeeklyViewProps {
  startDate: Date;
  onPetClick: (reservation: BoardingReservation) => void;
  onAssignSuite: (reservation: BoardingReservation) => void;
  onCreateBooking: (suiteId: string, date: Date) => void;
}

export const LodgingWeeklyView = ({
  startDate,
  onPetClick,
  onAssignSuite,
  onCreateBooking,
}: LodgingWeeklyViewProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draggingReservation, setDraggingReservation] = useState<BoardingReservation | null>(null);

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  // Fetch suites
  const { data: suites, isLoading: suitesLoading } = useQuery({
    queryKey: ['suites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suites')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Suite[];
    },
  });

  // Fetch boarding reservations for the week
  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['boarding-reservations', format(startDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const endDate = addDays(startDate, 6);
      
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
        .lte('start_date', format(endDate, 'yyyy-MM-dd'))
        .or(`end_date.gte.${format(startDate, 'yyyy-MM-dd')},end_date.is.null`);
      
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

  // Get ALL reservations for a specific suite and day (allows multiple pets)
  const getReservationsForCell = (suiteId: string, date: Date): BoardingReservation[] => {
    if (!reservations) return [];

    return reservations.filter((r) => {
      if (r.suite_id !== suiteId) return false;
      
      const resStart = parseISO(r.start_date);
      const resEnd = r.end_date ? parseISO(r.end_date) : resStart;
      
      return isSameDay(date, resStart) || 
        isSameDay(date, resEnd) || 
        isWithinInterval(date, { start: resStart, end: resEnd });
    });
  };

  // Get unassigned reservations that overlap with a day
  const getUnassignedForDay = (date: Date): BoardingReservation[] => {
    if (!reservations) return [];

    return reservations.filter((r) => {
      if (r.suite_id) return false;
      
      const resStart = parseISO(r.start_date);
      const resEnd = r.end_date ? parseISO(r.end_date) : resStart;
      
      return isSameDay(date, resStart) || 
        isSameDay(date, resEnd) || 
        isWithinInterval(date, { start: resStart, end: resEnd });
    });
  };

  // Handle dropping a reservation onto a suite
  const handleDropReservation = async (reservation: BoardingReservation, targetSuiteId: string | null) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ suite_id: targetSuiteId })
        .eq('id', reservation.id);

      if (error) throw error;

      const suiteName = targetSuiteId 
        ? suites?.find(s => s.id === targetSuiteId)?.name || 'suite'
        : 'Unassigned';

      toast({
        title: 'Suite updated',
        description: `${reservation.pet_name} moved to ${suiteName}`,
      });

      queryClient.invalidateQueries({ queryKey: ['boarding-reservations'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to move pet',
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (reservation: BoardingReservation) => {
    setDraggingReservation(reservation);
  };

  const handleDragEnd = (reservation: BoardingReservation, targetSuiteId: string | null | undefined) => {
    setDraggingReservation(null);
    
    // If targetSuiteId is undefined, no valid drop zone was found
    if (targetSuiteId === undefined) {
      return;
    }
    
    // If dropping on the same suite, do nothing
    if (targetSuiteId === reservation.suite_id) {
      return;
    }
    
    handleDropReservation(reservation, targetSuiteId);
  };

  const isLoading = suitesLoading || reservationsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="border-b border-r p-3 text-left font-medium w-32">
                Suite
              </th>
              {weekDays.map((day) => (
                <th
                  key={day.toISOString()}
                  className={cn(
                    "border-b border-r p-3 text-center font-medium min-w-[120px]",
                    isSameDay(day, new Date()) && "bg-primary/10"
                  )}
                >
                  <div className="text-sm">{format(day, 'EEE')}</div>
                  <div className={cn(
                    "text-lg",
                    isSameDay(day, new Date()) && "text-primary font-bold"
                  )}>
                    {format(day, 'd')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suites?.map((suite) => (
              <tr key={suite.id} className="hover:bg-muted/30">
                <td className="border-b border-r p-3 font-medium bg-muted/20">
                  <div>{suite.name}</div>
                  {suite.description && (
                    <div className="text-xs text-muted-foreground">{suite.description}</div>
                  )}
                </td>
                {weekDays.map((day) => {
                  const cellReservations = getReservationsForCell(suite.id, day);
                  return (
                    <td
                      key={day.toISOString()}
                      className={cn(
                        "border-b border-r p-1 align-top min-h-[80px]",
                        isSameDay(day, new Date()) && "bg-primary/5"
                      )}
                    >
                      <LodgingDropZone
                        reservations={cellReservations}
                        date={day}
                        suiteId={suite.id}
                        onPetClick={onPetClick}
                        onAssignSuite={onAssignSuite}
                        onCreateBooking={onCreateBooking}
                        onDropReservation={handleDropReservation}
                        draggingReservation={draggingReservation}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            
            {/* Unassigned row */}
            <tr className="bg-amber-50/50 dark:bg-amber-950/20">
              <td className="border-b border-r p-3 font-medium text-amber-700 dark:text-amber-400">
                Unassigned
              </td>
              {weekDays.map((day) => {
                const unassigned = getUnassignedForDay(day);
                return (
                  <td
                    key={day.toISOString()}
                    className={cn(
                      "border-b border-r p-1 align-top",
                      isSameDay(day, new Date()) && "bg-primary/5"
                    )}
                  >
                    <LodgingDropZone
                      reservations={unassigned}
                      date={day}
                      suiteId={null}
                      onPetClick={onPetClick}
                      onAssignSuite={onAssignSuite}
                      onCreateBooking={onCreateBooking}
                      onDropReservation={handleDropReservation}
                      draggingReservation={draggingReservation}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isUnassigned
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
