import { useMemo } from 'react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GroomingAppointment } from '@/pages/staff/StaffGroomingCalendar';
import { cn } from '@/lib/utils';
import { Scissors, Plus } from 'lucide-react';

interface Groomer {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface GroomingWeekViewProps {
  startDate: Date;
  onAppointmentClick: (appointment: GroomingAppointment) => void;
  onCreateAppointment: (groomerId: string, date: Date, time: string) => void;
  filterGroomerId?: string | null;
}

export const GroomingWeekView = ({
  startDate,
  onAppointmentClick,
  onCreateAppointment,
  filterGroomerId,
}: GroomingWeekViewProps) => {
  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  // Fetch groomers (filtered if needed)
  const { data: groomers, isLoading: groomersLoading } = useQuery({
    queryKey: ['groomers', filterGroomerId],
    queryFn: async () => {
      let query = supabase
        .from('groomers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (filterGroomerId) {
        query = query.eq('id', filterGroomerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Groomer[];
    },
  });

  // Fetch grooming appointments for the week
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['grooming-appointments-week', format(startDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const endDate = addDays(startDate, 6);
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          pet_id,
          start_date,
          start_time,
          end_time,
          status,
          groomer_id,
          notes,
          service_type,
          pets (
            id,
            name,
            breed,
            clients (
              first_name,
              last_name,
              phone
            )
          )
        `)
        .in('service_type', ['grooming'])
        .gte('start_date', format(startDate, 'yyyy-MM-dd'))
        .lte('start_date', format(endDate, 'yyyy-MM-dd'))
        .in('status', ['confirmed', 'checked_in', 'checked_out']);
      
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
        start_time: r.start_time,
        end_time: r.end_time,
        status: r.status,
        groomer_id: r.groomer_id,
        notes: r.notes,
        service_type: r.service_type,
      })) as GroomingAppointment[];
    },
  });

  // Get appointments for a specific groomer and day
  const getAppointmentsForCell = (groomerId: string, date: Date): GroomingAppointment[] => {
    if (!appointments) return [];
    
    return appointments.filter(apt => 
      apt.groomer_id === groomerId && 
      isSameDay(parseISO(apt.start_date), date)
    ).sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;
      return a.start_time.localeCompare(b.start_time);
    });
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'confirmed':
        return 'bg-blue-100 dark:bg-blue-900/30';
      case 'checked_out':
        return 'bg-gray-100 dark:bg-gray-800';
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/30';
      default:
        return 'bg-muted';
    }
  };

  const isLoading = groomersLoading || appointmentsLoading;

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
                Groomer
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
            {groomers?.map((groomer) => (
              <tr key={groomer.id} className="hover:bg-muted/30">
                <td className="border-b border-r p-3 font-medium bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: groomer.color }}
                    />
                    {groomer.name}
                  </div>
                </td>
                {weekDays.map((day) => {
                  const cellAppointments = getAppointmentsForCell(groomer.id, day);
                  
                  return (
                    <td
                      key={day.toISOString()}
                      className={cn(
                        "border-b border-r p-1 align-top min-h-[80px]",
                        isSameDay(day, new Date()) && "bg-primary/5"
                      )}
                    >
                      <div className="space-y-1 min-h-[60px]">
                        {cellAppointments.length > 0 ? (
                          cellAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              onClick={() => onAppointmentClick(apt)}
                              className={cn(
                                "p-1.5 rounded cursor-pointer border-l-2 transition-colors",
                                getStatusColor(apt.status),
                                "hover:ring-1 hover:ring-primary/50"
                              )}
                              style={{ borderLeftColor: groomer.color }}
                            >
                              <div className="flex items-center gap-1">
                                <Scissors className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium text-xs truncate">{apt.pet_name}</span>
                              </div>
                              {apt.start_time && (
                                <div className="text-xs text-muted-foreground">
                                  {format(parseISO(`2000-01-01T${apt.start_time}`), 'h:mm a')}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div
                            className="h-full min-h-[60px] flex items-center justify-center cursor-pointer hover:bg-muted/50 rounded transition-colors group"
                            onClick={() => onCreateAppointment(groomer.id, day, '09:00')}
                          >
                            <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
