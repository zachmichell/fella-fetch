import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, BedDouble, Scissors, ChevronLeft, ChevronRight, Dog } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChatCalendarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Suite {
  id: string;
  name: string;
  capacity: number;
}

interface Groomer {
  id: string;
  name: string;
  color: string;
}

interface Reservation {
  id: string;
  pet_id: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  status: string;
  suite_id: string | null;
  groomer_id: string | null;
  pets: {
    name: string;
    breed: string | null;
    clients: { first_name: string; last_name: string };
  };
}

export function ChatCalendarDrawer({ open, onOpenChange }: ChatCalendarDrawerProps) {
  const [activeTab, setActiveTab] = useState('lodging');
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const handlePreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Fetch suites
  const { data: suites = [], isLoading: suitesLoading } = useQuery({
    queryKey: ['suites-drawer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suites')
        .select('id, name, capacity')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Suite[];
    },
    enabled: open && activeTab === 'lodging',
  });

  // Fetch groomers
  const { data: groomers = [], isLoading: groomersLoading } = useQuery({
    queryKey: ['groomers-drawer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomers')
        .select('id, name, color')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Groomer[];
    },
    enabled: open && activeTab === 'grooming',
  });

  // Fetch boarding reservations
  const { data: boardingReservations = [], isLoading: boardingLoading } = useQuery({
    queryKey: ['boarding-drawer', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startStr = format(weekDays[0], 'yyyy-MM-dd');
      const endStr = format(weekDays[6], 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id, pet_id, start_date, end_date, status, suite_id, start_time,
          pets:pet_id (name, breed, clients:client_id (first_name, last_name))
        `)
        .eq('service_type', 'boarding')
        .not('status', 'eq', 'cancelled')
        .or(`and(start_date.lte.${endStr},end_date.gte.${startStr}),and(start_date.lte.${endStr},end_date.is.null)`);
      
      if (error) throw error;
      return data as Reservation[];
    },
    enabled: open && activeTab === 'lodging',
  });

  // Fetch grooming reservations
  const { data: groomingReservations = [], isLoading: groomingLoading } = useQuery({
    queryKey: ['grooming-drawer', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startStr = format(weekDays[0], 'yyyy-MM-dd');
      const endStr = format(weekDays[6], 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id, pet_id, start_date, start_time, status, groomer_id,
          pets:pet_id (name, breed, clients:client_id (first_name, last_name))
        `)
        .eq('service_type', 'grooming')
        .not('status', 'eq', 'cancelled')
        .gte('start_date', startStr)
        .lte('start_date', endStr);
      
      if (error) throw error;
      return data as Reservation[];
    },
    enabled: open && activeTab === 'grooming',
  });

  const getReservationsForSuiteDay = (suiteId: string, day: Date) => {
    return boardingReservations.filter(r => {
      if (r.suite_id !== suiteId) return false;
      const start = parseISO(r.start_date);
      const end = r.end_date ? parseISO(r.end_date) : start;
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  const getReservationsForGroomerDay = (groomerId: string, day: Date) => {
    return groomingReservations.filter(r => 
      r.groomer_id === groomerId && isSameDay(parseISO(r.start_date), day)
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[700px] sm:max-w-[90vw] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar View
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-2 border-b bg-muted/30">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="lodging" className="gap-2">
                <BedDouble className="h-4 w-4" />
                Lodging
              </TabsTrigger>
              <TabsTrigger value="grooming" className="gap-2">
                <Scissors className="h-4 w-4" />
                Grooming
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Week Navigation */}
          <div className="px-4 py-3 flex items-center justify-between border-b bg-background">
            <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </span>
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Today
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="lodging" className="m-0 p-4">
              {suitesLoading || boardingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="grid grid-cols-8 gap-1 text-xs font-medium text-muted-foreground">
                    <div className="p-2">Suite</div>
                    {weekDays.map(day => (
                      <div key={day.toString()} className={cn(
                        "p-2 text-center",
                        isSameDay(day, new Date()) && "bg-primary/10 rounded"
                      )}>
                        <div>{format(day, 'EEE')}</div>
                        <div>{format(day, 'd')}</div>
                      </div>
                    ))}
                  </div>

                  {/* Suite Rows */}
                  {suites.map(suite => (
                    <div key={suite.id} className="grid grid-cols-8 gap-1">
                      <div className="p-2 text-sm font-medium flex items-center">
                        {suite.name}
                      </div>
                      {weekDays.map(day => {
                        const dayReservations = getReservationsForSuiteDay(suite.id, day);
                        return (
                          <div
                            key={day.toString()}
                            className={cn(
                              "min-h-[60px] p-1 border rounded text-xs",
                              isSameDay(day, new Date()) && "bg-primary/5 border-primary/30"
                            )}
                          >
                            {dayReservations.map(r => (
                              <div 
                                key={r.id}
                                className="bg-primary/20 text-primary p-1 rounded mb-1 truncate"
                                title={`${r.pets.name} - ${r.pets.clients.first_name} ${r.pets.clients.last_name}`}
                              >
                                <Dog className="h-3 w-3 inline mr-1" />
                                {r.pets.name}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="grooming" className="m-0 p-4">
              {groomersLoading || groomingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="grid grid-cols-8 gap-1 text-xs font-medium text-muted-foreground">
                    <div className="p-2">Groomer</div>
                    {weekDays.map(day => (
                      <div key={day.toString()} className={cn(
                        "p-2 text-center",
                        isSameDay(day, new Date()) && "bg-primary/10 rounded"
                      )}>
                        <div>{format(day, 'EEE')}</div>
                        <div>{format(day, 'd')}</div>
                      </div>
                    ))}
                  </div>

                  {/* Groomer Rows */}
                  {groomers.map(groomer => (
                    <div key={groomer.id} className="grid grid-cols-8 gap-1">
                      <div className="p-2 text-sm font-medium flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: groomer.color }}
                        />
                        {groomer.name}
                      </div>
                      {weekDays.map(day => {
                        const dayReservations = getReservationsForGroomerDay(groomer.id, day);
                        return (
                          <div
                            key={day.toString()}
                            className={cn(
                              "min-h-[60px] p-1 border rounded text-xs",
                              isSameDay(day, new Date()) && "bg-primary/5 border-primary/30"
                            )}
                          >
                            {dayReservations.map(r => (
                              <div 
                                key={r.id}
                                className="p-1 rounded mb-1 truncate text-white"
                                style={{ backgroundColor: groomer.color }}
                                title={`${r.pets.name} @ ${r.start_time}`}
                              >
                                <Scissors className="h-3 w-3 inline mr-1" />
                                {r.pets.name}
                                {r.start_time && (
                                  <span className="opacity-75 ml-1">
                                    {format(parseISO(`2000-01-01T${r.start_time}`), 'h:mma')}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
