import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';

export const ReliabilityChart = () => {
  const startDate = format(subMonths(new Date(), 3), 'yyyy-MM-dd');

  const { data: chartData } = useQuery({
    queryKey: ['grooming-reliability', startDate],
    queryFn: async () => {
      const { data: groomers } = await supabase.from('groomers').select('id, name').eq('is_active', true);
      const { data: cancelled } = await supabase.from('reservations')
        .select('groomer_id')
        .eq('service_type', 'grooming')
        .eq('status', 'cancelled')
        .gte('start_date', startDate);

      const counts: Record<string, number> = {};
      cancelled?.forEach(r => {
        if (r.groomer_id) counts[r.groomer_id] = (counts[r.groomer_id] || 0) + 1;
      });

      return groomers?.map(g => ({
        name: g.name,
        cancellations: counts[g.id] || 0,
      })) || [];
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Cancellations / No-Shows (Last 3mo)</CardTitle></CardHeader>
      <CardContent>
        {!chartData?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" />
              <Tooltip />
              <Bar dataKey="cancellations" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
