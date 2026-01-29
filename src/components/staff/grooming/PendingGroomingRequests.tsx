import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { CheckCircle, XCircle, Scissors, Clock, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { DeclineReservationDialog } from '@/components/staff/DeclineReservationDialog';

interface PendingRequest {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_breed: string | null;
  client_name: string;
  start_date: string;
  start_time: string | null;
  end_time: string | null;
  groomer_id: string | null;
  groomer_name: string | null;
  notes: string | null;
  groomType: string | null;
  groomService: string | null;
}

const parseGroomingNotes = (notes: string | null): { groomType: string | null; groomService: string | null } => {
  if (!notes) return { groomType: null, groomService: null };
  
  let groomType: string | null = null;
  let groomService: string | null = null;
  
  const groomTypeMatch = notes.match(/Groom Type:\s*([^\n|]+)/);
  if (groomTypeMatch) groomType = groomTypeMatch[1].trim();
  
  const serviceMatch = notes.match(/Service:\s*([^\n|]+)/);
  if (serviceMatch) groomService = serviceMatch[1].trim();
  
  return { groomType, groomService };
};

interface PendingGroomingRequestsProps {
  groomers?: { id: string; name: string; color: string | null }[];
}

export const PendingGroomingRequests = ({ groomers }: PendingGroomingRequestsProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['pending-grooming-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          pet_id,
          start_date,
          start_time,
          end_time,
          groomer_id,
          notes,
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
        .eq('service_type', 'grooming')
        .eq('status', 'pending')
        .order('start_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data.map((r: any) => {
        const { groomType, groomService } = parseGroomingNotes(r.notes);
        return {
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
          groomer_id: r.groomer_id,
          groomer_name: r.groomer_id
            ? groomers?.find((g) => g.id === r.groomer_id)?.name || null
            : null,
          notes: r.notes,
          groomType,
          groomService,
        };
      }) as PendingRequest[];
    },
  });

  const handleAccept = async (request: PendingRequest) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Appointment confirmed',
        description: `Grooming for ${request.pet_name} has been accepted`,
      });

      queryClient.invalidateQueries({ queryKey: ['pending-grooming-requests'] });
      queryClient.invalidateQueries({ queryKey: ['grooming-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['grooming-appointments-week'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept appointment',
        variant: 'destructive',
      });
    }
  };

  const handleDeclineClick = (request: PendingRequest) => {
    setSelectedRequest(request);
    setDeclineDialogOpen(true);
  };

  const handleDeclineConfirm = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Appointment declined',
        description: reason,
      });

      queryClient.invalidateQueries({ queryKey: ['pending-grooming-requests'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to decline appointment',
        variant: 'destructive',
      });
    }

    setDeclineDialogOpen(false);
    setSelectedRequest(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Scissors className="h-5 w-5" />
            Pending Grooming Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-background rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{request.pet_name}</span>
                    {request.pet_breed && (
                      <span className="text-sm text-muted-foreground">
                        ({request.pet_breed})
                      </span>
                    )}
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {request.client_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(request.start_date), 'EEE, MMM d')}
                    </span>
                    {request.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(`2000-01-01T${request.start_time}`), 'h:mm a')}
                        {request.end_time && ` - ${format(parseISO(`2000-01-01T${request.end_time}`), 'h:mm a')}`}
                      </span>
                    )}
                    {request.groomer_name && (
                      <span className="text-primary font-medium">
                        Requested: {request.groomer_name}
                      </span>
                    )}
                    {(request.groomService || request.groomType) && (
                      <span className="font-medium text-foreground">
                        {request.groomService}{request.groomType && ` — ${request.groomType}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    onClick={() => handleAccept(request)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleDeclineClick(request)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <DeclineReservationDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        onConfirm={handleDeclineConfirm}
        petName={selectedRequest?.pet_name || ''}
        serviceType="grooming"
      />
    </>
  );
};
