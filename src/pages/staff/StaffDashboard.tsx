import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ControlCenterTable, ControlCenterReservation } from '@/components/staff/ControlCenterTable';
import { MobileControlCenter } from '@/components/staff/mobile/MobileControlCenter';
import { MobileDailySummary } from '@/components/staff/mobile/MobileDailySummary';
import { AddServiceDialog } from '@/components/staff/AddServiceDialog';
import { InactivityAlertDialog } from '@/components/staff/InactivityAlertDialog';
import { TraitAlertDialog } from '@/components/staff/TraitAlertDialog';
import { DailySummaryTable } from '@/components/staff/DailySummaryTable';
import { QuickCheckInDialog } from '@/components/staff/QuickCheckInDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePetActivityLog } from '@/hooks/usePetActivityLog';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserCheck } from 'lucide-react';
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
  const navigate = useNavigate();
  const { isStaffOrAdmin, user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = usePetActivityLog();
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState<ControlCenterReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ControlCenterReservation | null>(null);
  const [inactivityAlertOpen, setInactivityAlertOpen] = useState(false);
  const [pendingAcceptReservation, setPendingAcceptReservation] = useState<ControlCenterReservation | null>(null);
  const [quickCheckInOpen, setQuickCheckInOpen] = useState(false);
  
  // Trait alert state
  const [traitAlertOpen, setTraitAlertOpen] = useState(false);
  const [traitAlertTraits, setTraitAlertTraits] = useState<AlertTrait[]>([]);
  const [traitAlertPetName, setTraitAlertPetName] = useState('');
  const [pendingTraitAction, setPendingTraitAction] = useState<{ type: 'checkin' | 'checkout'; reservation: ControlCenterReservation } | null>(null);

  // Send check-in SMS notification if enabled and client has opted in
  const sendCheckInNotification = async (reservation: ControlCenterReservation) => {
    try {
      // Check if check-in notification is enabled in settings
      const { data: settingData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'checkin_notification_sms')
        .maybeSingle();

      const settings = settingData?.value as { enabled: boolean; message: string } | null;
      if (!settings?.enabled) return;

      // Fetch client details (phone, opt-in, name)
      const { data: client } = await supabase
        .from('clients')
        .select('phone, sms_reminders_opt_in, first_name, last_name')
        .eq('id', reservation.client_id)
        .maybeSingle();

      if (!client?.phone || !client.sms_reminders_opt_in) return;

      // Fetch business name
      const { data: bizSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'business_name')
        .maybeSingle();
      const businessName = (bizSetting?.value as string) || 'our facility';

      // Resolve template variables
      const message = settings.message
        .replace(/\{\{client_first_name\}\}/g, client.first_name || '')
        .replace(/\{\{client_name\}\}/g, `${client.first_name} ${client.last_name}`.trim())
        .replace(/\{\{pet_name\}\}/g, reservation.pet_name)
        .replace(/\{\{service_type\}\}/g, reservation.service_type)
        .replace(/\{\{business_name\}\}/g, businessName);

      await supabase.functions.invoke('send-sms', {
        body: { to: client.phone, message },
      });
    } catch (err) {
      console.error('Failed to send check-in notification:', err);
    }
  };

  // Send check-out SMS notification if enabled and client has opted in
  const sendCheckOutNotification = async (reservation: ControlCenterReservation) => {
    try {
      const { data: settingData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'checkout_notification_sms')
        .maybeSingle();

      const settings = settingData?.value as { enabled: boolean; message: string } | null;
      if (!settings?.enabled) return;

      const { data: client } = await supabase
        .from('clients')
        .select('phone, sms_reminders_opt_in, first_name, last_name')
        .eq('id', reservation.client_id)
        .maybeSingle();

      if (!client?.phone || !client.sms_reminders_opt_in) return;

      const { data: bizSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'business_name')
        .maybeSingle();
      const businessName = (bizSetting?.value as string) || 'our facility';

      const message = settings.message
        .replace(/\{\{client_first_name\}\}/g, client.first_name || '')
        .replace(/\{\{client_name\}\}/g, `${client.first_name} ${client.last_name}`.trim())
        .replace(/\{\{pet_name\}\}/g, reservation.pet_name)
        .replace(/\{\{service_type\}\}/g, reservation.service_type)
        .replace(/\{\{business_name\}\}/g, businessName);

      await supabase.functions.invoke('send-sms', {
        body: { to: client.phone, message },
      });
    } catch (err) {
      console.error('Failed to send check-out notification:', err);
    }
  };

  const fetchDashboardData = useCallback(async () => {

      setLoading(false);
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      // Fetch today's reservations (for Expected, Check-In, Going Home tabs)
      // Filter out linked services (those with parent_reservation_id)
      // Filter out standalone grooming reservations (they belong in Grooming Calendar only)
      const { data: todayData, error: todayError } = await supabase
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
          payment_pending,
          parent_reservation_id,
          subscription_id,
          pets (
            id,
            name,
            breed,
            photo_url,
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
        .is('parent_reservation_id', null)
        .neq('service_type', 'grooming')
        .order('start_time', { ascending: true });

      if (todayError) throw todayError;

      // Fetch all pending reservations (for Requested tab - any date)
      // Filter out linked services (those with parent_reservation_id)
      // Filter out standalone grooming reservations (they belong in Grooming Calendar only)
      const { data: pendingData, error: pendingError } = await supabase
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
          payment_pending,
          parent_reservation_id,
          subscription_id,
          pets (
            id,
            name,
            breed,
            photo_url,
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
        .eq('status', 'pending')
        .is('parent_reservation_id', null)
        .neq('service_type', 'grooming')
        .neq('start_date', today) // Exclude today's pending (already in todayData)
        .order('start_date', { ascending: true });

      if (pendingError) throw pendingError;

      // Combine both datasets
      const data = [...(todayData || []), ...(pendingData || [])];

      // Get all reservation IDs to fetch linked services
      const reservationIds = data?.map((r: any) => r.id).filter(Boolean) || [];
      let linkedServicesMap: Record<string, any[]> = {};
      
      if (reservationIds.length > 0) {
        // Fetch linked services (child reservations)
        const { data: linkedServicesData } = await supabase
          .from('reservations')
          .select(`
            id,
            parent_reservation_id,
            service_type,
            status,
            start_date,
            start_time,
            end_time,
            notes,
            price,
            groomers (
              id,
              name
            )
          `)
          .in('parent_reservation_id', reservationIds)
          .neq('status', 'cancelled');
        
        if (linkedServicesData) {
          linkedServicesMap = linkedServicesData.reduce((acc: Record<string, any[]>, service: any) => {
            const parentId = service.parent_reservation_id;
            if (!acc[parentId]) acc[parentId] = [];
            acc[parentId].push({
              id: service.id,
              service_type: service.service_type,
              status: service.status,
              start_date: service.start_date,
              start_time: service.start_time,
              end_time: service.end_time,
              notes: service.notes,
              price: service.price,
              groomer_name: service.groomers?.name || null,
            });
            return acc;
          }, {});
        }
      }

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
        pet_photo_url: r.pets?.photo_url || null,
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
        payment_pending: r.payment_pending || false,
        notes: r.notes || null,
        linked_services: linkedServicesMap[r.id] || [],
        subscription_id: r.subscription_id || null,
      })) || [];

      setReservations(formattedReservations);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [isStaffOrAdmin]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time subscription + 30-second polling for auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel('control-center-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pet_traits' },
        () => fetchDashboardData()
      )
      .subscribe();

    // Polling fallback every 30 seconds
    const pollInterval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchDashboardData]);

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

      // If daycare, deduct appropriate credit atomically on check-in
      if (reservation.service_type === 'daycare' && reservation.client_id) {
        const isHalfDay = reservation.notes?.toLowerCase().includes('half day');
        const rpcFunction = isHalfDay ? 'deduct_half_daycare_credit' : 'deduct_daycare_credit';
        
        const { data: newCredits, error: creditError } = await supabase
          .rpc(rpcFunction, { p_client_id: reservation.client_id });
        
        if (creditError) {
          console.error(`Error deducting ${isHalfDay ? 'half ' : ''}daycare credit:`, creditError);
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

      // Send check-in notification SMS (fire-and-forget)
      sendCheckInNotification(reservation).catch(err => 
        console.error('Check-in notification error:', err)
      );

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
        const isHalfDay = reservation.notes?.toLowerCase().includes('half day');
        const rpcFunction = isHalfDay ? 'restore_half_daycare_credit' : 'restore_daycare_credit';
        
        const { error: creditError } = await supabase
          .rpc(rpcFunction, { p_client_id: reservation.client_id });
        
        if (creditError) {
          console.error(`Error restoring ${isHalfDay ? 'half ' : ''}daycare credit:`, creditError);
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

  const handleCancelReservation = async (reservation: ControlCenterReservation, useCredit: boolean, reason: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id);

      if (error) throw error;

      // If useCredit is true, deduct the appropriate credit
      if (useCredit && reservation.client_id) {
        if (reservation.service_type === 'daycare') {
          const isHalfDay = reservation.notes?.toLowerCase().includes('half day');
          const rpcFunction = isHalfDay ? 'deduct_half_daycare_credit' : 'deduct_daycare_credit';
          
          const { error: creditError } = await supabase
            .rpc(rpcFunction, { p_client_id: reservation.client_id });
          
          if (creditError) {
            console.error(`Error deducting ${isHalfDay ? 'half ' : ''}daycare credit:`, creditError);
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

      // Log to turn-away table
      await supabase.from('turn_aways').insert({
        service_type: reservation.service_type,
        reason: reason || 'Cancelled',
        notes: `Cancelled reservation for ${reservation.pet_name} (${reservation.client_name})`,
        created_by: user?.id || '',
      });

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
          cancel_reason: reason,
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

      // Log to turn-away table
      await supabase.from('turn_aways').insert({
        service_type: reservation.service_type,
        reason: reason || 'Declined',
        notes: `Declined reservation for ${reservation.pet_name} (${reservation.client_name})`,
        created_by: user?.id || '',
      });

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

  const handleServiceAdded = () => {
    // Refresh dashboard data after service is added
    fetchDashboardData();
    setSelectedReservation(null);
  };

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`font-semibold tracking-tight ${isMobile ? 'text-lg' : 'text-2xl'}`}>Control Center</h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(), isMobile ? 'EEE, MMM d' : 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          {!isMobile && (
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setQuickCheckInOpen(true)}>
                <UserCheck className="h-4 w-4" />
                Quick Check In
              </Button>
            </div>
          )}
        </div>

        {/* Daily Summary */}
        {isMobile ? <MobileDailySummary /> : <DailySummaryTable />}

        {/* Control Center */}
        {isMobile ? (
          <MobileControlCenter
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
        ) : (
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
        )}
      </div>

      {/* Add Service Dialog */}
      {selectedReservation && (
        <AddServiceDialog
          open={addServiceOpen}
          onOpenChange={setAddServiceOpen}
          petId={selectedReservation.pet_id}
          petName={selectedReservation.pet_name}
          reservationId={selectedReservation.id}
          onServiceAdded={handleServiceAdded}
        />
      )}

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

      {/* Quick Check In Dialog */}
      <QuickCheckInDialog
        open={quickCheckInOpen}
        onOpenChange={setQuickCheckInOpen}
        onSuccess={fetchDashboardData}
      />
    </StaffLayout>
  );
};

export default StaffDashboard;
