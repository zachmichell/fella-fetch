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
type ServiceFilter = 'all' | 'daycare' | 'boarding' | 'grooming' | 'training';

const SERVICE_OPTIONS: { value: ServiceFilter; label: string }[] = [
  { value: 'all', label: 'All Services' },
  { value: 'daycare', label: 'Daycare' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'training', label: 'Training' },
];

const SERVICE_LABELS: Record<string, { label: string; short: string; color: string }> = {
  daycare: { label: 'Daycare', short: 'DC', color: 'text-blue-600' },
  boarding: { label: 'Boarding', short: 'BD', color: 'text-purple-600' },
  grooming: { label: 'Grooming', short: 'GR', color: 'text-pink-600' },
  training: { label: 'Training', short: 'TR', color: 'text-amber-600' },
};

const CAPACITY_KEYS = [
  'daycare_max_capacity',
  'boarding_max_capacity',
  'grooming_max_capacity',
  'training_max_capacity',
] as const;

const CAPACITY_DEFAULTS: Record<string, number> = {
  daycare_max_capacity: 160,
  boarding_max_capacity: 55,
  grooming_max_capacity: 15,
  training_max_capacity: 20,
};

const getColor = (count: number, maxCap: number) => {
  if (maxCap === 0) return 'bg-muted text-muted-foreground';
  const pct = count / maxCap;
  if (pct >= 0.9) return 'bg-green-500 text-white';
  if (pct >= 0.7) return 'bg-yellow-400 text-foreground';
  if (pct >= 0.5) return 'bg-orange-400 text-foreground';
  if (pct > 0) return 'bg-red-400 text-foreground';
  return 'bg-muted text-muted-foreground';
};

const getColorDot = (count: number, maxCap: number) => {
  if (maxCap === 0) return 'bg-muted';
  const pct = count / maxCap;
  if (pct >= 0.9) return 'bg-green-500';
  if (pct >= 0.7) return 'bg-yellow-400';
  if (pct >= 0.5) return 'bg-orange-400';
  if (pct > 0) return 'bg-red-400';
  return 'bg-muted';
};

