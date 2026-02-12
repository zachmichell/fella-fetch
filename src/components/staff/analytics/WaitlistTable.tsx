import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';

export const WaitlistTable = () => {
  const { data: waitlist } = useQuery({
    queryKey: ['training-waitlist'],
    queryFn: async () => {
      const { data: enrollments } = await supabase.from('class_enrollments')
        .select('class_session_id, status')
        .eq('status', 'Interested');

      const { data: sessions } = await supabase.from('class_sessions')
        .select('id, class_type_id');

      const { data: classTypes } = await supabase.from('class_types')
        .select('id, name, level')
        .eq('is_active', true)
        .order('level');

      if (!classTypes) return [];

      const sessionTypeMap = new Map(sessions?.map(s => [s.id, s.class_type_id]));

      return classTypes.map(ct => {
        const count = enrollments?.filter(e => {
          const typeId = sessionTypeMap.get(e.class_session_id);
          return typeId === ct.id;
        }).length || 0;
        return { name: ct.name, level: ct.level, interested: count };
      });
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Waitlist</CardTitle></CardHeader>
      <CardContent>
        {!waitlist?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No class types defined yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Interested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waitlist.map(w => (
                <TableRow key={w.name}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>L{w.level}</TableCell>
                  <TableCell className="text-right">{w.interested}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
