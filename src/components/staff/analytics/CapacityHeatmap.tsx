import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, getDay, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ViewMode = 'month' | 'year';
type ServiceFilter = 'all' | 'daycare' | 'boarding';

const getColor = (count: number, maxCap: number) => {
  if (maxCap === 0) return 'bg-muted text-muted-foreground';
  const pct = count / maxCap;
  if (pct >= 0.9) return 'bg-red-500 text-white';
  if (pct >= 0.7) return 'bg-orange-400 text-white';
  if (pct >= 0.5) return 'bg-yellow-400 text-foreground';
  if (pct > 0) return 'bg-green-400 text-foreground';
  return 'bg-muted text-muted-foreground';
};

const getColorDot = (count: number, maxCap: number) => {
  if (maxCap === 0) return 'bg-muted';
  const pct = count / maxCap;
  if (pct >= 0.9) return 'bg-red-500';
  if (pct >= 0.7) return 'bg-orange-400';
  if (pct >= 0.5) return 'bg-yellow-400';
  if (pct > 0) return 'bg-green-400';
  return 'bg-muted';
};

export const CapacityHeatmap = () => {
  const [month, setMonth] = useState(new Date());
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const yearStart = startOfYear(month);
  const yearEnd = endOfYear(month);

  const fetchStart = viewMode === 'year' ? yearStart : monthStart;
  const fetchEnd = viewMode === 'year' ? yearEnd : monthEnd;

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

  const typesToFetch: Array<'daycare' | 'boarding'> = serviceFilter === 'all' ? ['daycare', 'boarding'] : [serviceFilter as 'daycare' | 'boarding'];

  const { data: reservations } = useQuery({
    queryKey: ['capacity-reservations', typesToFetch.join(','), format(fetchStart, 'yyyy-MM-dd'), format(fetchEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase.from('reservations')
        .select('start_date, end_date, status, service_type')
        .in('service_type', typesToFetch)
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .gte('start_date', format(fetchStart, 'yyyy-MM-dd'))
        .lte('start_date', format(fetchEnd, 'yyyy-MM-dd'));
      return data || [];
    },
  });

  const daycareCap = settings?.daycare_max_capacity || 160;
  const boardingCap = settings?.boarding_max_capacity || 55;
  const totalCap = serviceFilter === 'all' ? daycareCap + boardingCap : serviceFilter === 'daycare' ? daycareCap : boardingCap;

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reservations?.forEach(r => {
      const d = r.start_date;
      counts[d] = (counts[d] || 0) + 1;
      if ((r.service_type === 'boarding') && r.end_date && r.end_date !== r.start_date) {
        const days = eachDayOfInterval({ start: new Date(r.start_date + 'T00:00:00'), end: new Date(r.end_date + 'T00:00:00') });
        days.forEach(day => {
          const key = format(day, 'yyyy-MM-dd');
          if (key !== r.start_date) counts[key] = (counts[key] || 0) + 1;
        });
      }
    });
    return counts;
  }, [reservations]);

  const navPrev = () => setMonth(viewMode === 'year' ? subYears(month, 1) : subMonths(month, 1));
  const navNext = () => setMonth(viewMode === 'year' ? addYears(month, 1) : addMonths(month, 1));
  const navLabel = viewMode === 'year' ? format(month, 'yyyy') : format(month, 'MMMM yyyy');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
        <CardTitle className="text-base">Capacity Heatmap</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v as ServiceFilter)}>
            <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="daycare">Daycare</SelectItem>
              <SelectItem value="boarding">Boarding</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} size="sm">
            <ToggleGroupItem value="month" aria-label="Month view"><CalendarDays className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="year" aria-label="Year view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium min-w-[100px] text-center">{navLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navNext}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'month' ? (
          <MonthGrid dayCounts={dayCounts} month={month} maxCap={totalCap} />
        ) : (
          <YearGrid dayCounts={dayCounts} year={month} maxCap={totalCap} />
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Cap: {totalCap}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> &lt;50%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400" /> 50-69%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400" /> 70-89%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> 90%+</span>
        </div>
      </CardContent>
    </Card>
  );
};

const MonthGrid = ({ dayCounts, month, maxCap }: { dayCounts: Record<string, number>; month: Date; maxCap: number }) => {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const startPadding = getDay(start);

  return (
    <div className="grid grid-cols-7 gap-0.5">
      {['S','M','T','W','T','F','S'].map((d, i) => (
        <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-0.5">{d}</div>
      ))}
      {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}
      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const count = dayCounts[key] || 0;
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div className={`h-8 flex items-center justify-center rounded text-[11px] font-semibold cursor-default ${getColor(count, maxCap)}`}>
                <span>{format(day, 'd')}</span>
                {count > 0 && <span className="ml-0.5 text-[10px] opacity-80">({count})</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent><p>{format(day, 'MMM d')}: {count}/{maxCap} ({Math.round((count / maxCap) * 100)}%)</p></TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

const YearGrid = ({ dayCounts, year, maxCap }: { dayCounts: Record<string, number>; year: Date; maxCap: number }) => {
  const months = eachMonthOfInterval({ start: startOfYear(year), end: endOfYear(year) });

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
      {months.map(m => {
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        const days = eachDayOfInterval({ start, end });
        const padding = getDay(start);

        return (
          <div key={format(m, 'yyyy-MM')} className="space-y-0.5">
            <div className="text-[11px] font-semibold text-center text-foreground">{format(m, 'MMM')}</div>
            <div className="grid grid-cols-7 gap-[1px]">
              {Array.from({ length: padding }).map((_, i) => <div key={`p-${i}`} />)}
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const count = dayCounts[key] || 0;
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div className={`w-full aspect-square rounded-[2px] cursor-default ${getColorDot(count, maxCap)}`} />
                    </TooltipTrigger>
                    <TooltipContent><p>{format(day, 'MMM d')}: {count}/{maxCap}</p></TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
