import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface SummaryStats {
  arriving: number;
  departing: number;
  overnight: number;
  total: number;
}

export function MobileDailySummary() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summary, setSummary] = useState<SummaryStats>({ arriving: 0, departing: 0, overnight: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      try {
        const { data: arriving } = await supabase
          .from('reservations')
          .select('id, pet_id, service_type')
          .eq('start_date', dateStr)
          .in('status', ['confirmed', 'checked_in', 'checked_out']);

        const { data: departingEnd } = await supabase
          .from('reservations')
          .select('id')
          .eq('end_date', dateStr)
          .in('status', ['confirmed', 'checked_in', 'checked_out']);

        const sameDayDeparting = arriving?.filter(r => r.service_type !== 'boarding') || [];
        const allDepartingIds = new Set([
          ...(departingEnd?.map(r => r.id) || []),
          ...sameDayDeparting.map(r => r.id)
        ]);

        const { data: overnightData } = await supabase
          .from('reservations')
          .select('id, pet_id, end_date')
          .eq('service_type', 'boarding')
          .lte('start_date', dateStr)
          .in('status', ['confirmed', 'checked_in', 'checked_out']);

        const overnightFiltered = overnightData?.filter(r => !r.end_date || r.end_date > dateStr) || [];

        const arrivingCount = arriving?.length || 0;
        const arrivingPetIds = new Set(arriving?.map(r => r.pet_id) || []);
        const overnightNotArriving = overnightFiltered.filter(r => !arrivingPetIds.has(r.pet_id));

        setSummary({
          arriving: arrivingCount,
          departing: allDepartingIds.size,
          overnight: overnightFiltered.length,
          total: arrivingCount + overnightNotArriving.length,
        });
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [selectedDate]);

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isToday ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setSelectedDate(new Date())}
          >
            {format(selectedDate, 'EEE, MMM d')}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Arriving', value: summary.arriving, color: 'bg-green-100 text-green-700' },
            { label: 'Departing', value: summary.departing, color: 'bg-amber-100 text-amber-700' },
            { label: 'Overnight', value: summary.overnight, color: 'bg-blue-100 text-blue-700' },
            { label: 'Total', value: summary.total, color: 'bg-primary/10 text-primary' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${stat.color}`}>
                {loading ? '-' : stat.value}
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
