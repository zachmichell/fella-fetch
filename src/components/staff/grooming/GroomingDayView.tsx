import { useMemo } from 'react';
import { format, parseISO, addMinutes, setHours, setMinutes } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GroomingAppointment } from '@/pages/staff/StaffGroomingCalendar';
import { GroomingAppointmentCell } from './GroomingAppointmentCell';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Groomer {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface GroomingDayViewProps {
  date: Date;
  onAppointmentClick: (appointment: GroomingAppointment) => void;
  onCreateAppointment: (groomerId: string, date: Date, time: string) => void;
}

// Generate 15-minute time slots from 8 AM to 6 PM
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export const GroomingDayView = ({
  date,
  onAppointmentClick,
  onCreateAppointment,
}: GroomingDayViewProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch groomers
  const { data: groomers, isLoading: groomersLoading } = useQuery({
    queryKey: ['groomers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Groomer[];
    },
  });

  // Fetch grooming appointments for the day
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['grooming-appointments', format(date, 'yyyy-MM-dd')],
    queryFn: async () => {
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
              last_name
            )
          )
        `)
        .in('service_type', ['grooming'])
        .eq('start_date', format(date, 'yyyy-MM-dd'))
        .neq('status', 'cancelled');
      
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

  // Get appointments for a specific groomer and time slot
  const getAppointmentForSlot = (groomerId: string, timeSlot: string): GroomingAppointment | null => {
    if (!appointments) return null;
    
    return appointments.find(apt => {
      if (apt.groomer_id !== groomerId) return false;
      if (!apt.start_time) return false;
      
      const aptStart = apt.start_time.substring(0, 5);
      const aptEnd = apt.end_time?.substring(0, 5) || aptStart;
      
      return timeSlot >= aptStart && timeSlot < aptEnd;
    }) || null;
  };

  // Check if this is the start of an appointment
  const isAppointmentStart = (groomerId: string, timeSlot: string): boolean => {
    if (!appointments) return false;
    
    return appointments.some(apt => {
      if (apt.groomer_id !== groomerId) return false;
      if (!apt.start_time) return false;
      return apt.start_time.substring(0, 5) === timeSlot;
    });
  };

  // Calculate appointment span (number of 15-min slots)
  const getAppointmentSpan = (appointment: GroomingAppointment): number => {
    if (!appointment.start_time || !appointment.end_time) return 1;
    
    const [startH, startM] = appointment.start_time.split(':').map(Number);
    const [endH, endM] = appointment.end_time.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    return Math.max(1, Math.ceil((endMinutes - startMinutes) / 15));
  };

  // Handle dropping an appointment onto a new groomer/time
  const handleDropAppointment = async (appointment: GroomingAppointment, targetGroomerId: string, targetTime: string) => {
    try {
      // Calculate new end time based on original duration
      const span = getAppointmentSpan(appointment);
      const [h, m] = targetTime.split(':').map(Number);
      const endDate = addMinutes(setMinutes(setHours(new Date(), h), m), span * 15);
      const newEndTime = format(endDate, 'HH:mm:ss');

      const { error } = await supabase
        .from('reservations')
        .update({ 
          groomer_id: targetGroomerId,
          start_time: `${targetTime}:00`,
          end_time: newEndTime,
        })
        .eq('id', appointment.id);

      if (error) throw error;

      const groomerName = groomers?.find(g => g.id === targetGroomerId)?.name || 'groomer';
      toast({
        title: 'Appointment moved',
        description: `${appointment.pet_name} moved to ${groomerName} at ${targetTime}`,
      });

      queryClient.invalidateQueries({ queryKey: ['grooming-appointments'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to move appointment',
        variant: 'destructive',
      });
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
              <th className="border-b border-r p-3 text-left font-medium w-20 sticky left-0 bg-muted/50 z-10">
                Time
              </th>
              {groomers?.map((groomer) => (
                <th
                  key={groomer.id}
                  className="border-b border-r p-3 text-center font-medium min-w-[150px]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: groomer.color }}
                    />
                    {groomer.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((timeSlot, index) => {
              const isHourMark = timeSlot.endsWith(':00');
              
              return (
                <tr 
                  key={timeSlot} 
                  className={cn(
                    isHourMark 
                      ? "border-t border-t-muted-foreground/40" 
                      : "border-t border-t-muted-foreground/10"
                  )}
                >
                  <td className={cn(
                    "border-r p-1 text-xs bg-muted/20 sticky left-0 z-10",
                    isHourMark 
                      ? "font-medium text-muted-foreground border-t border-t-muted-foreground/40" 
                      : "text-muted-foreground/60 border-t border-t-muted-foreground/10"
                  )}>
                    {isHourMark ? format(parseISO(`2000-01-01T${timeSlot}`), 'h:mm a') : ''}
                  </td>
                  {groomers?.map((groomer) => {
                    const appointment = getAppointmentForSlot(groomer.id, timeSlot);
                    const isStart = isAppointmentStart(groomer.id, timeSlot);
                    const span = appointment ? getAppointmentSpan(appointment) : 1;
                    
                    // Skip rendering if this is a continuation of an appointment
                    if (appointment && !isStart) {
                      return null;
                    }
                    
                    return (
                      <td
                        key={groomer.id}
                        className={cn(
                          "border-r p-0.5 align-top",
                          isHourMark 
                            ? "border-t border-t-muted-foreground/40" 
                            : "border-t border-t-muted-foreground/10",
                          !appointment && "hover:bg-muted/30 cursor-pointer"
                        )}
                        rowSpan={isStart ? span : 1}
                        onClick={() => {
                          if (!appointment) {
                            onCreateAppointment(groomer.id, date, timeSlot);
                          }
                        }}
                      >
                        {isStart && appointment && (
                          <GroomingAppointmentCell
                            appointment={appointment}
                            groomerColor={groomer.color}
                            onClick={() => onAppointmentClick(appointment)}
                            onDrop={(apt) => handleDropAppointment(apt, groomer.id, timeSlot)}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
