import { useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ControlCenterTable, ControlCenterReservation } from '@/components/staff/ControlCenterTable';
import { AddServiceDialog, type SelectedService } from '@/components/staff/AddServiceDialog';
import { InactivityAlertDialog } from '@/components/staff/InactivityAlertDialog';
import { TraitAlertDialog } from '@/components/staff/TraitAlertDialog';
import { DailySummaryTable } from '@/components/staff/DailySummaryTable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePetActivityLog } from '@/hooks/usePetActivityLog';
import { ArrowRight, UserCheck, BedDouble } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AlertTrait {
  id: string;
  icon_name: string;
  color_key: string;
  title: string;
  is_alert: boolean;
}

const StaffDashboard = () => {
  const { isStaffOrAdmin } = useAuth();
  const { toast } = useToast();
  const { logActivity } = usePetActivityLog();
  const [reservations, setReservations] = useState<ControlCenterReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ControlCenterReservation | null>(null);
  const [inactivityAlertOpen, setInactivityAlertOpen] = useState(false);
  const [pendingAcceptReservation, setPendingAcceptReservation] = useState<ControlCenterReservation | null>(null);
  
  // Trait alert state
  const [traitAlertOpen, setTraitAlertOpen] = useState(false);
  const [traitAlertTraits, setTraitAlertTraits] = useState<AlertTrait[]>([]);
  const [traitAlertPetName, setTraitAlertPetName] = useState('');
  const [pendingTraitAction, setPendingTraitAction] = useState<{ type: 'checkin' | 'checkout'; reservation: ControlCenterReservation } | null>(null);

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
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isStaffOrAdmin]);

  // Check for alert traits before proceeding with an action
  const checkForAlertTraits = (reservation: ControlCenterReservation): AlertTrait[] => {
    const alertTraits = (reservation.pet_traits || []).filter(t => t.is_alert) as AlertTrait[];
    return alertTraits;
  };

  // Initiates check-in - first checks for alert traits
  const handleCheckIn = (reservation: ControlCenterReservation) => {
    const alertTraits = checkForAlertTraits(reservation);
    if (alertTraits.length > 0) {
      setTraitAlertTraits(alertTraits);
      setTraitAlertPetName(reservation.pet_name);
      setPendingTraitAction({ type: 'checkin', reservation });
      setTraitAlertOpen(true);
    } else {
      performCheckIn(reservation);
    }
  };

  // Actually performs the check-in
  const performCheckIn = async (reservation: ControlCenterReservation) => {
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

  const handleUndoCheckIn = async (reservation: ControlCenterReservation) => {
    try {
      // Revert status to confirmed and clear check-in time
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: 'confirmed',
          checked_in_at: null
        })
        .eq('id', reservation.id);

      if (error) throw error;

      // If daycare, restore the credit that was deducted on check-in
      if (reservation.service_type === 'daycare' && reservation.client_id) {
        const { error: creditError } = await supabase
          .rpc('restore_daycare_credit', { p_client_id: reservation.client_id });
        
        if (creditError) {
          console.error('Error restoring daycare credit:', creditError);
        }
      }

      // Log the undo check-in activity
      await logActivity({
        petId: reservation.pet_id,
        reservationId: reservation.id,
        actionType: 'pet_checked_out',
        actionCategory: 'check_in',
        description: `Check-in reverted for ${reservation.pet_name} (${reservation.service_type})`,
        details: {
          service_type: reservation.service_type,
          reason: 'undo_check_in',
        }
      });

      toast({ title: `Check-in reverted for ${reservation.pet_name}` });
      fetchDashboardData();
    } catch (error) {
      toast({ 
        title: 'Error reverting check-in', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  };

  // Initiates check-out - first checks for alert traits
  const handleCheckOut = (reservation: ControlCenterReservation) => {
    const alertTraits = checkForAlertTraits(reservation);
    if (alertTraits.length > 0) {
      setTraitAlertTraits(alertTraits);
      setTraitAlertPetName(reservation.pet_name);
      setPendingTraitAction({ type: 'checkout', reservation });
      setTraitAlertOpen(true);
    } else {
      performCheckOut(reservation);
    }
  };

  // Actually performs the check-out
  const performCheckOut = async (reservation: ControlCenterReservation) => {
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

  // Handle trait alert acknowledgment
  const handleTraitAlertAcknowledge = () => {
    if (pendingTraitAction) {
      if (pendingTraitAction.type === 'checkin') {
        performCheckIn(pendingTraitAction.reservation);
      } else if (pendingTraitAction.type === 'checkout') {
        performCheckOut(pendingTraitAction.reservation);
      }
      setPendingTraitAction(null);
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

  // Initiates the accept flow - first checks for inactivity
  const handleAcceptReservation = (reservation: ControlCenterReservation) => {
    setPendingAcceptReservation(reservation);
    setInactivityAlertOpen(true);
  };

  // Actually confirms the reservation after inactivity check passes
  const confirmAcceptReservation = async (reservation: ControlCenterReservation) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', reservation.id);

      if (error) throw error;

      // Log the acceptance
      await logActivity({
        petId: reservation.pet_id,
        reservationId: reservation.id,
        actionType: 'reservation_confirmed',
        actionCategory: 'reservation',
        description: `Reservation confirmed for ${reservation.pet_name} (${reservation.service_type})`,
        details: {
          service_type: reservation.service_type,
        }
      });

      toast({ title: `Reservation accepted for ${reservation.pet_name}` });
      fetchDashboardData();
    } catch (error) {
      toast({ 
        title: 'Error accepting reservation', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  };

  const handleDeclineReservation = async (reservation: ControlCenterReservation, reason: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id);

      if (error) throw error;

      // Log the decline with reason
      await logActivity({
        petId: reservation.pet_id,
        reservationId: reservation.id,
        actionType: 'reservation_declined',
        actionCategory: 'reservation',
        description: `Reservation declined for ${reservation.pet_name} (${reservation.service_type})`,
        details: {
          service_type: reservation.service_type,
          decline_reason: reason,
        }
      });

      toast({ 
        title: 'Reservation declined',
        description: `Reason: ${reason}`
      });
      fetchDashboardData();
    } catch (error) {
      toast({ 
        title: 'Error declining reservation', 
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
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Control Center</h1>
            <p className="text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Quick Check In
            </Button>
            <Button variant="outline" className="gap-2">
              <BedDouble className="h-4 w-4" />
              Lodging Calendar
            </Button>
          </div>
        </div>

        {/* Daily Summary Table */}
        <DailySummaryTable />

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
              onUndoCheckIn={handleUndoCheckIn}
              onAcceptReservation={handleAcceptReservation}
              onCancelReservation={handleCancelReservation}
              onDeclineReservation={handleDeclineReservation}
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

      {/* Inactivity Alert Dialog */}
      <InactivityAlertDialog
        open={inactivityAlertOpen}
        onOpenChange={setInactivityAlertOpen}
        petId={pendingAcceptReservation?.pet_id || ''}
        petName={pendingAcceptReservation?.pet_name || ''}
        onProceed={() => {
          if (pendingAcceptReservation) {
            confirmAcceptReservation(pendingAcceptReservation);
          }
          setPendingAcceptReservation(null);
        }}
        onCancel={() => {
          setPendingAcceptReservation(null);
        }}
      />

      {/* Trait Alert Dialog */}
      <TraitAlertDialog
        open={traitAlertOpen}
        onOpenChange={setTraitAlertOpen}
        petName={traitAlertPetName}
        alertTraits={traitAlertTraits}
        onAcknowledge={handleTraitAlertAcknowledge}
      />
    </StaffLayout>
  );
};

export default StaffDashboard;
