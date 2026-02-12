import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const ProgressionFunnel = () => {
  const { data: funnelData } = useQuery({
    queryKey: ['training-funnel'],
    queryFn: async () => {
      const { data: enrollments } = await supabase.from('class_enrollments')
        .select('status, class_session_id');

      const { data: sessions } = await supabase.from('class_sessions')
        .select('id, class_type_id');

      const { data: classTypes } = await supabase.from('class_types')
        .select('id, name, level')
        .order('level', { ascending: true });

      if (!classTypes || !enrollments || !sessions) return [];

      const sessionTypeMap = new Map(sessions?.map(s => [s.id, s.class_type_id]));

      const results = classTypes.map(ct => {
        const sessionIds = sessions?.filter(s => s.class_type_id === ct.id).map(s => s.id) || [];
        const relevant = enrollments?.filter(e => sessionIds.includes(e.class_session_id)) || [];
        return {
          name: ct.name,
          Interested: relevant.filter(e => e.status === 'Interested').length,
          Enrolled: relevant.filter(e => e.status === 'Enrolled').length,
          Graduated: relevant.filter(e => e.status === 'Graduated').length,
          Dropped: relevant.filter(e => e.status === 'Dropped').length,
        };
      });

      return results;
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Training Progression</CardTitle></CardHeader>
      <CardContent>
        {!funnelData?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No training data yet. Create class types and enroll pets to see the funnel.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={120} className="text-xs" />
              <Tooltip />
              <Bar dataKey="Interested" fill="hsl(var(--muted-foreground))" stackId="a" />
              <Bar dataKey="Enrolled" fill="hsl(var(--primary))" stackId="a" />
              <Bar dataKey="Graduated" fill="hsl(142, 76%, 36%)" stackId="a" />
              <Bar dataKey="Dropped" fill="hsl(var(--destructive))" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
