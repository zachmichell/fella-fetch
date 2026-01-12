import { useEffect, useState, useMemo } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePetActivityLog } from '@/hooks/usePetActivityLog';
import { 
  Dog, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  LogIn,
  LogOut as LogOutIcon,
  Loader2,
  Search,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalPetsToday: number;
  checkedIn: number;
  expectedArrivals: number;
  pendingCheckouts: number;
}

interface TodayReservation {
  id: string;
  pet_id: string;
  pet_name: string;
  client_id: string;
  client_name: string;
  service_type: string;
  status: string;
  start_time: string | null;
  checked_in_at: string | null;
}

const StaffDashboard = () => {
  const { isStaffOrAdmin } = useAuth();
  const { toast } = useToast();
  const { logActivity } = usePetActivityLog();
  const [stats, setStats] = useState<DashboardStats>({
    totalPetsToday: 0,
    checkedIn: 0,
    expectedArrivals: 0,
    pendingCheckouts: 0,
  });
  const [todayReservations, setTodayReservations] = useState<TodayReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter reservations based on search query
  const filteredReservations = useMemo(() => {
    if (!searchQuery.trim()) return todayReservations;
    
    const query = searchQuery.toLowerCase();
    return todayReservations.filter(reservation => 
      reservation.pet_name.toLowerCase().includes(query) ||
      reservation.client_name.toLowerCase().includes(query)
    );
  }, [todayReservations, searchQuery]);

  const fetchDashboardData = async () => {
    if (!isStaffOrAdmin) {
      setLoading(false);
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      // Fetch today's reservations with pet and client info
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select(`
          id,
          pet_id,
          service_type,
          status,
          start_time,
          checked_in_at,
          pets (
            id,
            name,
            clients (
              id,
              first_name,
              last_name
            )
          )
        `)
        .eq('start_date', today)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formattedReservations = reservations?.map((r: any) => ({
        id: r.id,
        pet_id: r.pets?.id || r.pet_id,
        pet_name: r.pets?.name || 'Unknown',
        client_id: r.pets?.clients?.id || '',
        client_name: r.pets?.clients 
          ? `${r.pets.clients.first_name} ${r.pets.clients.last_name}`
          : 'Unknown',
        service_type: r.service_type,
        status: r.status,
        start_time: r.start_time,
        checked_in_at: r.checked_in_at,
      })) || [];

      setTodayReservations(formattedReservations);

      // Calculate stats
      const checkedIn = formattedReservations.filter(r => r.status === 'checked_in').length;
      const expectedArrivals = formattedReservations.filter(r => r.status === 'confirmed' || r.status === 'pending').length;
      const pendingCheckouts = formattedReservations.filter(r => r.status === 'checked_in').length;

      setStats({
        totalPetsToday: formattedReservations.length,
        checkedIn,
        expectedArrivals,
        pendingCheckouts,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isStaffOrAdmin]);

  const handleCheckIn = async (reservationId: string, petId: string, petName: string, serviceType: string, clientId: string) => {
    try {
      const checkInTime = new Date().toISOString();
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: 'checked_in',
          checked_in_at: checkInTime
        })
        .eq('id', reservationId);

      if (error) throw error;

      // If daycare, deduct 1 credit immediately on check-in
      if (serviceType === 'daycare' && clientId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('daycare_credits')
          .eq('id', clientId)
          .single();

        if (clientData && clientData.daycare_credits > 0) {
          await supabase
            .from('clients')
            .update({ daycare_credits: clientData.daycare_credits - 1 })
            .eq('id', clientId);
        }
      }

      // Log the check-in activity
      await logActivity({
        petId,
        reservationId,
        actionType: 'pet_checked_in',
        actionCategory: 'check_in',
        description: `${petName} checked in for ${serviceType}`,
        details: {
          service_type: serviceType,
          check_in_time: checkInTime,
        }
      });

      toast({ title: 'Pet checked in successfully!' });
      fetchDashboardData();
    } catch (error) {
      toast({ 
        title: 'Error checking in', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  };

  const handleCheckOut = async (reservationId: string, petId: string, petName: string, serviceType: string, clientId: string, checkedInAt: string | null) => {
    try {
      const checkOutTime = new Date().toISOString();
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: 'checked_out',
          checked_out_at: checkOutTime
        })
        .eq('id', reservationId);

      if (error) throw error;

      // If boarding, calculate nights and deduct credits on check-out
      if (serviceType === 'boarding' && clientId && checkedInAt) {
        const checkInDate = new Date(checkedInAt);
        const checkOutDate = new Date(checkOutTime);
        // Calculate nights (difference in days, minimum 1)
        const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        const { data: clientData } = await supabase
          .from('clients')
          .select('boarding_credits')
          .eq('id', clientId)
          .single();

        if (clientData) {
          const newCredits = Math.max(0, clientData.boarding_credits - nights);
          await supabase
            .from('clients')
            .update({ boarding_credits: newCredits })
            .eq('id', clientId);
        }
      }

      // Log the check-out activity
      await logActivity({
        petId,
        reservationId,
        actionType: 'pet_checked_out',
        actionCategory: 'check_out',
        description: `${petName} checked out from ${serviceType}`,
        details: {
          service_type: serviceType,
          check_out_time: checkOutTime,
        }
      });

      toast({ title: 'Pet checked out successfully!' });
      fetchDashboardData();
    } catch (error) {
      toast({ 
        title: 'Error checking out', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge className="bg-green-500">In Facility</Badge>;
      case 'confirmed':
        return <Badge variant="secondary">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'checked_out':
        return <Badge className="bg-blue-500">Checked Out</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getServiceIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case 'daycare':
        return <Dog className={iconClass} />;
      case 'boarding':
        return <Calendar className={iconClass} />;
      case 'grooming':
        return <Users className={iconClass} />;
      case 'training':
        return <Clock className={iconClass} />;
      default:
        return <Dog className={iconClass} />;
    }
  };

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Control Center</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Pets</CardTitle>
              <Dog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPetsToday}</div>
              <p className="text-xs text-muted-foreground">scheduled visits</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently In</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.checkedIn}</div>
              <p className="text-xs text-muted-foreground">pets in facility</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expected</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expectedArrivals}</div>
              <p className="text-xs text-muted-foreground">arrivals pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Checkout</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingCheckouts}</div>
              <p className="text-xs text-muted-foreground">ready for pickup</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>
                  Check-in and check-out pets as they arrive
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pet or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : todayReservations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Dog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reservations scheduled for today</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{searchQuery}"</p>
                <Button 
                  variant="link" 
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReservations.map((reservation) => (
                  <div 
                    key={reservation.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        {getServiceIcon(reservation.service_type)}
                      </div>
                      <div>
                        <p className="font-medium">{reservation.pet_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {reservation.client_name} • {reservation.service_type}
                          {reservation.start_time && ` • ${reservation.start_time.slice(0, 5)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(reservation.status)}
                      {reservation.status === 'confirmed' || reservation.status === 'pending' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleCheckIn(reservation.id, reservation.pet_id, reservation.pet_name, reservation.service_type, reservation.client_id)}
                          className="gap-1"
                        >
                          <LogIn className="h-3 w-3" />
                          Check In
                        </Button>
                      ) : reservation.status === 'checked_in' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCheckOut(reservation.id, reservation.pet_id, reservation.pet_name, reservation.service_type, reservation.client_id, reservation.checked_in_at)}
                          className="gap-1"
                        >
                          <LogOutIcon className="h-3 w-3" />
                          Check Out
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                New Reservation
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
              <CardDescription>Book a new appointment</CardDescription>
            </CardHeader>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Add Client
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
              <CardDescription>Register a new client</CardDescription>
            </CardHeader>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Send Report Card
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
              <CardDescription>Update pet parents</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffDashboard;
