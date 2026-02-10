import { useEffect, useState, useMemo, useCallback } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pill,
  UtensilsCrossed,
  Loader2,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Dog,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  X,
  Home,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CareItem {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_photo_url: string | null;
  pet_breed: string | null;
  client_name: string;
  reservation_id: string;
  suite_name: string | null;
  care_type: 'medication' | 'feeding';
  care_name: string;
  care_details: string;
  timing: string | null;
  instructions: string | null;
  amount: string;
  is_prepared: boolean;
  last_administered_at: string | null;
  arrival_status: 'arriving' | 'departing' | 'staying';
}

type SortField = 'pet_name' | 'care_type' | 'timing' | 'care_name' | 'suite_name';
type SortDirection = 'asc' | 'desc' | null;

interface SortLevel {
  field: SortField;
  direction: SortDirection;
}

const StaffPetCare = () => {
  const { isStaffOrAdmin, user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [careItems, setCareItems] = useState<CareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'medication' | 'feeding'>('all');
  
  // Multi-level sorting (up to 3 levels)
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([
    { field: 'pet_name', direction: 'asc' },
  ]);
  
  // Prepared state tracking (local state for quick toggle)
  const [preparedItems, setPreparedItems] = useState<Set<string>>(new Set());
  
  // Admin dialog state
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [selectedCareItem, setSelectedCareItem] = useState<CareItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [adminForm, setAdminForm] = useState({
    amount_given: '',
    amount_taken: '',
    notes: '',
  });

  const fetchCareItems = useCallback(async () => {
    if (!isStaffOrAdmin) {
      setLoading(false);
      return;
    }

    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      // Fetch reservations that are:
      // 1. Currently checked in (status = 'checked_in')
      // 2. Arriving today (start_date = today AND status = 'confirmed')
      // 3. Departing today (end_date = today AND status = 'checked_in')
      // Excluding grooming
      const { data: relevantReservations, error: resError } = await supabase
        .from('reservations')
        .select(`
          id,
          pet_id,
          start_date,
          end_date,
          status,
          service_type,
          suites (
            id,
            name
          ),
          pets (
            id,
            name,
            photo_url,
            breed,
            clients (
              first_name,
              last_name
            )
          )
        `)
        .neq('service_type', 'grooming')
        .or(`status.eq.checked_in,and(status.eq.confirmed,start_date.eq.${todayStr})`);

      if (resError) throw resError;

      if (!relevantReservations || relevantReservations.length === 0) {
        setCareItems([]);
        setLoading(false);
        return;
      }

      // Determine arrival status for each reservation
      const reservationsWithStatus = relevantReservations.map((r: any) => {
        let arrival_status: 'arriving' | 'departing' | 'staying' = 'staying';
        
        if (r.status === 'confirmed' && r.start_date === todayStr) {
          arrival_status = 'arriving';
        } else if (r.status === 'checked_in' && r.end_date === todayStr) {
          arrival_status = 'departing';
        }
        
        return { ...r, arrival_status };
      });

      const petIds = reservationsWithStatus
        .map((r: any) => r.pets?.id)
        .filter(Boolean);

      if (petIds.length === 0) {
        setCareItems([]);
        setLoading(false);
        return;
      }

      // Fetch medications and feeding schedules for relevant pets
      const [medsRes, feedRes, logsRes] = await Promise.all([
        supabase
          .from('pet_medications')
          .select('*')
          .in('pet_id', petIds)
          .eq('is_active', true),
        supabase
          .from('pet_feeding_schedules')
          .select('*')
          .in('pet_id', petIds)
          .eq('is_active', true),
        supabase
          .from('pet_care_logs')
          .select('*')
          .in('pet_id', petIds)
          .gte('administered_at', todayStr)
          .order('administered_at', { ascending: false }),
      ]);

      if (medsRes.error) throw medsRes.error;
      if (feedRes.error) throw feedRes.error;
      if (logsRes.error) throw logsRes.error;

      // Create a map of latest logs per reference_id
      const latestLogs: Record<string, string> = {};
      (logsRes.data || []).forEach((log: any) => {
        if (!latestLogs[log.reference_id]) {
          latestLogs[log.reference_id] = log.administered_at;
        }
      });

      // Build care items list
      const items: CareItem[] = [];

      // Helper to find the best reservation for a pet (prefer arriving, then departing, then staying with suite)
      const findBestReservation = (petId: string) => {
        const petReservations = reservationsWithStatus.filter(
          (r: any) => r.pets?.id === petId
        );
        if (petReservations.length === 0) return null;
        
        // Priority: arriving > departing > staying with suite > any
        const arriving = petReservations.find((r: any) => r.arrival_status === 'arriving');
        if (arriving) return arriving;
        
        const departing = petReservations.find((r: any) => r.arrival_status === 'departing');
        if (departing) return departing;
        
        const withSuite = petReservations.find((r: any) => r.suites?.name);
        if (withSuite) return withSuite;
        
        return petReservations[0];
      };

      // Map medications
      (medsRes.data || []).forEach((med: any) => {
        const reservation = findBestReservation(med.pet_id);
        if (!reservation) return;

        items.push({
          id: med.id,
          pet_id: med.pet_id,
          pet_name: reservation.pets?.name || 'Unknown',
          pet_photo_url: reservation.pets?.photo_url || null,
          pet_breed: reservation.pets?.breed || null,
          client_name: reservation.pets?.clients
            ? `${reservation.pets.clients.first_name} ${reservation.pets.clients.last_name}`
            : 'Unknown',
          reservation_id: reservation.id,
          suite_name: reservation.suites?.name || null,
          care_type: 'medication',
          care_name: med.name,
          care_details: `${med.dosage} • ${med.frequency}`,
          timing: med.timing,
          instructions: med.instructions,
          amount: med.dosage,
          is_prepared: false,
          last_administered_at: latestLogs[med.id] || null,
          arrival_status: reservation.arrival_status,
        });
      });

      // Map feeding schedules
      (feedRes.data || []).forEach((feed: any) => {
        const reservation = findBestReservation(feed.pet_id);
        if (!reservation) return;

        items.push({
          id: feed.id,
          pet_id: feed.pet_id,
          pet_name: reservation.pets?.name || 'Unknown',
          pet_photo_url: reservation.pets?.photo_url || null,
          pet_breed: reservation.pets?.breed || null,
          client_name: reservation.pets?.clients
            ? `${reservation.pets.clients.first_name} ${reservation.pets.clients.last_name}`
            : 'Unknown',
          reservation_id: reservation.id,
          suite_name: reservation.suites?.name || null,
          care_type: 'feeding',
          care_name: feed.food_type,
          care_details: `${feed.amount} • ${feed.frequency}`,
          timing: feed.timing,
          instructions: feed.instructions,
          amount: feed.amount,
          is_prepared: false,
          last_administered_at: latestLogs[feed.id] || null,
          arrival_status: reservation.arrival_status,
        });
      });

      setCareItems(items);
    } catch (error) {
      console.error('Error fetching care items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load care items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [isStaffOrAdmin, toast]);

  useEffect(() => {
    fetchCareItems();

    // Set up realtime subscription for care logs
    const channel = supabase
      .channel('pet-care-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pet_care_logs',
        },
        () => {
          fetchCareItems();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
        },
        () => {
          fetchCareItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCareItems]);

  // Multi-level sorting logic
  // First column clicked = primary sort, second column clicked = secondary sort
  const handleSort = (field: SortField) => {
    setSortLevels((prev) => {
      const existingIndex = prev.findIndex((s) => s.field === field);
      
      if (existingIndex >= 0) {
        // Column is already in sort levels - cycle its direction: asc -> desc -> remove
        const current = prev[existingIndex];
        if (current.direction === 'asc') {
          // Change to desc
          const newLevels = [...prev];
          newLevels[existingIndex] = { field, direction: 'desc' };
          return newLevels;
        } else if (current.direction === 'desc') {
          // Remove this sort level
          if (prev.length > 1) {
            return prev.filter((_, i) => i !== existingIndex);
          }
          // If it's the only one, reset to asc
          return [{ field, direction: 'asc' }];
        }
      } else {
        // New column - add as next level (up to 2 levels)
        if (prev.length < 2) {
          return [...prev, { field, direction: 'asc' }];
        } else {
          // Replace secondary sort
          return [prev[0], { field, direction: 'asc' }];
        }
      }
      
      return prev;
    });
  };

  const getSortPriority = (field: SortField): number | null => {
    const index = sortLevels.findIndex((s) => s.field === field);
    return index >= 0 ? index + 1 : null;
  };

  const getSortDirection = (field: SortField): SortDirection => {
    const level = sortLevels.find((s) => s.field === field);
    return level?.direction || null;
  };

  // Filtered and sorted items
  const displayedItems = useMemo(() => {
    let filtered = careItems;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((item) => item.care_type === filterType);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.pet_name.toLowerCase().includes(query) ||
          item.care_name.toLowerCase().includes(query) ||
          item.client_name.toLowerCase().includes(query) ||
          (item.suite_name && item.suite_name.toLowerCase().includes(query))
      );
    }

    // Multi-level sort
    const sorted = [...filtered].sort((a, b) => {
      for (const level of sortLevels) {
        if (!level.direction) continue;
        
        let aVal = '';
        let bVal = '';

        switch (level.field) {
          case 'pet_name':
            aVal = a.pet_name;
            bVal = b.pet_name;
            break;
          case 'care_type':
            aVal = a.care_type;
            bVal = b.care_type;
            break;
          case 'timing':
            aVal = a.timing || 'zzz';
            bVal = b.timing || 'zzz';
            break;
          case 'care_name':
            aVal = a.care_name;
            bVal = b.care_name;
            break;
          case 'suite_name':
            aVal = a.suite_name || 'zzz';
            bVal = b.suite_name || 'zzz';
            break;
        }

        const comparison = aVal.localeCompare(bVal);
        if (comparison !== 0) {
          return level.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });

    return sorted;
  }, [careItems, filterType, searchQuery, sortLevels]);

  // Toggle prepared state
  const togglePrepared = (itemId: string) => {
    setPreparedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Quick full administration
  const handleQuickAdminister = async (item: CareItem) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('pet_care_logs').insert({
        pet_id: item.pet_id,
        log_type: item.care_type,
        reference_id: item.id,
        administered_by: user.id,
        amount_given: item.amount,
        amount_taken: 'All',
        notes: null,
        reservation_id: item.reservation_id,
      });

      if (error) throw error;

      // Remove from prepared
      setPreparedItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });

      toast({
        title: 'Logged Successfully',
        description: `${item.care_name} fully administered to ${item.pet_name}`,
      });

      fetchCareItems();
    } catch (error) {
      console.error('Error logging administration:', error);
      toast({
        title: 'Error',
        description: 'Failed to log administration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Open partial administration dialog
  const openAdminDialog = (item: CareItem) => {
    setSelectedCareItem(item);
    setAdminForm({
      amount_given: item.amount,
      amount_taken: '',
      notes: '',
    });
    setAdminDialogOpen(true);
  };

  // Submit partial administration
  const handleSubmitAdministration = async () => {
    if (!selectedCareItem || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('pet_care_logs').insert({
        pet_id: selectedCareItem.pet_id,
        log_type: selectedCareItem.care_type,
        reference_id: selectedCareItem.id,
        administered_by: user.id,
        amount_given: adminForm.amount_given.trim() || null,
        amount_taken: adminForm.amount_taken.trim() || null,
        notes: adminForm.notes.trim() || null,
        reservation_id: selectedCareItem.reservation_id,
      });

      if (error) throw error;

      // Remove from prepared
      setPreparedItems((prev) => {
        const next = new Set(prev);
        next.delete(selectedCareItem.id);
        return next;
      });

      toast({
        title: 'Logged Successfully',
        description: `${selectedCareItem.care_name} administration recorded for ${selectedCareItem.pet_name}`,
      });

      setAdminDialogOpen(false);
      fetchCareItems();
    } catch (error) {
      console.error('Error logging administration:', error);
      toast({
        title: 'Error',
        description: 'Failed to log administration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const clearSort = () => {
    setSortLevels([{ field: 'pet_name', direction: 'asc' }]);
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const priority = getSortPriority(field);
    const direction = getSortDirection(field);
    
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => handleSort(field)}
      >
        {children}
        <span className="ml-2 flex items-center gap-0.5">
          {direction === 'asc' && <ArrowUp className="h-4 w-4" />}
          {direction === 'desc' && <ArrowDown className="h-4 w-4" />}
          {!direction && <ArrowUpDown className="h-4 w-4 opacity-50" />}
          {priority && (
            <span className="ml-0.5 text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
              {priority}
            </span>
          )}
        </span>
      </Button>
    );
  };

  const getRowClassName = (item: CareItem, isPrepared: boolean) => {
    if (isPrepared) return 'bg-amber-50 dark:bg-amber-950/20';
    if (item.arrival_status === 'arriving') return 'bg-blue-50 dark:bg-blue-950/30';
    if (item.arrival_status === 'departing') return 'bg-red-50 dark:bg-red-950/30';
    return '';
  };

  return (
    <StaffLayout>
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">Pet Care</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Medications and feedings for today's pets
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCareItems}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-wrap">
              <div className="relative flex-1 w-full sm:min-w-[200px] sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pet, owner, suite, or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Care Items</SelectItem>
                  <SelectItem value="medication">Medications Only</SelectItem>
                  <SelectItem value="feeding">Feedings Only</SelectItem>
                </SelectContent>
              </Select>
              {sortLevels.length > 1 && (
                <Button variant="ghost" size="sm" onClick={clearSort}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Sort
                </Button>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800" />
                  <span>Arriving</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800" />
                  <span>Departing</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        {/* Care Items Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Dog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No care items for today's pets</p>
                <p className="text-sm">
                  Pets arriving, checked in, or departing today with medications or feeding schedules will appear here
                </p>
              </div>
            ) : isMobile ? (
              /* Mobile: card-based list */
              <div className="divide-y">
                {displayedItems.map((item) => {
                  const isPrepared = preparedItems.has(item.id);
                  return (
                    <div
                      key={`${item.care_type}-${item.id}`}
                      className={`p-3 ${getRowClassName(item, isPrepared)}`}
                    >
                      <div className="flex items-start gap-3">
                        <Button
                          size="sm"
                          variant={isPrepared ? 'default' : 'outline'}
                          className={`h-8 w-8 p-0 shrink-0 mt-0.5 ${
                            isPrepared ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border-dashed'
                          }`}
                          onClick={() => togglePrepared(item.id)}
                        >
                          {isPrepared ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </Button>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={item.pet_photo_url || undefined} />
                                <AvatarFallback><Dog className="h-3 w-3" /></AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm truncate">{item.pet_name}</span>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`shrink-0 text-[10px] ${
                                item.care_type === 'medication'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              }`}
                            >
                              {item.care_type === 'medication' ? <Pill className="h-3 w-3 mr-0.5" /> : <UtensilsCrossed className="h-3 w-3 mr-0.5" />}
                              {item.care_type === 'medication' ? 'Med' : 'Feed'}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{item.care_name}</p>
                          <p className="text-xs text-muted-foreground">{item.care_details}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.suite_name && (
                              <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                                <Home className="h-2.5 w-2.5" />{item.suite_name}
                              </Badge>
                            )}
                            {item.timing && (
                              <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                                <Clock className="h-2.5 w-2.5" />{item.timing}
                              </Badge>
                            )}
                            {item.last_administered_at && (
                              <span className="text-[10px] text-muted-foreground">
                                Last: {format(new Date(item.last_administered_at), 'h:mm a')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAdminDialog(item)}>
                              Partial
                            </Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleQuickAdminister(item)} disabled={saving}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />Full
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px]">Prepared</TableHead>
                      <TableHead><SortButton field="pet_name">Pet</SortButton></TableHead>
                      <TableHead><SortButton field="suite_name">Suite</SortButton></TableHead>
                      <TableHead><SortButton field="care_type">Type</SortButton></TableHead>
                      <TableHead><SortButton field="care_name">Item</SortButton></TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead><SortButton field="timing">Timing</SortButton></TableHead>
                      <TableHead>Last Given</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedItems.map((item) => {
                      const isPrepared = preparedItems.has(item.id);
                      return (
                        <TableRow key={`${item.care_type}-${item.id}`} className={getRowClassName(item, isPrepared)}>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={isPrepared ? 'default' : 'outline'}
                              className={`h-8 w-8 p-0 ${isPrepared ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border-dashed'}`}
                              onClick={() => togglePrepared(item.id)}
                            >
                              {isPrepared ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={item.pet_photo_url || undefined} />
                                <AvatarFallback><Dog className="h-4 w-4" /></AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{item.pet_name}</p>
                                <p className="text-xs text-muted-foreground">{item.client_name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.suite_name ? (
                              <Badge variant="outline" className="gap-1"><Home className="h-3 w-3" />{item.suite_name}</Badge>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={item.care_type === 'medication' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'}>
                              {item.care_type === 'medication' ? <Pill className="h-3 w-3 mr-1" /> : <UtensilsCrossed className="h-3 w-3 mr-1" />}
                              {item.care_type === 'medication' ? 'Medication' : 'Feeding'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{item.care_name}</p>
                            {item.instructions && <p className="text-xs text-muted-foreground italic truncate max-w-[200px]">{item.instructions}</p>}
                          </TableCell>
                          <TableCell><p className="text-sm text-muted-foreground">{item.care_details}</p></TableCell>
                          <TableCell>
                            {item.timing ? (
                              <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />{item.timing}</Badge>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                          </TableCell>
                          <TableCell>
                            {item.last_administered_at ? (
                              <span className="text-sm text-muted-foreground">{format(new Date(item.last_administered_at), 'h:mm a')}</span>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openAdminDialog(item)}>Partial</Button>
                              <Button size="sm" onClick={() => handleQuickAdminister(item)} disabled={saving}>
                                <CheckCircle2 className="h-4 w-4 mr-1" />Full
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Partial Administration Dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCareItem?.care_type === 'medication' ? (
                <Pill className="h-5 w-5" />
              ) : (
                <UtensilsCrossed className="h-5 w-5" />
              )}
              Log {selectedCareItem?.care_type === 'medication' ? 'Medication' : 'Feeding'}
            </DialogTitle>
            <DialogDescription>
              {selectedCareItem?.pet_name} — {selectedCareItem?.care_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount-given">Amount Given</Label>
              <Input
                id="amount-given"
                value={adminForm.amount_given}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, amount_given: e.target.value })
                }
                placeholder="e.g., 1 tablet, 1 cup"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount-taken">Amount Taken / Consumed</Label>
              <Input
                id="amount-taken"
                value={adminForm.amount_taken}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, amount_taken: e.target.value })
                }
                placeholder="e.g., All, Half, None"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="log-notes">Notes</Label>
              <Textarea
                id="log-notes"
                value={adminForm.notes}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, notes: e.target.value })
                }
                placeholder="Any observations or issues..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAdministration} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Administration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
};

export default StaffPetCare;
