import { useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { LodgingCalendarHeader } from '@/components/staff/lodging/LodgingCalendarHeader';
import { LodgingWeeklyView } from '@/components/staff/lodging/LodgingWeeklyView';
import { LodgingMonthlyView } from '@/components/staff/lodging/LodgingMonthlyView';
import { LodgingPetDetailsDialog } from '@/components/staff/lodging/LodgingPetDetailsDialog';
import { LodgingAssignSuiteDialog } from '@/components/staff/lodging/LodgingAssignSuiteDialog';
import { CreateBoardingDialog } from '@/components/staff/lodging/CreateBoardingDialog';
import { startOfWeek, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedReservation, setSelectedReservation] = useState<BoardingReservation | null>(null);
  const [petDetailsOpen, setPetDetailsOpen] = useState(false);
  const [assignSuiteOpen, setAssignSuiteOpen] = useState(false);
  const [reservationToAssign, setReservationToAssign] = useState<BoardingReservation | null>(null);
  
  // Create booking dialog state
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [createBookingSuiteId, setCreateBookingSuiteId] = useState<string | null>(null);
  const [createBookingDate, setCreateBookingDate] = useState<Date | null>(null);

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
          onOpenChange={setAssignSuiteOpen}
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
