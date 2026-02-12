import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const IncidentHeatmap = () => {
  const { data: incidents } = useQuery({
    queryKey: ['incidents-heatmap'],
    queryFn: async () => {
      const { data: incidentsData } = await supabase.from('incidents')
        .select('severity, category, pet_id');

      if (!incidentsData?.length) return { byBreed: [], byCategory: [] };

      const petIds = [...new Set(incidentsData.map(i => i.pet_id))];
      const { data: pets } = await supabase.from('pets')
        .select('id, breed')
        .in('id', petIds);

      const breedMap = new Map(pets?.map(p => [p.id, p.breed || 'Unknown']) || []);

      // Group by breed + severity
      const breedSeverity: Record<string, Record<string, number>> = {};
      incidentsData.forEach(i => {
        const breed = breedMap.get(i.pet_id) || 'Unknown';
        if (!breedSeverity[breed]) breedSeverity[breed] = {};
        breedSeverity[breed][i.severity] = (breedSeverity[breed][i.severity] || 0) + 1;
      });

      const byBreed = Object.entries(breedSeverity)
        .map(([breed, sev]) => ({
          breed,
          Low: sev['Low'] || 0,
          Medium: sev['Medium'] || 0,
          High: sev['High'] || 0,
          total: (sev['Low'] || 0) + (sev['Medium'] || 0) + (sev['High'] || 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

      // Group by category
      const catCounts: Record<string, number> = {};
      incidentsData.forEach(i => { catCounts[i.category] = (catCounts[i.category] || 0) + 1; });
      const byCategory = Object.entries(catCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      return { byBreed, byCategory };
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Incident Breakdown</CardTitle></CardHeader>
      <CardContent>
        {!incidents?.byBreed?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No incidents recorded</p>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[200px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Breed</TableHead>
                    <TableHead className="text-center">Low</TableHead>
                    <TableHead className="text-center">Med</TableHead>
                    <TableHead className="text-center">High</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.byBreed.map(row => (
                    <TableRow key={row.breed}>
                      <TableCell className="font-medium">{row.breed}</TableCell>
                      <TableCell className="text-center">{row.Low || '—'}</TableCell>
                      <TableCell className="text-center">{row.Medium || '—'}</TableCell>
                      <TableCell className="text-center font-bold text-destructive">{row.High || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-2">
              {incidents.byCategory.map(c => (
                <Badge key={c.category} variant="outline">{c.category}: {c.count}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
