import { useEffect, useState, useMemo, useCallback } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CareItem {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_photo_url: string | null;
  pet_breed: string | null;
  client_name: string;
  reservation_id: string;
  care_type: 'medication' | 'feeding';
  care_name: string;
  care_details: string;
  timing: string | null;
  instructions: string | null;
  amount: string;
  is_prepared: boolean;
  last_administered_at: string | null;
}

type SortField = 'pet_name' | 'care_type' | 'timing' | 'care_name';
type SortDirection = 'asc' | 'desc';

const StaffPetCare = () => {
  const { isStaffOrAdmin, user } = useAuth();
  const { toast } = useToast();
  const [careItems, setCareItems] = useState<CareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('pet_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<'all' | 'medication' | 'feeding'>('all');
  
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
      // Fetch all currently checked-in reservations (excluding grooming)
      const { data: checkedInReservations, error: resError } = await supabase
        .from('reservations')
        .select(`
          id,
          pet_id,
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
        .eq('status', 'checked_in')
        .neq('service_type', 'grooming');

      if (resError) throw resError;

      if (!checkedInReservations || checkedInReservations.length === 0) {
        setCareItems([]);
        setLoading(false);
        return;
      }

      const petIds = checkedInReservations
        .map((r: any) => r.pets?.id)
        .filter(Boolean);

      if (petIds.length === 0) {
        setCareItems([]);
        setLoading(false);
        return;
      }

      // Fetch medications and feeding schedules for checked-in pets
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
          .gte('administered_at', format(new Date(), 'yyyy-MM-dd'))
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

      // Map medications
      (medsRes.data || []).forEach((med: any) => {
        const reservation = checkedInReservations.find(
          (r: any) => r.pets?.id === med.pet_id
        );
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
          care_type: 'medication',
          care_name: med.name,
          care_details: `${med.dosage} • ${med.frequency}`,
          timing: med.timing,
          instructions: med.instructions,
          amount: med.dosage,
          is_prepared: false,
          last_administered_at: latestLogs[med.id] || null,
        });
      });

      // Map feeding schedules
      (feedRes.data || []).forEach((feed: any) => {
        const reservation = checkedInReservations.find(
          (r: any) => r.pets?.id === feed.pet_id
        );
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
          care_type: 'feeding',
          care_name: feed.food_type,
          care_details: `${feed.amount} • ${feed.frequency}`,
          timing: feed.timing,
          instructions: feed.instructions,
          amount: feed.amount,
          is_prepared: false,
          last_administered_at: latestLogs[feed.id] || null,
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

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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
          item.client_name.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal = '';
      let bVal = '';

      switch (sortField) {
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
      }

      if (sortDirection === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });

    return sorted;
  }, [careItems, filterType, searchQuery, sortField, sortDirection]);

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

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <StaffLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pet Care</h1>
            <p className="text-muted-foreground">
              Manage medications and feedings for checked-in pets
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCareItems}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pet, owner, or item..."
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
              <div className="text-sm text-muted-foreground">
                {displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''}
              </div>
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
                <p>No care items for checked-in pets</p>
                <p className="text-sm">
                  Check in pets with medications or feeding schedules to see them here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px]">Prepared</TableHead>
                      <TableHead>
                        <SortButton field="pet_name">Pet</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="care_type">Type</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="care_name">Item</SortButton>
                      </TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>
                        <SortButton field="timing">Timing</SortButton>
                      </TableHead>
                      <TableHead>Last Given</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedItems.map((item) => {
                      const isPrepared = preparedItems.has(item.id);

                      return (
                        <TableRow
                          key={`${item.care_type}-${item.id}`}
                          className={isPrepared ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
                        >
                          {/* Prepared Toggle */}
                          <TableCell>
                            <Button
                              size="sm"
                              variant={isPrepared ? 'default' : 'outline'}
                              className={`h-8 w-8 p-0 ${
                                isPrepared
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : 'border-dashed'
                              }`}
                              onClick={() => togglePrepared(item.id)}
                            >
                              {isPrepared ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Clock className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>

                          {/* Pet */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={item.pet_photo_url || undefined} />
                                <AvatarFallback>
                                  <Dog className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{item.pet_name}</p>
                                <p className="text-xs text-muted-foreground">{item.client_name}</p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Type */}
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                item.care_type === 'medication'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              }
                            >
                              {item.care_type === 'medication' ? (
                                <Pill className="h-3 w-3 mr-1" />
                              ) : (
                                <UtensilsCrossed className="h-3 w-3 mr-1" />
                              )}
                              {item.care_type === 'medication' ? 'Medication' : 'Feeding'}
                            </Badge>
                          </TableCell>

                          {/* Item Name */}
                          <TableCell>
                            <p className="font-medium text-sm">{item.care_name}</p>
                            {item.instructions && (
                              <p className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                                {item.instructions}
                              </p>
                            )}
                          </TableCell>

                          {/* Details */}
                          <TableCell>
                            <p className="text-sm text-muted-foreground">{item.care_details}</p>
                          </TableCell>

                          {/* Timing */}
                          <TableCell>
                            {item.timing ? (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {item.timing}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>

                          {/* Last Administered */}
                          <TableCell>
                            {item.last_administered_at ? (
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(item.last_administered_at), 'h:mm a')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAdminDialog(item)}
                              >
                                Partial
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleQuickAdminister(item)}
                                disabled={saving}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Full
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
