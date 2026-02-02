import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Calendar, Clock } from 'lucide-react';
import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';
import { format, parseISO, isPast, isToday } from 'date-fns';

const ClientHistory = () => {
  const { reservations } = useClientAuth();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'checked_in':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'checked_out':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const pastReservations = reservations
    .filter(r => isPast(parseISO(r.start_date)) && !isToday(parseISO(r.start_date)))
    .sort((a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime());

  return (
    <ClientPortalLayout title="Past Appointments" description="View your appointment history">
      <div className="max-w-2xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Appointment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pastReservations.length > 0 ? (
              <div className="space-y-3">
                {pastReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{reservation.pets.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {reservation.service_type}
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(reservation.status)}>
                        {reservation.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(reservation.start_date), 'MMM d, yyyy')}
                      </div>
                      {reservation.start_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(`2000-01-01T${reservation.start_time}`), 'h:mm a')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No past appointments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientPortalLayout>
  );
};

export default ClientHistory;