type DayData = {
  total: number;
  byType: Record<string, number>;
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
        .in('key', [...CAPACITY_KEYS]);
      const map: Record<string, number> = {};
      data?.forEach(s => { map[s.key] = typeof s.value === 'number' ? s.value : parseInt(String(s.value), 10); });
      return map;
    },
  });

  // Always fetch all types so we can show breakdown
  const { data: reservations } = useQuery({
    queryKey: ['capacity-reservations', 'all', format(fetchStart, 'yyyy-MM-dd'), format(fetchEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase.from('reservations')
        .select('start_date, end_date, status, service_type')
        .in('service_type', ['daycare', 'boarding', 'grooming', 'training'])
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .gte('start_date', format(fetchStart, 'yyyy-MM-dd'))
        .lte('start_date', format(fetchEnd, 'yyyy-MM-dd'));
      return data || [];
    },
  });

  const getCap = (key: string) => settings?.[key] || CAPACITY_DEFAULTS[key] || 0;

  const totalCap = useMemo(() => {
    if (serviceFilter === 'all') {
      return getCap('daycare_max_capacity') + getCap('boarding_max_capacity') + getCap('grooming_max_capacity') + getCap('training_max_capacity');
    }
    return getCap(`${serviceFilter}_max_capacity`);
  }, [settings, serviceFilter]);

  const activeTypes = serviceFilter === 'all'
    ? ['daycare', 'boarding', 'grooming', 'training']
    : [serviceFilter];

  const dayData = useMemo(() => {
    const data: Record<string, DayData> = {};
    const addCount = (dateKey: string, type: string) => {
      if (!data[dateKey]) data[dateKey] = { total: 0, byType: {} };
      data[dateKey].byType[type] = (data[dateKey].byType[type] || 0) + 1;
      if (activeTypes.includes(type)) {
        data[dateKey].total = (data[dateKey].total || 0) + 1;
      }
    };

    reservations?.forEach(r => {
      addCount(r.start_date, r.service_type);
      if (r.service_type === 'boarding' && r.end_date && r.end_date !== r.start_date) {
        const days = eachDayOfInterval({ start: new Date(r.start_date + 'T00:00:00'), end: new Date(r.end_date + 'T00:00:00') });
        days.forEach(day => {
          const key = format(day, 'yyyy-MM-dd');
          if (key !== r.start_date) addCount(key, r.service_type);
        });
      }
    });

    // Recalculate totals based on filter
    Object.keys(data).forEach(key => {
      data[key].total = activeTypes.reduce((sum, t) => sum + (data[key].byType[t] || 0), 0);
    });

    return data;
  }, [reservations, activeTypes]);

  const navPrev = () => setMonth(viewMode === 'year' ? subYears(month, 1) : subMonths(month, 1));
  const navNext = () => setMonth(viewMode === 'year' ? addYears(month, 1) : addMonths(month, 1));
  const navLabel = viewMode === 'year' ? format(month, 'yyyy') : format(month, 'MMMM yyyy');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
        <CardTitle className="text-base">Capacity Heatmap</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v as ServiceFilter)}>
            <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SERVICE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
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
          <MonthGrid dayData={dayData} month={month} maxCap={totalCap} activeTypes={activeTypes} />
        ) : (
          <YearGrid dayData={dayData} year={month} maxCap={totalCap} activeTypes={activeTypes} />
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
          <span className="text-foreground font-medium">Cap: {totalCap}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> &lt;50%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400" /> 50-69%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400" /> 70-89%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> 90%+</span>
          <span className="mx-1 border-l border-border h-4" />
          {Object.entries(SERVICE_LABELS).map(([k, v]) => (
            <span key={k} className={`flex items-center gap-0.5 ${v.color} font-medium`}>{v.short}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const MonthGrid = ({ dayData, month, maxCap, activeTypes }: { dayData: Record<string, DayData>; month: Date; maxCap: number; activeTypes: string[] }) => {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const startPadding = getDay(start);

  return (
    <div className="grid grid-cols-7 gap-1">
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
        <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">{d}</div>
      ))}
      {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}
      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const dd = dayData[key];
        const total = dd?.total || 0;

        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div className={`min-h-[72px] rounded border border-border/50 p-1 flex flex-col cursor-default ${getColor(total, maxCap)}`}>
                <span className="text-[10px] font-bold leading-none">{format(day, 'd')}</span>
                <div className="flex-1 flex flex-col justify-center gap-px mt-0.5">
                  {activeTypes.map(t => {
                    const count = dd?.byType[t] || 0;
                    const info = SERVICE_LABELS[t];
                    return (
                      <div key={t} className="flex items-center justify-between text-[9px] leading-tight">
                        <span className="opacity-80">{info.short}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
                {activeTypes.length > 1 && (
                  <div className="flex items-center justify-between text-[9px] leading-tight border-t border-current/20 pt-px mt-px">
                    <span className="opacity-80">Tot</span>
                    <span className="font-bold">{total}</span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{format(day, 'MMM d, yyyy')}</p>
              {activeTypes.map(t => (
                <p key={t} className="text-xs">{SERVICE_LABELS[t].label}: {dd?.byType[t] || 0}</p>
              ))}
              <p className="text-xs font-bold mt-1">Total: {total}/{maxCap} ({maxCap > 0 ? Math.round((total / maxCap) * 100) : 0}%)</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

const YearGrid = ({ dayData, year, maxCap, activeTypes }: { dayData: Record<string, DayData>; year: Date; maxCap: number; activeTypes: string[] }) => {
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
                const total = dayData[key]?.total || 0;
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div className={`w-full aspect-square rounded-[2px] cursor-default ${getColorDot(total, maxCap)}`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{format(day, 'MMM d')}</p>
                      {activeTypes.map(t => (
                        <p key={t} className="text-xs">{SERVICE_LABELS[t].label}: {dayData[key]?.byType[t] || 0}</p>
                      ))}
                      <p className="text-xs font-bold">Total: {total}/{maxCap}</p>
                    </TooltipContent>
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
