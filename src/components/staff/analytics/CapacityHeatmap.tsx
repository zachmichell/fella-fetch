import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const CapacityHeatmap = () => {
  const [month, setMonth] = useState(new Date());
  const [serviceType, setServiceType] = useState<'daycare' | 'boarding'>('daycare');

  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const { data: settings } = useQuery({
    queryKey: ['system-settings', 'capacity'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings')
        .select('key, value')
        .in('key', ['daycare_max_capacity', 'boarding_max_capacity']);
      const map: Record<string, number> = {};
      data?.forEach(s => { map[s.key] = typeof s.value === 'number' ? s.value : parseInt(String(s.value), 10); });
      return map;
    },
  });

  const { data: reservations } = useQuery({
    queryKey: ['capacity-reservations', serviceType, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase.from('reservations')
        .select('start_date, end_date, status')
        .eq('service_type', serviceType)
        .in('status', ['confirmed', 'checked_in'])
        .gte('start_date', format(start, 'yyyy-MM-dd'))
        .lte('start_date', format(end, 'yyyy-MM-dd'));
      return data || [];
    },
  });

  const maxCap = settings?.[`${serviceType}_max_capacity`] || (serviceType === 'daycare' ? 160 : 55);

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reservations?.forEach(r => {
      const d = r.start_date;
      counts[d] = (counts[d] || 0) + 1;
      // For boarding, count each night between start and end
      if (serviceType === 'boarding' && r.end_date && r.end_date !== r.start_date) {
        const days = eachDayOfInterval({ start: new Date(r.start_date), end: new Date(r.end_date) });
        days.forEach(day => {
          const key = format(day, 'yyyy-MM-dd');
          if (key !== r.start_date) counts[key] = (counts[key] || 0) + 1;
        });
      }
    });
    return counts;
  }, [reservations, serviceType]);

  const days = eachDayOfInterval({ start, end });
  const startPadding = getDay(start);

  const getColor = (count: number) => {
    const pct = count / maxCap;
    if (pct >= 0.9) return 'bg-red-500 text-white';
    if (pct >= 0.7) return 'bg-orange-400 text-white';
    if (pct >= 0.5) return 'bg-yellow-400 text-foreground';
    if (pct > 0) return 'bg-green-400 text-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Capacity Heatmap</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={serviceType} onValueChange={(v) => setServiceType(v as any)}>
            <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daycare">Daycare</SelectItem>
              <SelectItem value="boarding">Boarding</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium min-w-[100px] text-center">{format(month, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const count = dayCounts[key] || 0;
            const pct = Math.round((count / maxCap) * 100);
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div className={`aspect-square flex items-center justify-center rounded text-xs font-medium cursor-default ${getColor(count)}`}>
                    {format(day, 'd')}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{format(day, 'MMM d')}: {count}/{maxCap} ({pct}%)</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> &lt;50%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400" /> 50-69%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400" /> 70-89%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> 90%+</span>
        </div>
      </CardContent>
    </Card>
  );
};
