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
  arrivingSubscriptions: number;
  departingSubscriptions: number;
  overnightSubscriptions: number;
  totalSubscriptions: number;
}

interface ServiceTypeStats {
  serviceType: string;
  displayName: string;
  arriving: number;
  departing: number;
  overnight: number;
  total: number;
  arrivingSubscriptions: number;
  departingSubscriptions: number;
  overnightSubscriptions: number;
  totalSubscriptions: number;
}

interface ServiceTypeRecord {
  name: string;
  display_name: string;
  category: string;
}

export const DailySummaryTable = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState<DailySummaryStats>({
    arriving: 0,
    departing: 0,
    overnight: 0,
    total: 0,
    arrivingSubscriptions: 0,
    departingSubscriptions: 0,
    overnightSubscriptions: 0,
    totalSubscriptions: 0,
  });
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceTypeStats[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch service types from database
  useEffect(() => {
    const fetchServiceTypes = async () => {
      const { data } = await supabase
        .from('service_types')
        .select('name, display_name, category')
        .eq('is_active', true)
        .in('category', ['reservation', 'service'])
        .order('sort_order');
      
      if (data) {
        setServiceTypes(data);
      }
    };
    fetchServiceTypes();
  }, []);

  const fetchSummaryData = async () => {
    if (serviceTypes.length === 0) return;
    
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      // Fetch reservations that START on this date (arriving) - must be accepted (confirmed or checked_in)
      const { data: arrivingData } = await supabase
        .from('reservations')
        .select('id, pet_id, service_type, status, start_date, end_date, subscription_id')
        .eq('start_date', dateStr)
        .in('status', ['confirmed', 'checked_in', 'checked_out']);

      // Fetch reservations that END on this date (departing) - must be accepted
      const { data: departingWithEndDate } = await supabase
        .from('reservations')
        .select('id, pet_id, service_type, status, start_date, end_date, subscription_id')
        .eq('end_date', dateStr)
        .in('status', ['confirmed', 'checked_in', 'checked_out']);

      // Get list of same-day service types (everything except boarding)
      const sameDayServiceTypes = serviceTypes
        .filter(st => st.name !== 'boarding')
        .map(st => st.name);

      // For same-day services without end_date, they depart the same day they arrive
      const sameDayDeparting = arrivingData?.filter(r => 
        !r.end_date && sameDayServiceTypes.includes(r.service_type)
      ) || [];

      // Combine departing: those with end_date today + same-day services starting today
      const allDepartingIds = new Set([
        ...(departingWithEndDate?.map(r => r.id) || []),
        ...sameDayDeparting.map(r => r.id)
      ]);
      const departingCount = allDepartingIds.size;

      // Fetch overnight reservations (boarding that spans overnight on this date)
      const { data: overnightData } = await supabase
        .from('reservations')
        .select('id, pet_id, service_type, status, start_date, end_date, subscription_id')
        .eq('service_type', 'boarding')
        .lte('start_date', dateStr)
        .in('status', ['confirmed', 'checked_in', 'checked_out']);

      // Filter overnight: must end after today (staying overnight) or have no end date
      const overnightFiltered = overnightData?.filter(r => {
        if (!r.end_date) return true;
        return r.end_date > dateStr;
      }) || [];

      // Calculate overall summary
      const arrivingCount = arrivingData?.length || 0;
      const arrivingSubscriptionCount = arrivingData?.filter((r: any) => r.subscription_id).length || 0;
      const overnightCount = overnightFiltered.length;
      const overnightSubscriptionCount = overnightFiltered.filter((r: any) => r.subscription_id).length;
      
      // Departing subscriptions
      const allDepartingReservations = [
        ...(departingWithEndDate || []),
        ...sameDayDeparting
      ];
      const uniqueDepartingMap = new Map();
      allDepartingReservations.forEach((r: any) => uniqueDepartingMap.set(r.id, r));
      const departingSubscriptionCount = Array.from(uniqueDepartingMap.values()).filter((r: any) => r.subscription_id).length;
      
      // Total unique pets for the day
      const arrivingPetIds = new Set(arrivingData?.map((r: any) => r.pet_id) || []);
      const overnightNotArrivingToday = overnightFiltered.filter((r: any) => !arrivingPetIds.has(r.pet_id));
      const totalCount = arrivingCount + overnightNotArrivingToday.length;
      
      // Total subscriptions (arriving subscriptions + overnight subscriptions not arriving today)
      const arrivingSubscriptionPetIds = new Set(arrivingData?.filter((r: any) => r.subscription_id).map((r: any) => r.pet_id) || []);
      const overnightSubscriptionsNotArrivingToday = overnightFiltered.filter((r: any) => r.subscription_id && !arrivingSubscriptionPetIds.has(r.pet_id)).length;
      const totalSubscriptionCount = arrivingSubscriptionCount + overnightSubscriptionsNotArrivingToday;

      setSummary({
        arriving: arrivingCount,
        departing: departingCount,
        overnight: overnightCount,
        total: totalCount,
        arrivingSubscriptions: arrivingSubscriptionCount,
        departingSubscriptions: departingSubscriptionCount,
        overnightSubscriptions: overnightSubscriptionCount,
        totalSubscriptions: totalSubscriptionCount,
      });

      // Calculate breakdown by service type using dynamic service types
      const breakdown: ServiceTypeStats[] = serviceTypes.map(st => {
        const arrivingForType = arrivingData?.filter((r: any) => r.service_type === st.name) || [];
        const arriving = arrivingForType.length;
        const arrivingSubscriptions = arrivingForType.filter((r: any) => r.subscription_id).length;
        
        // Departing for this service type
        const departingForType = [
          ...(departingWithEndDate?.filter((r: any) => r.service_type === st.name) || []),
          ...sameDayDeparting.filter((r: any) => r.service_type === st.name)
        ];
        const uniqueDepartingMap = new Map();
        departingForType.forEach((r: any) => uniqueDepartingMap.set(r.id, r));
        const departing = uniqueDepartingMap.size;
        const departingSubscriptions = Array.from(uniqueDepartingMap.values()).filter((r: any) => r.subscription_id).length;
        
        const overnightForType = st.name === 'boarding' ? overnightFiltered : [];
        const overnight = overnightForType.length;
        const overnightSubscriptions = overnightForType.filter((r: any) => r.subscription_id).length;
        
        // Total for this type: arriving + overnight that didn't arrive today
        const arrivingPetIdsForType = new Set(arrivingForType.map((r: any) => r.pet_id));
        const overnightNotArrivingForType = st.name === 'boarding' 
          ? overnightFiltered.filter((r: any) => !arrivingPetIdsForType.has(r.pet_id))
          : [];
        const total = arriving + overnightNotArrivingForType.length;
        
        // Total subscriptions for this type
        const arrivingSubPetIdsForType = new Set(arrivingForType.filter((r: any) => r.subscription_id).map((r: any) => r.pet_id));
        const overnightSubsNotArrivingForType = st.name === 'boarding' 
          ? overnightFiltered.filter((r: any) => r.subscription_id && !arrivingSubPetIdsForType.has(r.pet_id)).length
          : 0;
        const totalSubscriptions = arrivingSubscriptions + overnightSubsNotArrivingForType;

        return {
          serviceType: st.name,
          displayName: st.display_name,
          arriving,
          departing,
          overnight,
          total,
          arrivingSubscriptions,
          departingSubscriptions,
          overnightSubscriptions,
          totalSubscriptions,
        };
      });

      setServiceBreakdown(breakdown);
    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [selectedDate, serviceTypes]);

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
                  <span className="inline-flex items-center justify-center h-7 min-w-[28px] px-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                    {loading ? '-' : summary.arriving}
                    {!loading && summary.arrivingSubscriptions > 0 && (
                      <span className="text-xs ml-0.5">({summary.arrivingSubscriptions})</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center h-7 min-w-[28px] px-1 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
                    {loading ? '-' : summary.departing}
                    {!loading && summary.departingSubscriptions > 0 && (
                      <span className="text-xs ml-0.5">({summary.departingSubscriptions})</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center h-7 min-w-[28px] px-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                    {loading ? '-' : summary.overnight}
                    {!loading && summary.overnightSubscriptions > 0 && (
                      <span className="text-xs ml-0.5">({summary.overnightSubscriptions})</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center h-7 min-w-[28px] px-1 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {loading ? '-' : summary.total}
                    {!loading && summary.totalSubscriptions > 0 && (
                      <span className="text-xs ml-0.5">({summary.totalSubscriptions})</span>
                    )}
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
                        <TableCell className="text-center">
                          {service.arriving}
                          {service.arrivingSubscriptions > 0 && (
                            <span className="text-xs ml-0.5">({service.arrivingSubscriptions})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {service.departing}
                          {service.departingSubscriptions > 0 && (
                            <span className="text-xs ml-0.5">({service.departingSubscriptions})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {service.overnight}
                          {service.overnightSubscriptions > 0 && (
                            <span className="text-xs ml-0.5">({service.overnightSubscriptions})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {service.total}
                          {service.totalSubscriptions > 0 && (
                            <span className="text-xs ml-0.5">({service.totalSubscriptions})</span>
                          )}
                        </TableCell>
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
