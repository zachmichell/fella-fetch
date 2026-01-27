import { useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { LodgingCalendarHeader } from '@/components/staff/lodging/LodgingCalendarHeader';
import { LodgingWeeklyView } from '@/components/staff/lodging/LodgingWeeklyView';
import { LodgingMonthlyView } from '@/components/staff/lodging/LodgingMonthlyView';
import { LodgingPetDetailsDialog } from '@/components/staff/lodging/LodgingPetDetailsDialog';
import { LodgingAssignSuiteDialog } from '@/components/staff/lodging/LodgingAssignSuiteDialog';
import { startOfWeek, startOfMonth } from 'date-fns';

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

  const handlePetClick = (reservation: BoardingReservation) => {
    setSelectedReservation(reservation);
    setPetDetailsOpen(true);
  };

  const handleAssignSuite = (reservation: BoardingReservation) => {
    setReservationToAssign(reservation);
    setAssignSuiteOpen(true);
  };

  const handleCreateBooking = (suiteId: string, date: Date) => {
    // TODO: Open create booking dialog with prefilled suite and date
    console.log('Create booking for suite', suiteId, 'on', date);
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
      </div>
    </StaffLayout>
  );
};

export default StaffLodgingCalendar;
