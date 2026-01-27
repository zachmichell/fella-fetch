import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface DailySummaryStats {
  arriving: number;
  departing: number;
  overnight: number;
  total: number;
}

interface ServiceTypeStats {
  serviceType: string;
  displayName: string;
  arriving: number;
  departing: number;
  overnight: number;
  total: number;
}

const SERVICE_TYPE_DISPLAY: Record<string, string> = {
  daycare: 'Daycare',
  boarding: 'Boarding',
  grooming: 'Grooming',
  training: 'Training',
};

export const DailySummaryTable = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState<DailySummaryStats>({
    arriving: 0,
    departing: 0,
    overnight: 0,
    total: 0,
  });
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceTypeStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummaryData = async () => {
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      // Fetch reservations that START on this date (arriving)
      const { data: arrivingData } = await supabase
        .from('reservations')
        .select('id, service_type, status')
        .eq('start_date', dateStr)
        .neq('status', 'cancelled');

      // Fetch reservations that END on this date (departing)
      const { data: departingData } = await supabase
        .from('reservations')
        .select('id, service_type, status')
        .eq('end_date', dateStr)
        .neq('status', 'cancelled');

      // Fetch overnight reservations (boarding that started before and ends after this date)
      // Also include boarding that started before this date and either has no end_date or ends after this date
      const { data: overnightData } = await supabase
        .from('reservations')
        .select('id, service_type, status, start_date, end_date')
        .eq('service_type', 'boarding')
        .lt('start_date', dateStr)
        .neq('status', 'cancelled');

      // Filter overnight to only include those that are still here on this date
      const overnightFiltered = overnightData?.filter(r => {
        if (!r.end_date) return true; // No end date means still here
        return r.end_date > dateStr; // End date is after the selected date
      }) || [];

      // Calculate overall summary
      const arrivingCount = arrivingData?.length || 0;
      const departingCount = departingData?.length || 0;
      const overnightCount = overnightFiltered.length;
      
      // Total unique pets for the day = arriving + overnight (departing is subset of overnight or arriving)
      // Actually: pets in facility = arriving + overnight staying (not departing today)
      const totalCount = arrivingCount + overnightCount;

      setSummary({
        arriving: arrivingCount,
        departing: departingCount,
        overnight: overnightCount,
        total: totalCount,
      });

      // Calculate breakdown by service type
      const serviceTypes = ['daycare', 'boarding', 'grooming', 'training'];
      const breakdown: ServiceTypeStats[] = serviceTypes.map(st => {
        const arriving = arrivingData?.filter(r => r.service_type === st).length || 0;
        const departing = departingData?.filter(r => r.service_type === st).length || 0;
        const overnight = st === 'boarding' ? overnightCount : 0;
        const total = arriving + (st === 'boarding' ? overnight : 0);

        return {
          serviceType: st,
          displayName: SERVICE_TYPE_DISPLAY[st] || st,
          arriving,
          departing,
          overnight,
          total,
        };
      }).filter(s => s.arriving > 0 || s.departing > 0 || s.overnight > 0 || s.total > 0);

      setServiceBreakdown(breakdown);
    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [selectedDate]);

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Daily Summary</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToPreviousDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={isToday ? "default" : "outline"}
              size="sm"
              className="min-w-[140px]"
              onClick={goToToday}
            >
              {format(selectedDate, 'EEE, MMM d, yyyy')}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 font-medium">
                      {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      Category
                    </Button>
                  </CollapsibleTrigger>
                </TableHead>
                <TableHead className="text-center">Arriving</TableHead>
                <TableHead className="text-center">Departing</TableHead>
                <TableHead className="text-center">Overnight</TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Summary Row */}
              <TableRow className="font-medium bg-muted/30">
                <TableCell>All Services</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                    {loading ? '-' : summary.arriving}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
                    {loading ? '-' : summary.departing}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                    {loading ? '-' : summary.overnight}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {loading ? '-' : summary.total}
                  </span>
                </TableCell>
              </TableRow>

              {/* Expanded Service Type Rows */}
              <CollapsibleContent asChild>
                <>
                  {serviceBreakdown.length > 0 ? (
                    serviceBreakdown.map((service) => (
                      <TableRow key={service.serviceType} className="text-muted-foreground">
                        <TableCell className="pl-6">{service.displayName}</TableCell>
                        <TableCell className="text-center">{service.arriving}</TableCell>
                        <TableCell className="text-center">{service.departing}</TableCell>
                        <TableCell className="text-center">{service.overnight}</TableCell>
                        <TableCell className="text-center">{service.total}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No reservations for this date
                      </TableCell>
                    </TableRow>
                  )}
                </>
              </CollapsibleContent>
            </TableBody>
          </Table>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
