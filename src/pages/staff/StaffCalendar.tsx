import { useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Dog,
  BedDouble,
  Scissors,
  GraduationCap
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';

interface Reservation {
  id: string;
  service_type: string;
  status: string;
  start_date: string;
}

interface ServiceCount {
  type: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const serviceConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  daycare: { 
    icon: <Dog className="h-3.5 w-3.5" />, 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    label: 'Daycare'
  },
  boarding: { 
    icon: <BedDouble className="h-3.5 w-3.5" />, 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-100',
    label: 'Boarding'
  },
  grooming: { 
    icon: <Scissors className="h-3.5 w-3.5" />, 
    color: 'text-pink-700', 
    bgColor: 'bg-pink-100',
    label: 'Grooming'
  },
  training: { 
    icon: <GraduationCap className="h-3.5 w-3.5" />, 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    label: 'Training'
  },
};

const StaffCalendar = () => {
  const { isStaffOrAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchReservations = async () => {
    if (!isStaffOrAdmin) {
      setLoading(false);
      return;
    }

    const startDate = format(weekDays[0], 'yyyy-MM-dd');
    const endDate = format(weekDays[6], 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, service_type, status, start_date')
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .neq('status', 'cancelled');

      if (error) throw error;

      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [currentDate, isStaffOrAdmin]);

  const getServiceCountsForDay = (date: Date): ServiceCount[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayReservations = reservations.filter(r => r.start_date === dateStr);
    
    // Count by service type
    const counts: Record<string, number> = {};
    dayReservations.forEach(r => {
      counts[r.service_type] = (counts[r.service_type] || 0) + 1;
    });

    // Convert to array with config
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      icon: serviceConfig[type]?.icon || <Dog className="h-3.5 w-3.5" />,
      color: serviceConfig[type]?.color || 'text-gray-700',
      bgColor: serviceConfig[type]?.bgColor || 'bg-gray-100',
    }));
  };

  const getTotalForDay = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reservations.filter(r => r.start_date === dateStr).length;
  };

  const goToToday = () => setCurrentDate(new Date());
  const goToPrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">Weekly overview of reservations</p>
          </div>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={goToPrevWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg">
                  {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
                </CardTitle>
              </div>
              <Button variant="outline" onClick={goToToday}>Today</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {weekDays.map((day, index) => (
                  <div 
                    key={index}
                    className={`text-center p-2 rounded-lg ${
                      isSameDay(day, new Date()) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                    <p className="text-lg font-semibold">{format(day, 'd')}</p>
                  </div>
                ))}

                {/* Day Content */}
                {weekDays.map((day, index) => {
                  const serviceCounts = getServiceCountsForDay(day);
                  const total = getTotalForDay(day);
                  
                  return (
                    <div 
                      key={`content-${index}`}
                      className="min-h-[140px] border rounded-lg p-3 space-y-2"
                    >
                      {total === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No reservations
                        </p>
                      ) : (
                        <>
                          {/* Service type counts */}
                          <div className="space-y-1.5">
                            {serviceCounts.map((service) => (
                              <div 
                                key={service.type}
                                className={`flex items-center justify-between px-2 py-1.5 rounded ${service.bgColor}`}
                              >
                                <div className={`flex items-center gap-1.5 ${service.color}`}>
                                  {service.icon}
                                  <span className="text-xs font-medium capitalize">
                                    {serviceConfig[service.type]?.label || service.type}
                                  </span>
                                </div>
                                <span className={`text-sm font-semibold ${service.color}`}>
                                  {service.count}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Total */}
                          <div className="pt-1 border-t">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Total</span>
                              <span className="font-semibold text-foreground">{total}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {Object.entries(serviceConfig).map(([type, config]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${config.bgColor} ${config.color}`}>
                {config.icon}
              </div>
              <span className="text-sm text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffCalendar;
