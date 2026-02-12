import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Crown } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const VipList = () => {
  const { data: vips, isLoading } = useQuery({
    queryKey: ['vip-list'],
    queryFn: async () => {
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const start = format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd');

      const response = await supabase.functions.invoke('analytics-revenue', {
        body: { startDate: start, endDate: end },
      });

      if (response.error || !response.data?.topSpenders) return [];

      // Match top spenders to clients
      const spenders = response.data.topSpenders as Array<{ email: string; name: string; total: number }>;

      const emails = spenders.map(s => s.email).filter(e => e !== 'unknown');
      const { data: clients } = await supabase.from('clients')
        .select('id, first_name, last_name, email')
        .in('email', emails);

      const clientMap = new Map(clients?.map(c => [c.email, `${c.first_name} ${c.last_name}`]) || []);

      return spenders.slice(0, 10).map((s, i) => ({
        rank: i + 1,
        name: clientMap.get(s.email) || s.name || s.email,
        email: s.email,
        total: s.total,
      }));
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4 text-yellow-500" /> VIP List (Top Spenders)</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : !vips?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No spending data available</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Lifetime Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vips.map(v => (
                <TableRow key={v.rank}>
                  <TableCell className="font-bold">{v.rank}</TableCell>
                  <TableCell>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.email}</div>
                  </TableCell>
                  <TableCell className="text-right font-bold">${v.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
