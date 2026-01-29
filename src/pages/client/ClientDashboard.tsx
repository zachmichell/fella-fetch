import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CalendarDays, Plus, AlertTriangle, ExternalLink, Dog, PawPrint } from 'lucide-react';
import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';
import AIAssistantChat from '@/components/client/AIAssistantChat';
import { format, parseISO, isFuture, isToday } from 'date-fns';

const SHOPIFY_STORE_URL = 'https://fella-fetch.myshopify.com';

const ClientDashboard = () => {
  const {
    clientData,
    reservations,
    orders,
    fetchClientData,
    fetchOrders,
    isAuthenticated,
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

  // Fetch orders when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  // Filter unpaid orders
  const unpaidOrders = orders.filter(order => {
    const unpaidStatuses = ['pending', 'unpaid', 'partially_paid', 'authorized'];
    return unpaidStatuses.includes(order.financialStatus.toLowerCase());
  });

  const formatCurrency = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  // Current visits (checked in but not checked out)
  const currentVisits = reservations.filter(r => r.status === 'checked_in');

  // Upcoming reservations (future or today, not cancelled or completed)
  const upcomingReservations = reservations.filter(r =>
    (isFuture(parseISO(r.start_date)) || isToday(parseISO(r.start_date))) &&
    r.status !== 'cancelled' && r.status !== 'checked_out' && r.status !== 'checked_in'
  );

  return (
    <ClientPortalLayout description="Manage your pets and appointments">
      <div className="max-w-2xl space-y-6">
        {/* Unpaid Invoices Alert */}
        {unpaidOrders.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="h-5 w-5" />
                Unpaid Invoice{unpaidOrders.length > 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {unpaidOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border"
                >
                  <div>
                    <p className="font-medium">Order #{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(order.totalPrice.amount, order.totalPrice.currencyCode)}
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => window.open(`${SHOPIFY_STORE_URL}/account`, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Pay Now
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Current Visit */}
        {currentVisits.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <PawPrint className="h-5 w-5" />
                Currently Here
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="p-4 rounded-lg bg-background border flex items-center gap-4"
                >
                  {visit.pets.photo_url ? (
                    <img 
                      src={visit.pets.photo_url} 
                      alt={visit.pets.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Dog className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{visit.pets.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {visit.service_type}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(visit.start_date), 'MMM d')}
                        {visit.end_date && visit.end_date !== visit.start_date && (
                          <> – {format(parseISO(visit.end_date), 'MMM d')}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    Checked In
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
