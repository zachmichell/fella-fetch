import { useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ControlCenterTable, ControlCenterReservation } from '@/components/staff/ControlCenterTable';
import { AddServiceDialog, type SelectedService } from '@/components/staff/AddServiceDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePetActivityLog } from '@/hooks/usePetActivityLog';
import { 
  Dog, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalPetsToday: number;
  checkedIn: number;
  expectedArrivals: number;
  pendingCheckouts: number;
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
  const [reservations, setReservations] = useState<ControlCenterReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ControlCenterReservation | null>(null);

  const fetchDashboardData = async () => {
    if (!isStaffOrAdmin) {
      setLoading(false);
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          pet_id,
          service_type,
          status,
          start_date,
          end_date,
          start_time,
          end_time,
          checked_in_at,
          checked_out_at,
          notes,
          pets (
            id,
            name,
            breed,
            clients (
              id,
              first_name,
              last_name,
              daycare_credits,
              half_daycare_credits,
              boarding_credits
            )
          )
        `)
        .eq('start_date', today)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Fetch pet traits for all pets in today's reservations
      const petIds = [...new Set(data?.map((r: any) => r.pets?.id).filter(Boolean) || [])];
      let traitsMap: Record<string, any[]> = {};
      
      if (petIds.length > 0) {
        const { data: traitsData } = await supabase
          .from('pet_traits')
          .select('*')
          .in('pet_id', petIds);
        
        if (traitsData) {
          traitsMap = traitsData.reduce((acc: Record<string, any[]>, trait: any) => {
            if (!acc[trait.pet_id]) acc[trait.pet_id] = [];
            acc[trait.pet_id].push(trait);
            return acc;
          }, {});
        }
      }

      const formattedReservations: ControlCenterReservation[] = data?.map((r: any) => ({
        id: r.id,
        pet_id: r.pets?.id || r.pet_id,
        pet_name: r.pets?.name || 'Unknown',
        pet_breed: r.pets?.breed || null,
        pet_traits: traitsMap[r.pets?.id] || [],
        client_id: r.pets?.clients?.id || '',
        client_name: r.pets?.clients 
          ? `${r.pets.clients.first_name} ${r.pets.clients.last_name}`
          : 'Unknown',
        service_type: r.service_type,
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
        start_time: r.start_time,
        end_time: r.end_time,
        lodging: null, // Will be implemented with lodging feature
        checked_in_at: r.checked_in_at,
        checked_out_at: r.checked_out_at,
        daycare_credits: r.pets?.clients?.daycare_credits ?? 0,
        half_daycare_credits: r.pets?.clients?.half_daycare_credits ?? 0,
        boarding_credits: r.pets?.clients?.boarding_credits ?? 0,
      })) || [];

      setReservations(formattedReservations);

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

  const handleCheckIn = async (reservation: ControlCenterReservation) => {
    try {
      const checkInTime = new Date().toISOString();
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: 'checked_in',
          checked_in_at: checkInTime
        })
        .eq('id', reservation.id);

      if (error) throw error;

      // If daycare, deduct 1 credit atomically on check-in
      if (reservation.service_type === 'daycare' && reservation.client_id) {
        const { data: newCredits, error: creditError } = await supabase
          .rpc('deduct_daycare_credit', { p_client_id: reservation.client_id });
        
        if (creditError) {
          console.error('Error deducting daycare credit:', creditError);
        }
      }

      // Log the check-in activity
      await logActivity({
        petId: reservation.pet_id,
        reservationId: reservation.id,
        actionType: 'pet_checked_in',
        actionCategory: 'check_in',
        description: `${reservation.pet_name} checked in for ${reservation.service_type}`,
        details: {
          service_type: reservation.service_type,
          check_in_time: checkInTime,
        }
      });

      toast({ title: `${reservation.pet_name} checked in successfully!` });
      fetchDashboardData();
    } catch (error) {
      toast({ 
        title: 'Error checking in', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  };

  const handleCheckOut = async (reservation: ControlCenterReservation) => {
    try {
      const checkOutTime = new Date().toISOString();
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: 'checked_out',
          checked_out_at: checkOutTime
        })
        .eq('id', reservation.id);

      if (error) throw error;

      // If boarding, calculate nights and deduct credits atomically on check-out
      if (reservation.service_type === 'boarding' && reservation.client_id && reservation.checked_in_at) {
        const checkInDate = new Date(reservation.checked_in_at);
        const checkOutDate = new Date(checkOutTime);
        const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        const { error: creditError } = await supabase
          .rpc('deduct_boarding_credits', { p_client_id: reservation.client_id, p_nights: nights });
        
        if (creditError) {
          console.error('Error deducting boarding credits:', creditError);
        }
      }

      // Log the check-out activity
      await logActivity({
        petId: reservation.pet_id,
        reservationId: reservation.id,
        actionType: 'pet_checked_out',
        actionCategory: 'check_out',
        description: `${reservation.pet_name} checked out from ${reservation.service_type}`,
        details: {
          service_type: reservation.service_type,
          check_out_time: checkOutTime,
        }
      });

      toast({ title: `${reservation.pet_name} checked out successfully!` });
      fetchDashboardData();
    } catch (error) {
      toast({ 
        title: 'Error checking out', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  };

  const handleCancelReservation = async (reservation: ControlCenterReservation, useCredit: boolean) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id);

      if (error) throw error;

      // If useCredit is true, deduct the appropriate credit
      if (useCredit && reservation.client_id) {
        if (reservation.service_type === 'daycare') {
          const { error: creditError } = await supabase
            .rpc('deduct_daycare_credit', { p_client_id: reservation.client_id });
          
          if (creditError) {
            console.error('Error deducting daycare credit:', creditError);
            toast({ 
              title: 'Reservation cancelled', 
              description: 'But failed to deduct credit',
              variant: 'destructive' 
            });
          }
        } else if (reservation.service_type === 'boarding') {
          // For cancellation, deduct 1 night as a penalty
          const { error: creditError } = await supabase
            .rpc('deduct_boarding_credits', { p_client_id: reservation.client_id, p_nights: 1 });
          
          if (creditError) {
            console.error('Error deducting boarding credit:', creditError);
            toast({ 
              title: 'Reservation cancelled', 
              description: 'But failed to deduct credit',
              variant: 'destructive' 
            });
          }
        }
      }

      // Log the cancellation
      await logActivity({
        petId: reservation.pet_id,
        reservationId: reservation.id,
        actionType: 'reservation_cancelled',
        actionCategory: 'reservation',
        description: `Reservation cancelled for ${reservation.pet_name} (${reservation.service_type})${useCredit ? ' - credit deducted' : ''}`,
        details: {
          service_type: reservation.service_type,
          credit_used: useCredit,
        }
      });

      toast({ 
        title: 'Reservation cancelled',
        description: useCredit ? '1 credit was deducted' : 'No credits were deducted'
      });
      fetchDashboardData();
    } catch (error) {
      toast({ 
        title: 'Error cancelling reservation', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  };

  const handleAddService = (reservation: ControlCenterReservation) => {
    setSelectedReservation(reservation);
    setAddServiceOpen(true);
  };

  const handleServicesAdded = async (services: SelectedService[], notes: string) => {
    if (!selectedReservation) return;

    // Log the additional services
    await logActivity({
      petId: selectedReservation.pet_id,
      reservationId: selectedReservation.id,
      actionType: 'services_added',
      actionCategory: 'service',
      description: `Additional services added for ${selectedReservation.pet_name}`,
      details: {
        services: services.map(s => ({ id: s.id, title: s.title, price: s.price })),
        notes,
      }
    });

    toast({ 
      title: 'Services added', 
      description: `${services.length} service(s) added for ${selectedReservation.pet_name}` 
    });
    setSelectedReservation(null);
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

        {/* Control Center Table */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>
              Manage check-ins, check-outs, and reservations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ControlCenterTable
              reservations={reservations}
              loading={loading}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onCancelReservation={handleCancelReservation}
              onAddService={handleAddService}
              onTraitsUpdated={fetchDashboardData}
            />
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

      {/* Add Service Dialog */}
      <AddServiceDialog
        open={addServiceOpen}
        onOpenChange={setAddServiceOpen}
        petName={selectedReservation?.pet_name || ''}
        onAddServices={handleServicesAdded}
      />
    </StaffLayout>
  );
};

export default StaffDashboard;
