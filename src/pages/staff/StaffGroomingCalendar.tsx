import { useState, useEffect } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { GroomingCalendarHeader } from '@/components/staff/grooming/GroomingCalendarHeader';
import { GroomingDayView } from '@/components/staff/grooming/GroomingDayView';
import { GroomingWeekView } from '@/components/staff/grooming/GroomingWeekView';
import { CreateGroomingDialog } from '@/components/staff/grooming/CreateGroomingDialog';
import { GroomingDetailsDialog } from '@/components/staff/grooming/GroomingDetailsDialog';
import { PendingGroomingRequests } from '@/components/staff/grooming/PendingGroomingRequests';
import { startOfWeek } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GroomingViewMode = 'day' | 'week';

export interface GroomingAppointment {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_breed: string | null;
  client_name: string;
  client_phone: string | null;
  start_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  groomer_id: string | null;
  groomer_name: string | null;
  notes: string | null;
  service_type: string;
}

const StaffGroomingCalendar = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<GroomingViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<GroomingAppointment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterGroomerId, setFilterGroomerId] = useState<string | null>(null);
  
  // Create appointment dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createGroomerId, setCreateGroomerId] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [createTime, setCreateTime] = useState<string | null>(null);

  // Fetch groomers for name lookup and filter dropdown
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

  // Real-time subscription for auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel('grooming-calendar-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['grooming-appointments'] });
          queryClient.invalidateQueries({ queryKey: ['grooming-appointments-week'] });
          queryClient.invalidateQueries({ queryKey: ['pending-grooming'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groomers' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['groomers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // 30-second polling fallback for data consistency
  useEffect(() => {
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['grooming-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['grooming-appointments-week'] });
      queryClient.invalidateQueries({ queryKey: ['pending-grooming'] });
      queryClient.invalidateQueries({ queryKey: ['groomers'] });
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [queryClient]);

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
          groomers={groomers || []}
          selectedGroomerId={filterGroomerId}
          onGroomerFilterChange={setFilterGroomerId}
        />

        {/* Pending Requests Section */}
        <PendingGroomingRequests groomers={groomers || []} />

        {viewMode === 'day' ? (
          <GroomingDayView
            date={currentDate}
            onAppointmentClick={handleAppointmentClick}
            onCreateAppointment={handleCreateAppointment}
            filterGroomerId={filterGroomerId}
          />
        ) : (
          <GroomingWeekView
            startDate={startOfWeek(currentDate, { weekStartsOn: 0 })}
            onAppointmentClick={handleAppointmentClick}
            onCreateAppointment={handleCreateAppointment}
            filterGroomerId={filterGroomerId}
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
