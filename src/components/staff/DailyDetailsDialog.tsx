import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Dog, DollarSign, Repeat, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ResizableColumn, useColumnWidths } from '@/components/ui/resizable-column';
import { PetTraitBadges, type PetTrait } from './PetTraitBadges';
import { usePetPhotoUrl } from '@/hooks/usePetPhotoUrl';

interface DailyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
}

interface ReservationWithDetails {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_breed: string | null;
  pet_photo_url: string | null;
  pet_traits: PetTrait[];
  client_id: string;
  client_name: string;
  service_type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  lodging: string | null;
  payment_pending: boolean;
  notes: string | null;
  subscription_id: string | null;
}

const COLUMN_CONFIG = [
  { key: 'status', defaultWidth: 100 },
  { key: 'animal', defaultWidth: 200 },
  { key: 'owner', defaultWidth: 160 },
  { key: 'type', defaultWidth: 140 },
  { key: 'lodging', defaultWidth: 120 },
  { key: 'start', defaultWidth: 140 },
  { key: 'end', defaultWidth: 140 },
];

type SortField = 'pet_name' | 'client_name' | 'service_type' | 'lodging' | 'status' | 'start_date' | 'end_date';
type SortDirection = 'asc' | 'desc' | null;

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  checked_in: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  checked_out: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const serviceTypeColors: Record<string, string> = {
  daycare: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  boarding: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  grooming: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  training: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

function PetAvatarWithPhoto({ photoUrl, petId, petName }: { photoUrl: string | null; petId: string; petName: string }) {
  const { signedUrl } = usePetPhotoUrl(photoUrl, petId);
  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src={signedUrl || undefined} alt={petName} />
      <AvatarFallback className="bg-primary/10 text-primary text-xs">
        {petName.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export function DailyDetailsDialog({ open, onOpenChange, selectedDate }: DailyDetailsDialogProps) {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { widths, setWidth } = useColumnWidths({
    columns: COLUMN_CONFIG,
    storageKey: 'daily-details-column-widths',
  });

  useEffect(() => {
    if (!open) return;

    const fetchReservations = async () => {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      try {
        // Fetch reservations starting on this date
        const { data: arrivingData } = await supabase
          .from('reservations')
          .select(`
            id,
            pet_id,
            service_type,
            status,
            start_date,
            end_date,
            start_time,
            end_time,
            notes,
            payment_pending,
            subscription_id,
            suite_id,
            pets!inner (
              id,
              name,
              breed,
              photo_url,
              client_id,
              clients!inner (
                id,
                first_name,
                last_name
              )
            ),
            suites (
              name
            )
          `)
          .eq('start_date', dateStr)
          .neq('status', 'cancelled');

        // Fetch overnight reservations (boarding that spans this date)
        const { data: overnightData } = await supabase
          .from('reservations')
          .select(`
            id,
            pet_id,
            service_type,
            status,
            start_date,
            end_date,
            start_time,
            end_time,
            notes,
            payment_pending,
            subscription_id,
            suite_id,
            pets!inner (
              id,
              name,
              breed,
              photo_url,
              client_id,
              clients!inner (
                id,
                first_name,
                last_name
              )
            ),
            suites (
              name
            )
          `)
          .eq('service_type', 'boarding')
          .lt('start_date', dateStr)
          .gte('end_date', dateStr)
          .neq('status', 'cancelled');

        // Combine and dedupe
        const allData = [...(arrivingData || []), ...(overnightData || [])];
        const uniqueMap = new Map();
        allData.forEach((r: any) => uniqueMap.set(r.id, r));
        const uniqueReservations = Array.from(uniqueMap.values());

        // Fetch pet traits for all pets
        const petIds = [...new Set(uniqueReservations.map((r: any) => r.pet_id))];
        const { data: traitsData } = await supabase
          .from('pet_traits')
          .select('pet_id, id, title, icon_name, color_key, is_alert')
          .in('pet_id', petIds);

        const traitsByPet: Record<string, PetTrait[]> = {};
        traitsData?.forEach((trait: any) => {
          if (!traitsByPet[trait.pet_id]) {
            traitsByPet[trait.pet_id] = [];
          }
          traitsByPet[trait.pet_id].push({
            id: trait.id,
            title: trait.title,
            icon_name: trait.icon_name,
            color_key: trait.color_key,
            is_alert: trait.is_alert,
          });
        });

        const formatted: ReservationWithDetails[] = uniqueReservations.map((r: any) => ({
          id: r.id,
          pet_id: r.pet_id,
          pet_name: r.pets.name,
          pet_breed: r.pets.breed,
          pet_photo_url: r.pets.photo_url,
          pet_traits: traitsByPet[r.pet_id] || [],
          client_id: r.pets.clients.id,
          client_name: `${r.pets.clients.first_name} ${r.pets.clients.last_name}`,
          service_type: r.service_type,
          status: r.status,
          start_date: r.start_date,
          end_date: r.end_date,
          start_time: r.start_time,
          end_time: r.end_time,
          lodging: r.suites?.name || null,
          payment_pending: r.payment_pending,
          notes: r.notes,
          subscription_id: r.subscription_id,
        }));

        setReservations(formatted);
      } catch (error) {
        console.error('Error fetching daily details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [open, selectedDate]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3 w-3 ml-1" />;
    }
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredReservations = useMemo(() => {
    let filtered = reservations.filter((r) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        r.pet_name.toLowerCase().includes(query) ||
        r.client_name.toLowerCase().includes(query)
      );
    });

    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: string | null = null;
        let bVal: string | null = null;

        switch (sortField) {
          case 'pet_name':
            aVal = a.pet_name.toLowerCase();
            bVal = b.pet_name.toLowerCase();
            break;
          case 'client_name':
            aVal = a.client_name.toLowerCase();
            bVal = b.client_name.toLowerCase();
            break;
          case 'service_type':
            aVal = a.service_type;
            bVal = b.service_type;
            break;
          case 'lodging':
            aVal = a.lodging || '';
            bVal = b.lodging || '';
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'start_date':
            aVal = a.start_date + (a.start_time || '');
            bVal = b.start_date + (b.start_time || '');
            break;
          case 'end_date':
            aVal = (a.end_date || a.start_date) + (a.end_time || '');
            bVal = (b.end_date || b.start_date) + (b.end_time || '');
            break;
        }

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [reservations, searchQuery, sortField, sortDirection]);

  const formatDateTime = (date: string, time: string | null) => {
    const d = parseLocalDate(date);
    const dateStr = format(d, 'EEE, MM/dd');
    const timeStr = time ? time.slice(0, 5) : '';
    return timeStr ? `${dateStr}, ${timeStr}` : dateStr;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      checked_in: 'Checked In',
      checked_out: 'Checked Out',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  const getServiceTypeLabel = (serviceType: string, notes: string | null): string => {
    if (serviceType === 'daycare') {
      const isHalfDay = notes?.toLowerCase().includes('half day');
      return isHalfDay ? 'Daycare | Half Day' : 'Daycare | Full Day';
    }
    const labels: Record<string, string> = {
      boarding: 'Boarding',
      grooming: 'Grooming',
      training: 'Training',
    };
    return labels[serviceType] || serviceType;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            All Reservations for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{filteredReservations.length}</span>
              <span>reservations</span>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pet or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Dog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reservations found</p>
              </div>
            ) : (
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead style={{ width: widths.status }}>
                      <ResizableColumn
                        width={widths.status}
                        onResize={(w) => setWidth('status', w)}
                        isHeader
                        minWidth={80}
                        maxWidth={150}
                      >
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Status
                          {getSortIcon('status')}
                        </button>
                      </ResizableColumn>
                    </TableHead>
                    <TableHead style={{ width: widths.animal }}>
                      <ResizableColumn
                        width={widths.animal}
                        onResize={(w) => setWidth('animal', w)}
                        isHeader
                        minWidth={120}
                        maxWidth={300}
                      >
                        <button
                          onClick={() => handleSort('pet_name')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Animal
                          {getSortIcon('pet_name')}
                        </button>
                      </ResizableColumn>
                    </TableHead>
                    <TableHead style={{ width: widths.owner }}>
                      <ResizableColumn
                        width={widths.owner}
                        onResize={(w) => setWidth('owner', w)}
                        isHeader
                        minWidth={100}
                        maxWidth={250}
                      >
                        <button
                          onClick={() => handleSort('client_name')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Owner
                          {getSortIcon('client_name')}
                        </button>
                      </ResizableColumn>
                    </TableHead>
                    <TableHead style={{ width: widths.type }}>
                      <ResizableColumn
                        width={widths.type}
                        onResize={(w) => setWidth('type', w)}
                        isHeader
                        minWidth={100}
                        maxWidth={200}
                      >
                        <button
                          onClick={() => handleSort('service_type')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Type
                          {getSortIcon('service_type')}
                        </button>
                      </ResizableColumn>
                    </TableHead>
                    <TableHead style={{ width: widths.lodging }}>
                      <ResizableColumn
                        width={widths.lodging}
                        onResize={(w) => setWidth('lodging', w)}
                        isHeader
                        minWidth={80}
                        maxWidth={180}
                      >
                        <button
                          onClick={() => handleSort('lodging')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Lodging
                          {getSortIcon('lodging')}
                        </button>
                      </ResizableColumn>
                    </TableHead>
                    <TableHead style={{ width: widths.start }}>
                      <ResizableColumn
                        width={widths.start}
                        onResize={(w) => setWidth('start', w)}
                        isHeader
                        minWidth={100}
                        maxWidth={200}
                      >
                        <button
                          onClick={() => handleSort('start_date')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Start
                          {getSortIcon('start_date')}
                        </button>
                      </ResizableColumn>
                    </TableHead>
                    <TableHead style={{ width: widths.end }}>
                      <ResizableColumn
                        width={widths.end}
                        onResize={(w) => setWidth('end', w)}
                        isHeader
                        minWidth={100}
                        maxWidth={200}
                      >
                        <button
                          onClick={() => handleSort('end_date')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          End
                          {getSortIcon('end_date')}
                        </button>
                      </ResizableColumn>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((reservation) => (
                    <TableRow key={reservation.id} className="hover:bg-muted/30">
                      <TableCell style={{ width: widths.status }}>
                        <Badge className={statusColors[reservation.status] || ''}>
                          {getStatusLabel(reservation.status)}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ width: widths.animal }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <PetAvatarWithPhoto
                            photoUrl={reservation.pet_photo_url}
                            petId={reservation.pet_id}
                            petName={reservation.pet_name}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <Link
                                to={`/staff/pets?petId=${reservation.pet_id}`}
                                className="font-medium truncate hover:underline text-foreground"
                              >
                                {reservation.pet_name}
                              </Link>
                              {reservation.payment_pending && (
                                <DollarSign className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                              )}
                              {reservation.subscription_id && (
                                <Repeat className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                            {reservation.pet_breed && (
                              <p className="text-xs text-muted-foreground truncate">
                                {reservation.pet_breed}
                              </p>
                            )}
                            {reservation.pet_traits.length > 0 && (
                              <div className="mt-1">
                                <PetTraitBadges traits={reservation.pet_traits} maxDisplay={2} />
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={{ width: widths.owner }}>
                        <Link
                          to={`/staff/clients?clientId=${reservation.client_id}`}
                          className="hover:underline text-foreground"
                        >
                          {reservation.client_name}
                        </Link>
                      </TableCell>
                      <TableCell style={{ width: widths.type }}>
                        <Badge className={serviceTypeColors[reservation.service_type] || ''}>
                          {getServiceTypeLabel(reservation.service_type, reservation.notes)}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ width: widths.lodging }}>
                        {reservation.lodging ? (
                          <Badge variant="outline">{reservation.lodging}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell style={{ width: widths.start }} className="text-sm">
                        {formatDateTime(reservation.start_date, reservation.start_time)}
                      </TableCell>
                      <TableCell style={{ width: widths.end }} className="text-sm">
                        {reservation.end_date
                          ? formatDateTime(reservation.end_date, reservation.end_time)
                          : formatDateTime(reservation.start_date, reservation.end_time)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
