import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { LodgingCalendarHeader } from '@/components/staff/lodging/LodgingCalendarHeader';
import { LodgingWeeklyView } from '@/components/staff/lodging/LodgingWeeklyView';
import { LodgingMonthlyView } from '@/components/staff/lodging/LodgingMonthlyView';
import { LodgingPetDetailsDialog } from '@/components/staff/lodging/LodgingPetDetailsDialog';
import { LodgingAssignSuiteDialog } from '@/components/staff/lodging/LodgingAssignSuiteDialog';
import { CreateBoardingDialog } from '@/components/staff/lodging/CreateBoardingDialog';
import { startOfWeek, startOfMonth, parseISO, format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Info } from 'lucide-react';
import { toast } from 'sonner';

export type ViewMode = 'weekly' | 'monthly';

export interface BoardingReservation {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_breed: string | null;
  client_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  suite_id: string | null;
  notes: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

const StaffLodgingCalendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedReservation, setSelectedReservation] = useState<BoardingReservation | null>(null);
  const [petDetailsOpen, setPetDetailsOpen] = useState(false);
  const [assignSuiteOpen, setAssignSuiteOpen] = useState(false);
  const [reservationToAssign, setReservationToAssign] = useState<BoardingReservation | null>(null);
  
  // Banner state for pending assignment from Control Center
  const [pendingAssignment, setPendingAssignment] = useState<BoardingReservation | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Create booking dialog state
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [createBookingSuiteId, setCreateBookingSuiteId] = useState<string | null>(null);
  const [createBookingDate, setCreateBookingDate] = useState<Date | null>(null);

  // Get reservation ID from URL params (for direct navigation from Control Center)
  const reservationIdFromUrl = searchParams.get('reservationId');
  const startDateFromUrl = searchParams.get('startDate');

  // Fetch reservation from URL param to show assignment banner
  const { data: urlReservation } = useQuery({
    queryKey: ['reservation-for-assignment', reservationIdFromUrl],
    queryFn: async () => {
      if (!reservationIdFromUrl) return null;
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          pet_id,
          start_date,
          end_date,
          status,
          suite_id,
          notes,
          checked_in_at,
          checked_out_at,
          pets!inner (
            name,
            breed,
            clients!inner (
              first_name,
              last_name
            )
          )
        `)
        .eq('id', reservationIdFromUrl)
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        pet_id: data.pet_id,
        pet_name: data.pets.name,
        pet_breed: data.pets.breed,
        client_name: `${data.pets.clients.first_name} ${data.pets.clients.last_name}`,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status,
        suite_id: data.suite_id,
        notes: data.notes,
        checked_in_at: data.checked_in_at,
        checked_out_at: data.checked_out_at,
      } as BoardingReservation;
    },
    enabled: !!reservationIdFromUrl,
  });

  // Show banner and navigate calendar when URL has reservation ID
  useEffect(() => {
    if (urlReservation && reservationIdFromUrl) {
      setPendingAssignment(urlReservation);
      
      // Navigate calendar to the reservation's start date
      if (startDateFromUrl) {
        setCurrentDate(parseISO(startDateFromUrl));
      }
    }
  }, [urlReservation, reservationIdFromUrl, startDateFromUrl]);

  // Real-time subscription for auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel('lodging-calendar-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['boarding-reservations'] });
          queryClient.invalidateQueries({ queryKey: ['reservation-for-assignment'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suites' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['suites'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Handle clicking "Assign Now" from the banner
  const handleAssignFromBanner = () => {
    if (pendingAssignment) {
      setReservationToAssign(pendingAssignment);
      setAssignSuiteOpen(true);
    }
  };

  // Dismiss the banner
  const handleDismissBanner = () => {
    setPendingAssignment(null);
    setSearchParams({});
  };

  // Directly assign pending reservation to a suite (when clicking a cell)
  const handleQuickAssignToSuite = async (suiteId: string, suiteName: string) => {
    if (!pendingAssignment) return;
    
    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ suite_id: suiteId })
        .eq('id', pendingAssignment.id);
      
      if (error) throw error;
      
      toast.success(`${pendingAssignment.pet_name} assigned to ${suiteName}`);
      
      // Clear pending assignment and URL params
      setPendingAssignment(null);
      setSearchParams({});
      
      // Refresh reservations data
      queryClient.invalidateQueries({ queryKey: ['boarding-reservations'] });
    } catch (error) {
      console.error('Error assigning suite:', error);
      toast.error('Failed to assign suite');
    } finally {
      setIsAssigning(false);
    }
  };

  // Clear URL params when assign dialog closes
  const handleAssignDialogClose = (open: boolean) => {
    setAssignSuiteOpen(open);
    if (!open) {
      // Clear pending assignment and URL params after closing
      setPendingAssignment(null);
      setSearchParams({});
      setReservationToAssign(null);
    }
  };

  // Fetch suites for name lookup
  const { data: suites } = useQuery({
    queryKey: ['suites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suites')
        .select('id, name')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const handlePetClick = (reservation: BoardingReservation) => {
    setSelectedReservation(reservation);
    setPetDetailsOpen(true);
  };

  const handleAssignSuite = (reservation: BoardingReservation) => {
    setReservationToAssign(reservation);
    setAssignSuiteOpen(true);
  };

  const handleCreateBooking = (suiteId: string, date: Date) => {
    // If there's a pending assignment, assign to this suite instead of creating new booking
    if (pendingAssignment) {
      const suiteName = suites?.find(s => s.id === suiteId)?.name || 'Suite';
      handleQuickAssignToSuite(suiteId, suiteName);
      return;
    }
    
    // Otherwise, open the create booking dialog
    setCreateBookingSuiteId(suiteId);
    setCreateBookingDate(date);
    setCreateBookingOpen(true);
  };

  const getSuiteName = (suiteId: string | null) => {
    if (!suiteId) return null;
    return suites?.find(s => s.id === suiteId)?.name || null;
  };

  return (
    <StaffLayout>
      <div className="space-y-4">
        {/* Assignment banner when navigating from Control Center */}
        {pendingAssignment && (
          <Alert className="bg-primary/10 border-primary">
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between flex-1">
              <span>
                <strong>Assign Suite for {pendingAssignment.pet_name}</strong>
                {' • '}
                {format(parseISO(pendingAssignment.start_date), 'MMM d')}
                {pendingAssignment.end_date && ` - ${format(parseISO(pendingAssignment.end_date), 'MMM d')}`}
                {' • '}
                Click on an available suite cell below, or{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold"
                  onClick={handleAssignFromBanner}
                >
                  assign now
                </Button>
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 shrink-0"
                onClick={handleDismissBanner}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <LodgingCalendarHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />

        {viewMode === 'weekly' ? (
          <LodgingWeeklyView
            startDate={startOfWeek(currentDate, { weekStartsOn: 0 })}
            onPetClick={handlePetClick}
            onAssignSuite={handleAssignSuite}
            onCreateBooking={handleCreateBooking}
          />
        ) : (
          <LodgingMonthlyView
            startDate={startOfMonth(currentDate)}
            onPetClick={handlePetClick}
            onAssignSuite={handleAssignSuite}
            onCreateBooking={handleCreateBooking}
          />
        )}

        <LodgingPetDetailsDialog
          open={petDetailsOpen}
          onOpenChange={setPetDetailsOpen}
          reservation={selectedReservation}
        />

        <LodgingAssignSuiteDialog
          open={assignSuiteOpen}
          onOpenChange={handleAssignDialogClose}
          reservation={reservationToAssign}
        />

        <CreateBoardingDialog
          open={createBookingOpen}
          onOpenChange={setCreateBookingOpen}
          suiteId={createBookingSuiteId}
          suiteName={getSuiteName(createBookingSuiteId)}
          startDate={createBookingDate}
        />
      </div>
    </StaffLayout>
  );
};

export default StaffLodgingCalendar;
