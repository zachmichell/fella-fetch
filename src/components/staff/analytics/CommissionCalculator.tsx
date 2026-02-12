import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { DollarSign } from 'lucide-react';

export const CommissionCalculator = () => {
  const [groomerId, setGroomerId] = useState('');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: groomers } = useQuery({
    queryKey: ['groomers-commission'],
    queryFn: async () => {
      const { data } = await supabase.from('groomers').select('id, name, commission_rate').eq('is_active', true);
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['grooming-stats', groomerId, startDate, endDate],
    enabled: !!groomerId,
    queryFn: async () => {
      const { data } = await supabase.from('reservations')
        .select('id, price, status')
        .eq('service_type', 'grooming')
        .eq('groomer_id', groomerId)
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .gte('start_date', startDate)
        .lte('start_date', endDate);

      const totalRevenue = data?.reduce((sum, r) => sum + (r.price || 0), 0) || 0;
      const appointmentCount = data?.length || 0;
      return { totalRevenue, appointmentCount };
    },
  });

  const selectedGroomer = groomers?.find(g => g.id === groomerId);
  const rate = selectedGroomer?.commission_rate || 50;
  const takeHome = stats ? Math.round(stats.totalRevenue * rate) / 100 : 0;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Commission Calculator</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={groomerId} onValueChange={setGroomerId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select groomer" /></SelectTrigger>
            <SelectContent>
              {groomers?.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9" />
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9" />
        </div>
        {groomerId && stats && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{stats.appointmentCount}</p>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-2xl font-bold text-primary">${takeHome.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Take-Home ({rate}%)</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
