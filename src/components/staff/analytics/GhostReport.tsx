import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Ghost } from 'lucide-react';
import { format, subDays } from 'date-fns';

export const GhostReport = () => {
  const [threshold, setThreshold] = useState('30');

  const { data: ghosts, isLoading } = useQuery({
    queryKey: ['ghost-report', threshold],
    queryFn: async () => {
      const cutoffDate = format(subDays(new Date(), parseInt(threshold)), 'yyyy-MM-dd');

      // Get all active pets with their clients
      const { data: pets } = await supabase.from('pets')
        .select('id, name, breed, client_id')
        .eq('is_active', true);

      if (!pets || pets.length === 0) return [];

      // Get client names
      const clientIds = [...new Set(pets.map(p => p.client_id))];
      const { data: clients } = await supabase.from('clients')
        .select('id, first_name, last_name')
        .in('id', clientIds);
      const clientMap = new Map(clients?.map(c => [c.id, `${c.first_name} ${c.last_name}`]) || []);

      // Get last reservation per pet
      const { data: reservations } = await supabase.from('reservations')
        .select('pet_id, start_date')
        .in('pet_id', pets.map(p => p.id))
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .order('start_date', { ascending: false });

      const lastVisit = new Map<string, string>();
      reservations?.forEach(r => {
        if (!lastVisit.has(r.pet_id)) lastVisit.set(r.pet_id, r.start_date);
      });

      return pets
        .filter(p => {
          const last = lastVisit.get(p.id);
          return !last || last < cutoffDate;
        })
        .map(p => ({
          ...p,
          ownerName: clientMap.get(p.client_id) || 'Unknown',
          lastVisit: lastVisit.get(p.id) || null,
        }))
        .sort((a, b) => (a.lastVisit || '').localeCompare(b.lastVisit || ''));
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Ghost className="h-4 w-4" /> Ghost Report</CardTitle>
        <ToggleGroup type="single" value={threshold} onValueChange={(v) => v && setThreshold(v)} size="sm">
          <ToggleGroupItem value="30">30d</ToggleGroupItem>
          <ToggleGroupItem value="60">60d</ToggleGroupItem>
          <ToggleGroupItem value="90">90d</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !ghosts?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No inactive pets found</p>
        ) : (
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pet</TableHead>
                  <TableHead>Breed</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ghosts.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>{g.breed || '—'}</TableCell>
                    <TableCell>{g.ownerName}</TableCell>
                    <TableCell>{g.lastVisit ? format(new Date(g.lastVisit), 'MMM d, yyyy') : 'Never'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">{ghosts?.length || 0} pet(s) with no visits in {threshold}+ days</p>
      </CardContent>
    </Card>
  );
};
