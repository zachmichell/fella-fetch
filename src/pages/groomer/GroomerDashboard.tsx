import { useState, useMemo } from 'react';
import { GroomerLayout } from '@/components/groomer/GroomerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfDay, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Scissors, Loader2 } from 'lucide-react';
import { AssignGroomLevelDialog } from '@/components/groomer/AssignGroomLevelDialog';

const GroomerDashboard = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  // Get groomer record linked to this user
  const { data: groomer } = useQuery({
    queryKey: ['my-groomer-record', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get reservations for this groomer on selected date
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['groomer-reservations', groomer?.id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('reservations')
        .select('*, pets(*, clients(first_name, last_name, phone))')
        .eq('groomer_id', groomer!.id)
        .eq('start_date', dateStr)
        .eq('service_type', 'grooming')
        .neq('status', 'cancelled')
        .order('start_time');
      if (error) throw error;
      return data;
    },
    enabled: !!groomer?.id,
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'checked_in': return 'secondary';
      case 'checked_out': return 'outline';
      case 'pending': return 'destructive';
      default: return 'default';
    }
  };

  if (!groomer) {
    return (
      <GroomerLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No groomer profile linked to your account. Please contact an administrator.</p>
        </div>
      </GroomerLayout>
    );
  }

  return (
    <GroomerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Schedule</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => addDays(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[180px] text-center">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isSameDay(selectedDate, new Date()) && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(startOfDay(new Date()))}>
                Today
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !reservations?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Scissors className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No appointments for this day.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reservations.map((res: any) => (
              <Card key={res.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{res.start_time?.slice(0, 5) || 'TBD'}</span>
                        <span className="font-medium">{res.pets?.name}</span>
                        {res.pets?.groom_level && (
                          <Badge variant="outline" className="text-xs">L{res.pets.groom_level}</Badge>
                        )}
                        {res.pets?.size && (
                          <Badge variant="secondary" className="text-xs">{res.pets.size}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Owner: {res.pets?.clients?.first_name} {res.pets?.clients?.last_name}
                        {res.pets?.clients?.phone && ` • ${res.pets.clients.phone}`}
                      </p>
                      {res.pets?.breed && (
                        <p className="text-xs text-muted-foreground">{res.pets.breed}</p>
                      )}
                      {res.notes && (
                        <p className="text-xs text-muted-foreground italic">{res.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColor(res.status)}>{res.status}</Badge>
                      {(res.status === 'checked_in' || res.status === 'confirmed') && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedReservation(res)}>
                          Complete & Level
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedReservation && (
        <AssignGroomLevelDialog
          reservation={selectedReservation}
          open={!!selectedReservation}
          onOpenChange={(open) => !open && setSelectedReservation(null)}
        />
      )}
    </GroomerLayout>
  );
};

export default GroomerDashboard;
