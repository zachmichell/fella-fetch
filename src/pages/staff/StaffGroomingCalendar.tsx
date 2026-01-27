import { useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { GroomingCalendarHeader } from '@/components/staff/grooming/GroomingCalendarHeader';
import { GroomingDayView } from '@/components/staff/grooming/GroomingDayView';
import { GroomingWeekView } from '@/components/staff/grooming/GroomingWeekView';
import { CreateGroomingDialog } from '@/components/staff/grooming/CreateGroomingDialog';
import { GroomingDetailsDialog } from '@/components/staff/grooming/GroomingDetailsDialog';
import { startOfWeek } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GroomingViewMode = 'day' | 'week';

export interface GroomingAppointment {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_breed: string | null;
  client_name: string;
  start_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  groomer_id: string | null;
  notes: string | null;
  service_type: string;
}

const StaffGroomingCalendar = () => {
  const [viewMode, setViewMode] = useState<GroomingViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<GroomingAppointment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Create appointment dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createGroomerId, setCreateGroomerId] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [createTime, setCreateTime] = useState<string | null>(null);

  // Fetch groomers for name lookup
  const { data: groomers } = useQuery({
    queryKey: ['groomers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomers')
        .select('id, name, color')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const handleAppointmentClick = (appointment: GroomingAppointment) => {
    setSelectedAppointment(appointment);
    setDetailsOpen(true);
  };

  const handleCreateAppointment = (groomerId: string, date: Date, time: string) => {
    setCreateGroomerId(groomerId);
    setCreateDate(date);
    setCreateTime(time);
    setCreateOpen(true);
  };

  const getGroomerName = (groomerId: string | null) => {
    if (!groomerId) return null;
    return groomers?.find(g => g.id === groomerId)?.name || null;
  };

  return (
    <StaffLayout>
      <div className="space-y-4">
        <GroomingCalendarHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />

        {viewMode === 'day' ? (
          <GroomingDayView
            date={currentDate}
            onAppointmentClick={handleAppointmentClick}
            onCreateAppointment={handleCreateAppointment}
          />
        ) : (
          <GroomingWeekView
            startDate={startOfWeek(currentDate, { weekStartsOn: 0 })}
            onAppointmentClick={handleAppointmentClick}
            onCreateAppointment={handleCreateAppointment}
          />
        )}

        <GroomingDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          appointment={selectedAppointment}
        />

        <CreateGroomingDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          groomerId={createGroomerId}
          groomerName={getGroomerName(createGroomerId)}
          date={createDate}
          startTime={createTime}
        />
      </div>
    </StaffLayout>
  );
};

export default StaffGroomingCalendar;
