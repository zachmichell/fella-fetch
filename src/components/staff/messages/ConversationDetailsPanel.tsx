import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dog, Calendar, Scissors, BedDouble, Loader2 } from 'lucide-react';
import { format, parseISO, isFuture, isToday } from 'date-fns';

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
}

interface Reservation {
  id: string;
  pet_id: string;
  service_type: 'daycare' | 'boarding' | 'grooming' | 'training';
  status: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
}

interface ConversationDetailsPanelProps {
  clientId: string;
  clientName: string;
}

export function ConversationDetailsPanel({ clientId, clientName }: ConversationDetailsPanelProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [nextReservations, setNextReservations] = useState<Record<string, Reservation | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientDetails = async () => {
      setLoading(true);
      try {
        // Fetch client's pets
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('id, name, breed, photo_url')
          .eq('client_id', clientId)
          .eq('is_active', true);

        if (petsError) throw petsError;
        setPets(petsData || []);

        // Fetch upcoming reservations for these pets
        if (petsData && petsData.length > 0) {
          const petIds = petsData.map(p => p.id);
          const today = format(new Date(), 'yyyy-MM-dd');
          
          const { data: reservationsData, error: reservationsError } = await supabase
            .from('reservations')
            .select('id, pet_id, service_type, status, start_date, end_date, start_time')
            .in('pet_id', petIds)
            .gte('start_date', today)
            .neq('status', 'cancelled')
            .neq('status', 'checked_out')
            .order('start_date', { ascending: true });

          if (reservationsError) throw reservationsError;

          // Group by pet and get the next reservation for each
          const nextResMap: Record<string, Reservation | null> = {};
          petIds.forEach(petId => {
            const petReservations = (reservationsData || []).filter(r => r.pet_id === petId);
            nextResMap[petId] = petReservations[0] || null;
          });
          setNextReservations(nextResMap);
        }
      } catch (error) {
        console.error('Error fetching client details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientDetails();
  }, [clientId]);

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'grooming':
        return <Scissors className="h-3.5 w-3.5" />;
      case 'boarding':
        return <BedDouble className="h-3.5 w-3.5" />;
      default:
        return <Calendar className="h-3.5 w-3.5" />;
    }
  };

  const getServiceLabel = (serviceType: string) => {
    return serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
  };

  const formatReservationDate = (reservation: Reservation) => {
    const startDate = parseISO(reservation.start_date);
    if (isToday(startDate)) {
      return 'Today';
    }
    return format(startDate, 'MMM d');
  };

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-sm font-medium">Details</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-4">
            {/* Pets Section */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Pets ({pets.length})
              </h4>
              {pets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pets registered</p>
              ) : (
                <div className="space-y-3">
                  {pets.map((pet) => {
                    const nextRes = nextReservations[pet.id];
                    return (
                      <div key={pet.id} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {pet.photo_url ? (
                            <img 
                              src={pet.photo_url} 
                              alt={pet.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Dog className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{pet.name}</p>
                            {pet.breed && (
                              <p className="text-xs text-muted-foreground truncate">{pet.breed}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Next Reservation */}
                        {nextRes ? (
                          <div className="ml-10 flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs gap-1 h-5">
                              {getServiceIcon(nextRes.service_type)}
                              {getServiceLabel(nextRes.service_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatReservationDate(nextRes)}
                              {nextRes.start_time && ` at ${nextRes.start_time.slice(0, 5)}`}
                            </span>
                          </div>
                        ) : (
                          <p className="ml-10 text-xs text-muted-foreground italic">
                            No upcoming appointments
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
