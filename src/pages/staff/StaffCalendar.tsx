import { useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ServiceTypeIcon } from '@/components/ui/service-type-icon';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Calendar as CalendarIcon,
  CalendarDays,
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  startOfMonth,
  endOfMonth,
  addWeeks, 
  subWeeks, 
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  eachDayOfInterval,
} from 'date-fns';

type ViewMode = 'weekly' | 'monthly';

interface Reservation {
  id: string;
  service_type: string;
  status: string;
  start_date: string;
  notes: string | null;
}

interface ServiceType {
  id: string;
  name: string;
  display_name: string;
  category: string;
  color: string | null;
  icon_name: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface ServiceCount {
  id: string;
  name: string;
  displayName: string;
  iconName: string;
  count: number;
  color: string;
  bgColor: string;
}

// Color mapping with bg and text variants
const colorMap: Record<string, { bg: string; text: string }> = {
  'blue': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'purple': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'pink': { bg: 'bg-pink-100', text: 'text-pink-700' },
  'green': { bg: 'bg-green-100', text: 'text-green-700' },
  'orange': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'red': { bg: 'bg-red-100', text: 'text-red-700' },
  'yellow': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'teal': { bg: 'bg-teal-100', text: 'text-teal-700' },
  'gray': { bg: 'bg-gray-100', text: 'text-gray-700' },
  'indigo': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
};

const StaffCalendar = () => {
  const { isStaffOrAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);

  // Weekly view calculations
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Monthly view calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 0 }), 6);
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const fetchData = async () => {
    if (!isStaffOrAdmin) {
      setLoading(false);
      return;
    }

    let startDate: string;
    let endDate: string;

    if (viewMode === 'weekly') {
      startDate = format(weekDays[0], 'yyyy-MM-dd');
      endDate = format(weekDays[6], 'yyyy-MM-dd');
    } else {
      startDate = format(calendarStart, 'yyyy-MM-dd');
      endDate = format(calendarEnd, 'yyyy-MM-dd');
    }

    try {
      // Fetch service types and reservations in parallel
      const [serviceTypesRes, reservationsRes] = await Promise.all([
        supabase
          .from('service_types')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('reservations')
          .select('id, service_type, status, start_date, notes')
          .gte('start_date', startDate)
          .lte('start_date', endDate)
          .neq('status', 'cancelled')
      ]);

      if (serviceTypesRes.error) throw serviceTypesRes.error;
      if (reservationsRes.error) throw reservationsRes.error;

      setServiceTypes(serviceTypesRes.data || []);
      setReservations(reservationsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate, viewMode, isStaffOrAdmin]);

  const getServiceCountsForDay = (date: Date): ServiceCount[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayReservations = reservations.filter(r => r.start_date === dateStr);
    
    // Count by service type name (matching the enum values stored in reservations)
    const counts: Record<string, number> = {};
    dayReservations.forEach(r => {
      counts[r.service_type] = (counts[r.service_type] || 0) + 1;
    });

    // Map service types to counts
    return serviceTypes.map((st) => {
      const colorKey = st.color || 'gray';
      const colors = colorMap[colorKey] || colorMap['gray'];
      
      return {
        id: st.id,
        name: st.name,
        displayName: st.display_name,
        iconName: st.icon_name || 'calendar',
        count: counts[st.name] || 0,
        color: colors.text,
        bgColor: colors.bg,
      };
    });
  };

  const getTotalForDay = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reservations.filter(r => r.start_date === dateStr).length;
  };

  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };
  
  const goToNext = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getHeaderText = () => {
    if (viewMode === 'weekly') {
      return `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">
              {viewMode === 'weekly' ? 'Weekly' : 'Monthly'} overview of reservations
            </p>
          </div>
          
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
          >
            <ToggleGroupItem value="weekly" aria-label="Weekly view">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="monthly" aria-label="Monthly view">
              <CalendarDays className="h-4 w-4 mr-2" />
              Month
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={goToPrevious}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg">
                  {getHeaderText()}
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
            ) : serviceTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>No service types configured</p>
                <p className="text-sm">Add service types in Settings → Service Types</p>
              </div>
            ) : viewMode === 'weekly' ? (
              /* Weekly View */
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
                      className="min-h-[160px] border rounded-lg p-2 space-y-1"
                    >
                      {/* Service type counts - always show all types */}
                      <div className="space-y-1">
                        {serviceCounts.map((service) => {
                          return (
                            <div 
                              key={service.id}
                              className={`flex items-center justify-between px-2 py-1 rounded ${service.bgColor} ${service.count === 0 ? 'opacity-40' : ''}`}
                            >
                              <div className={`flex items-center gap-1 ${service.color}`}>
                                <ServiceTypeIcon iconName={service.iconName} className="h-3 w-3 flex-shrink-0" />
                                <span className="text-[10px] font-medium truncate max-w-[60px]">
                                  {service.displayName}
                                </span>
                              </div>
                              <span className={`text-xs font-semibold ${service.color}`}>
                                {service.count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Total */}
                      <div className="pt-1 border-t">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Total</span>
                          <span className="font-semibold text-foreground">{total}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Monthly View */
              <TooltipProvider delayDuration={200}>
                <div className="grid grid-cols-7 gap-1">
                {/* Day of Week Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center p-2 text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {monthDays.map((day, index) => {
                  const serviceCounts = getServiceCountsForDay(day);
                  const total = getTotalForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div 
                          className={`min-h-[140px] border rounded-lg p-1.5 cursor-pointer hover:border-primary/50 transition-colors ${
                            !isCurrentMonth ? 'bg-muted/30 opacity-50' : ''
                          }`}
                        >
                          {/* Date header */}
                          <div className={`text-right mb-1 ${
                            isToday 
                              ? 'flex justify-end'
                              : ''
                          }`}>
                            <span className={`text-xs font-medium ${
                              isToday 
                                ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center' 
                                : 'text-muted-foreground'
                            }`}>
                              {format(day, 'd')}
                            </span>
                          </div>
                          
                          {/* Compact service counts */}
                          <div className="space-y-0.5">
                            {serviceCounts.filter(s => s.count > 0).slice(0, 8).map((service) => {
                              return (
                                <div 
                                  key={service.id}
                                  className={`flex items-center justify-between gap-1 px-1 py-0.5 rounded ${service.bgColor}`}
                                >
                                  <div className={`flex items-center gap-0.5 min-w-0 ${service.color}`}>
                                    <ServiceTypeIcon iconName={service.iconName} className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="text-[8px] font-medium truncate">
                                      {service.displayName}
                                    </span>
                                  </div>
                                  <span className={`text-[9px] font-semibold flex-shrink-0 ${service.color}`}>
                                    {service.count}
                                  </span>
                                </div>
                              );
                            })}
                            {serviceCounts.filter(s => s.count > 0).length > 8 && (
                              <div className="text-[9px] text-muted-foreground text-center">
                                +{serviceCounts.filter(s => s.count > 0).length - 8} more
                              </div>
                            )}
                            {total === 0 && isCurrentMonth && (
                              <div className="text-[9px] text-muted-foreground text-center py-1">—</div>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="p-3 max-w-[220px]">
                        <div className="space-y-2">
                          <p className="font-semibold text-sm border-b pb-1">
                            {format(day, 'EEEE, MMM d')}
                          </p>
                          <div className="space-y-1">
                            {serviceCounts.map((service) => {
                              return (
                                <div 
                                  key={service.id}
                                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded ${service.bgColor} ${service.count === 0 ? 'opacity-40' : ''}`}
                                >
                                  <div className={`flex items-center gap-1.5 ${service.color}`}>
                                    <ServiceTypeIcon iconName={service.iconName} className="h-3 w-3 flex-shrink-0" />
                                    <span className="text-xs font-medium">
                                      {service.displayName}
                                    </span>
                                  </div>
                                  <span className={`text-xs font-semibold ${service.color}`}>
                                    {service.count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="pt-1 border-t flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-semibold">{total}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        {serviceTypes.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {serviceTypes.map((st) => {
              const colorKey = st.color || 'gray';
              const colors = colorMap[colorKey] || colorMap['gray'];
              
              return (
                <div key={st.id} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${colors.bg} ${colors.text}`}>
                    <ServiceTypeIcon iconName={st.icon_name} className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-muted-foreground">{st.display_name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StaffLayout>
  );
};

export default StaffCalendar;
