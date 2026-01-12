import { useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Dog,
  Loader2
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';

interface Reservation {
  id: string;
  pet_name: string;
  client_name: string;
  service_type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
}

const serviceColors: Record<string, string> = {
  daycare: 'bg-blue-100 text-blue-800 border-blue-200',
  boarding: 'bg-purple-100 text-purple-800 border-purple-200',
  grooming: 'bg-pink-100 text-pink-800 border-pink-200',
  training: 'bg-green-100 text-green-800 border-green-200',
};

const StaffCalendar = () => {
  const { isStaffOrAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');

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
        .select(`
          id,
          service_type,
          status,
          start_date,
          end_date,
          start_time,
          end_time,
          pets (
            name,
            clients (
              first_name,
              last_name
            )
          )
        `)
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formattedReservations = data?.map((r: any) => ({
        id: r.id,
        pet_name: r.pets?.name || 'Unknown',
        client_name: r.pets?.clients 
          ? `${r.pets.clients.first_name} ${r.pets.clients.last_name}`
          : 'Unknown',
        service_type: r.service_type,
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
        start_time: r.start_time,
        end_time: r.end_time,
      })) || [];

      setReservations(formattedReservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [currentDate, isStaffOrAdmin]);

  const getReservationsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reservations.filter(r => {
      if (activeTab !== 'all' && r.service_type !== activeTab) return false;
      return r.start_date === dateStr;
    });
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
            <p className="text-muted-foreground">Manage reservations and appointments</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Reservation
          </Button>
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Services</TabsTrigger>
            <TabsTrigger value="daycare">Daycare</TabsTrigger>
            <TabsTrigger value="boarding">Boarding</TabsTrigger>
            <TabsTrigger value="grooming">Grooming</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Calendar Navigation */}
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
                  const dayReservations = getReservationsForDay(day);
                  return (
                    <div 
                      key={`content-${index}`}
                      className="min-h-[200px] border rounded-lg p-2 space-y-1"
                    >
                      {dayReservations.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No reservations
                        </p>
                      ) : (
                        dayReservations.map((reservation) => (
                          <div 
                            key={reservation.id}
                            className={`p-2 rounded border text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                              serviceColors[reservation.service_type] || 'bg-gray-100'
                            }`}
                          >
                            <p className="font-medium truncate">{reservation.pet_name}</p>
                            <p className="truncate opacity-75">{reservation.client_name}</p>
                            {reservation.start_time && (
                              <p className="opacity-75">{reservation.start_time.slice(0, 5)}</p>
                            )}
                          </div>
                        ))
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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
            <span className="text-sm text-muted-foreground">Daycare</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-200 border border-purple-300" />
            <span className="text-sm text-muted-foreground">Boarding</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-pink-200 border border-pink-300" />
            <span className="text-sm text-muted-foreground">Grooming</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-200 border border-green-300" />
            <span className="text-sm text-muted-foreground">Training</span>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffCalendar;
