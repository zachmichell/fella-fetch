import { Link } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CalendarDays, Plus } from 'lucide-react';
import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';
import AIAssistantChat from '@/components/client/AIAssistantChat';
import { format, parseISO, isFuture, isToday } from 'date-fns';

const ClientDashboard = () => {
  const {
    clientData,
    reservations,
    fetchClientData,
  } = useClientAuth();

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

  const upcomingReservations = reservations.filter(r =>
    (isFuture(parseISO(r.start_date)) || isToday(parseISO(r.start_date))) &&
    r.status !== 'cancelled' && r.status !== 'checked_out'
  );

  return (
    <ClientPortalLayout description="Manage your pets and appointments">
      <div className="max-w-2xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReservations.length > 0 ? (
              <div className="space-y-3">
                {upcomingReservations.map((reservation) => (
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
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming appointments</p>
                <Link to="/book">
                  <Button variant="outline" size="sm" className="mt-3 gap-1">
                    <Plus className="h-4 w-4" />
                    Book Now
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant */}
      {clientData && (
        <AIAssistantChat
          clientId={clientData.id}
          clientName={`${clientData.first_name} ${clientData.last_name}`}
          threadId={null}
          onThreadIdUpdate={() => fetchClientData()}
        />
      )}
    </ClientPortalLayout>
  );
};

export default ClientDashboard;
