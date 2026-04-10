import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Check, 
  X, 
  MoreHorizontal, 
  Search, 
  Plus,
  Undo2,
  CheckCircle,
  XCircle,
  Loader2,
  Dog,
  Tags,
  DollarSign,
  Scissors,
  Clock,
  Repeat,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ResizableColumn, useColumnWidths } from '@/components/ui/resizable-column';

// Parse date string as local date (not UTC) to avoid timezone shifting
const parseLocalDate = (dateStr: string): Date => {
  // For date-only strings like "2025-02-01", parse as local midnight
  // This prevents the date from shifting when displayed in local timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};
import { PetTraitBadges, type PetTrait } from './PetTraitBadges';
import { ManagePetTraitsDialog } from './ManagePetTraitsDialog';
import { CancelReservationDialog } from './CancelReservationDialog';
import { DeclineReservationDialog } from './DeclineReservationDialog';
import { ReservationDetailsDialog } from './ReservationDetailsDialog';
import { supabase } from '@/integrations/supabase/client';
import { usePetInactivityDays } from '@/hooks/useSystemSettings';

export interface LinkedService {
  id: string;
  service_type: string;
  status: string;
  start_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  price: number | null;
  groomer_name: string | null;
}

export interface ControlCenterReservation {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_breed: string | null;
  pet_photo_url: string | null;
  pet_traits?: PetTrait[];
  client_id: string;
  client_name: string;
  service_type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  lodging: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  daycare_credits: number;
  half_daycare_credits: number;
  boarding_credits: number;
  payment_pending: boolean;
  notes: string | null;
  linked_services?: LinkedService[];
  subscription_id?: string | null;
}

type TabValue = 'expected' | 'going_home' | 'checked_in' | 'requested';

interface ControlCenterTableProps {
  reservations: ControlCenterReservation[];
  loading: boolean;
  onCheckIn: (reservation: ControlCenterReservation) => void;
  onCheckOut: (reservation: ControlCenterReservation) => void;
  onUndoCheckIn: (reservation: ControlCenterReservation) => void;
  onAcceptReservation: (reservation: ControlCenterReservation) => void;
  onCancelReservation: (reservation: ControlCenterReservation, useCredit: boolean, reason: string) => void;
  onDeclineReservation: (reservation: ControlCenterReservation, reason: string) => void;
  onAddService: (reservation: ControlCenterReservation) => void;
  onTraitsUpdated?: () => void;
}

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

const serviceTypeColors: Record<string, string> = {
  daycare: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  boarding: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  grooming: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  training: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

// Column configuration for resizable widths
const COLUMN_CONFIG = [
  { key: 'actions', defaultWidth: 140 },
  { key: 'animal', defaultWidth: 200 },
  { key: 'owner', defaultWidth: 160 },
  { key: 'type', defaultWidth: 140 },
  { key: 'lodging', defaultWidth: 120 },
  { key: 'services', defaultWidth: 150 },
  { key: 'start', defaultWidth: 140 },
  { key: 'end', defaultWidth: 140 },
];

type SortField = 'pet_name' | 'client_name' | 'service_type' | 'lodging' | 'start_date' | 'end_date';
type SortDirection = 'asc' | 'desc' | null;

export function ControlCenterTable({
  reservations,
  loading,
  onCheckIn,
  onCheckOut,
  onUndoCheckIn,
  onAcceptReservation,
  onCancelReservation,
  onDeclineReservation,
  onAddService,
  onTraitsUpdated,
}: ControlCenterTableProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('expected');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ControlCenterReservation | null>(null);
  const [traitsDialogOpen, setTraitsDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsReservation, setDetailsReservation] = useState<ControlCenterReservation | null>(null);
  const [detailsInitialEdit, setDetailsInitialEdit] = useState(false);
  const [selectedPetForTraits, setSelectedPetForTraits] = useState<{ id: string; name: string } | null>(null);
  const [petLastActivity, setPetLastActivity] = useState<Record<string, number | null>>({});
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  const { inactivityDays } = usePetInactivityDays();
  const { widths, setWidth } = useColumnWidths({ 
    columns: COLUMN_CONFIG, 
    storageKey: 'control-center-column-widths' 
  });

  // Fetch last activity for pets in requested tab
  useEffect(() => {
    const requestedPets = reservations
      .filter(r => r.status === 'pending')
      .map(r => r.pet_id);
    
    if (requestedPets.length === 0) return;

    const fetchLastActivity = async () => {
      const activityMap: Record<string, number | null> = {};
      
      for (const petId of requestedPets) {
        // Get last completed reservation (not the current pending one)
        const { data } = await supabase
          .from('reservations')
          .select('start_date')
          .eq('pet_id', petId)
          .in('status', ['checked_out', 'confirmed', 'checked_in'])
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data) {
          const lastDate = new Date(data.start_date);
          const today = new Date();
          const diffTime = today.getTime() - lastDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          activityMap[petId] = diffDays;
        } else {
          activityMap[petId] = null; // New pet, no history
        }
      }
      
      setPetLastActivity(activityMap);
    };

    fetchLastActivity();
  }, [reservations]);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle: asc -> desc -> null
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

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3 w-3 ml-1" />;
    }
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Filter by tab
  const getFilteredByTab = () => {
    switch (activeTab) {
      case 'expected':
        return reservations.filter(r => r.status === 'confirmed');
      case 'going_home':
        return reservations.filter(r => r.status === 'checked_in');
      case 'checked_in':
        return reservations.filter(r => r.status === 'checked_in');
      case 'requested':
        return reservations.filter(r => r.status === 'pending');
      default:
        return reservations;
    }
  };

  // Filter by search and sort
  const filteredReservations = useMemo(() => {
    let filtered = getFilteredByTab().filter(r => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        r.pet_name.toLowerCase().includes(query) ||
        r.client_name.toLowerCase().includes(query)
      );
    });

    // Apply sorting
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
  }, [reservations, activeTab, searchQuery, sortField, sortDirection]);

  // Tab counts
  const expectedCount = reservations.filter(r => r.status === 'confirmed').length;
  const goingHomeCount = reservations.filter(r => r.status === 'checked_in').length;
  const checkedInCount = reservations.filter(r => r.status === 'checked_in').length;
  const requestedCount = reservations.filter(r => r.status === 'pending').length;

  // Parse drop-off and pick-up times from notes (e.g., "Full Day | Drop-off: 7:00 AM, Pick-up: 5:00 PM")
  const parseTimesFromNotes = (notes: string | null): { dropOff: string | null; pickUp: string | null } => {
    if (!notes) return { dropOff: null, pickUp: null };
    
    const dropOffMatch = notes.match(/Drop-off:\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    const pickUpMatch = notes.match(/Pick-up:\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    
    return {
      dropOff: dropOffMatch ? dropOffMatch[1].trim() : null,
      pickUp: pickUpMatch ? pickUpMatch[1].trim() : null,
    };
  };

  const formatDateTime = (date: string, time: string | null) => {
    const d = parseLocalDate(date);
    const dateStr = format(d, 'EEE, MM/dd');
    const timeStr = time ? time.slice(0, 5) : '';
    return timeStr ? `${dateStr}, ${timeStr}` : dateStr;
  };

  const formatDateTimeWithNotes = (date: string, time: string | null, noteTime: string | null) => {
    const d = parseLocalDate(date);
    const dateStr = format(d, 'EEE, MM/dd');
    // Use database time if available, otherwise use parsed note time
    if (time) {
      return `${dateStr}, ${time.slice(0, 5)}`;
    }
    if (noteTime) {
      return `${dateStr}, ${noteTime}`;
    }
    return dateStr;
  };

  const handleCancelClick = (reservation: ControlCenterReservation) => {
    setSelectedReservation(reservation);
    setCancelDialogOpen(true);
  };

  const handleDeclineClick = (reservation: ControlCenterReservation) => {
    setSelectedReservation(reservation);
    setDeclineDialogOpen(true);
  };

  const handleCancelConfirm = (useCredit: boolean, reason: string) => {
    if (selectedReservation) {
      onCancelReservation(selectedReservation, useCredit, reason);
    }
    setCancelDialogOpen(false);
    setSelectedReservation(null);
  };

  const handleDeclineConfirm = (reason: string) => {
    if (selectedReservation) {
      onDeclineReservation(selectedReservation, reason);
    }
    setDeclineDialogOpen(false);
    setSelectedReservation(null);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="w-full grid grid-cols-4 h-auto p-0 bg-transparent gap-0">
          <TabsTrigger 
            value="expected" 
            className="rounded-none border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-green-500 data-[state=active]:text-white bg-green-600 text-white hover:bg-green-600/90 py-3"
          >
            Expected Today ({expectedCount})
          </TabsTrigger>
          <TabsTrigger 
            value="going_home"
            className="rounded-none border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:bg-cyan-500 data-[state=active]:text-white bg-cyan-600 text-white hover:bg-cyan-600/90 py-3"
          >
            Going Home Today ({goingHomeCount})
          </TabsTrigger>
          <TabsTrigger 
            value="checked_in"
            className="rounded-none border-b-2 data-[state=active]:border-slate-500 data-[state=active]:bg-slate-500 data-[state=active]:text-white bg-slate-600 text-white hover:bg-slate-600/90 py-3"
          >
            Checked-In ({checkedInCount})
          </TabsTrigger>
          <TabsTrigger 
            value="requested"
            className="rounded-none border-b-2 data-[state=active]:border-rose-500 data-[state=active]:bg-rose-500 data-[state=active]:text-white bg-rose-600 text-white hover:bg-rose-600/90 py-3"
          >
            Requested ({requestedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">{filteredReservations.length}</span>
          <span>Search Expected Reservations</span>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
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
        <div className="border rounded-lg overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead style={{ width: widths.actions }}>
                  <ResizableColumn
                    width={widths.actions}
                    onResize={(w) => setWidth('actions', w)}
                    isHeader
                    minWidth={100}
                    maxWidth={200}
                  >
                    Actions
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
                <TableHead style={{ width: widths.services }}>
                  <ResizableColumn
                    width={widths.services}
                    onResize={(w) => setWidth('services', w)}
                    isHeader
                    minWidth={100}
                    maxWidth={250}
                  >
                    Services
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
                  {/* Actions Column */}
                  <TableCell style={{ width: widths.actions }} className="overflow-hidden">
                    <div className="flex items-center gap-1">
                      {reservation.status === 'pending' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                          onClick={() => onAcceptReservation(reservation)}
                          title="Accept Reservation"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {reservation.status === 'confirmed' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={() => onCheckIn(reservation)}
                          title="Check In"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {reservation.status === 'checked_in' && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                            onClick={() => onCheckOut(reservation)}
                            title="Check Out"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                            onClick={() => onUndoCheckIn(reservation)}
                            title="Undo Check-In"
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {/* Show Decline for pending, Cancel for others */}
                      {reservation.status === 'pending' ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeclineClick(reservation)}
                          title="Decline Reservation"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleCancelClick(reservation)}
                          title="Cancel Reservation"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => {
                            setDetailsReservation(reservation);
                            setDetailsDialogOpen(true);
                          }}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setDetailsReservation(reservation);
                            setDetailsDialogOpen(true);
                            // Will start in edit mode via a timeout to let dialog mount
                            setTimeout(() => {
                              const editBtn = document.querySelector('[data-edit-trigger]') as HTMLButtonElement;
                              editBtn?.click();
                            }, 100);
                          }}>Edit Reservation</DropdownMenuItem>
                          <DropdownMenuItem>View Pet Profile</DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedPetForTraits({ id: reservation.pet_id, name: reservation.pet_name });
                              setTraitsDialogOpen(true);
                            }}
                          >
                            <Tags className="h-4 w-4 mr-2" />
                            Manage Traits
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>

                  {/* Animal Column */}
                  <TableCell style={{ width: widths.animal }} className="overflow-hidden">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={reservation.pet_photo_url || undefined} alt={reservation.pet_name} />
                        <AvatarFallback className="bg-muted">
                          <Dog className="h-5 w-5 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{reservation.pet_name}</span>
                          {reservation.pet_breed && (
                            <span className="text-muted-foreground text-sm">
                              ({reservation.pet_breed})
                            </span>
                          )}
                          {/* Payment Pending Badge */}
                          {reservation.payment_pending && (
                            <Badge 
                              variant="outline" 
                              className="ml-1 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700 text-xs px-1.5 py-0"
                            >
                              <DollarSign className="h-3 w-3 mr-0.5" />
                              Pay
                            </Badge>
                          )}
                        </div>
                        {/* Show days since last reservation for Requested tab */}
                        {activeTab === 'requested' && reservation.status === 'pending' && (
                          <div className="text-xs mt-0.5">
                            {petLastActivity[reservation.pet_id] !== undefined ? (
                              petLastActivity[reservation.pet_id] === null ? (
                                <span className="text-muted-foreground italic">New pet - no history</span>
                              ) : (
                                <span className={petLastActivity[reservation.pet_id]! >= inactivityDays ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                                  {petLastActivity[reservation.pet_id]} days since last visit
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground">Loading...</span>
                            )}
                          </div>
                        )}
                        {/* Pet Trait Icons */}
                        <PetTraitBadges traits={reservation.pet_traits || []} maxDisplay={6} />
                      </div>
                    </div>
                  </TableCell>

                  {/* Owner Column */}
                  <TableCell style={{ width: widths.owner }} className="overflow-hidden">
                    <div>
                      <span>{reservation.client_name}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className={reservation.daycare_credits <= 0 ? 'text-destructive font-medium' : ''}>
                          FD: {reservation.daycare_credits}
                        </span>
                        {' | '}
                        <span className={reservation.half_daycare_credits <= 0 ? 'text-destructive font-medium' : ''}>
                          HD: {reservation.half_daycare_credits}
                        </span>
                        {' | '}
                        <span className={reservation.boarding_credits <= 0 ? 'text-destructive font-medium' : ''}>
                          BD: {reservation.boarding_credits}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Type Column */}
                  <TableCell style={{ width: widths.type }} className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <Badge 
                        variant="secondary"
                        className={serviceTypeColors[reservation.service_type] || ''}
                      >
                        {getServiceTypeLabel(reservation.service_type, reservation.notes)}
                      </Badge>
                      {reservation.subscription_id && (
                        <span title="Recurring subscription">
                          <Repeat className="h-4 w-4 text-primary" />
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Lodging Column */}
                  <TableCell style={{ width: widths.lodging }} className="overflow-hidden">
                    {reservation.service_type === 'boarding' ? (
                      reservation.lodging ? (
                        <span className="text-sm">{reservation.lodging}</span>
                      ) : (
                        <Link 
                          to={`/staff/lodging?reservationId=${reservation.id}&startDate=${reservation.start_date}${reservation.end_date ? `&endDate=${reservation.end_date}` : ''}`}
                          className="text-sm text-amber-600 hover:text-amber-700 hover:underline font-medium"
                        >
                          Assign Suite
                        </Link>
                      )
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Services Column */}
                  <TableCell style={{ width: widths.services }} className="align-top py-2 overflow-hidden">
                    <div className="flex flex-col gap-1.5">
                      {/* Display linked services stacked vertically */}
                      {reservation.linked_services && reservation.linked_services.length > 0 && (
                        reservation.linked_services.map((service) => {
                          // Parse service name from notes (e.g., "Service: Full Groom | Groom Type: Large Dog")
                          const serviceMatch = service.notes?.match(/Groom Type:\s*([^|]+)/i);
                          const serviceName = serviceMatch ? serviceMatch[1].trim() : 'Grooming';
                          
                          return (
                            <Badge 
                              key={service.id}
                              variant="secondary"
                              className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200 text-xs flex items-center gap-1 w-fit"
                              title={`${serviceName} - ${service.start_time ? service.start_time.slice(0, 5) : 'TBD'}${service.groomer_name ? ` with ${service.groomer_name}` : ''}`}
                            >
                              <Scissors className="h-3 w-3" />
                              {serviceName}
                              {service.start_time && (
                                <span className="text-pink-600 dark:text-pink-300">
                                  @ {service.start_time.slice(0, 5)}
                                </span>
                              )}
                            </Badge>
                          );
                        })
                      )}
                      {/* Add Service Button */}
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => onAddService(reservation)}
                        title="Add Service"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>

                  {/* Start Column */}
                  <TableCell style={{ width: widths.start }} className="overflow-hidden">
                    {(() => {
                      const parsedTimes = parseTimesFromNotes(reservation.notes);
                      return (
                        <span className="text-sm">
                          {formatDateTimeWithNotes(reservation.start_date, reservation.start_time, parsedTimes.dropOff)}
                        </span>
                      );
                    })()}
                  </TableCell>

                  {/* End Column */}
                  <TableCell style={{ width: widths.end }} className="overflow-hidden">
                    {(() => {
                      const parsedTimes = parseTimesFromNotes(reservation.notes);
                      const endDate = reservation.end_date || reservation.start_date;
                      return (
                        <span className="text-sm">
                          {formatDateTimeWithNotes(endDate, reservation.end_time, parsedTimes.pickUp)}
                        </span>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {selectedReservation && (
        <CancelReservationDialog
          open={cancelDialogOpen}
          onOpenChange={(open) => {
            setCancelDialogOpen(open);
            if (!open) setSelectedReservation(null);
          }}
          petName={selectedReservation.pet_name}
          serviceType={selectedReservation.service_type}
          daycareCredits={selectedReservation.daycare_credits}
          boardingCredits={selectedReservation.boarding_credits}
          onConfirm={handleCancelConfirm}
        />
      )}

      {/* Decline Reservation Dialog */}
      {selectedReservation && (
        <DeclineReservationDialog
          open={declineDialogOpen}
          onOpenChange={(open) => {
            setDeclineDialogOpen(open);
            if (!open) setSelectedReservation(null);
          }}
          petName={selectedReservation.pet_name}
          serviceType={selectedReservation.service_type}
          onConfirm={handleDeclineConfirm}
        />
      )}

      {/* Manage Traits Dialog */}
      {selectedPetForTraits && (
        <ManagePetTraitsDialog
          open={traitsDialogOpen}
          onOpenChange={(open) => {
            setTraitsDialogOpen(open);
            if (!open) setSelectedPetForTraits(null);
          }}
          petId={selectedPetForTraits.id}
          petName={selectedPetForTraits.name}
          onTraitsUpdated={onTraitsUpdated}
        />
      )}

      {/* Reservation Details Dialog */}
      {detailsReservation && (
        <ReservationDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={(open) => {
            setDetailsDialogOpen(open);
            if (!open) setDetailsReservation(null);
          }}
          reservation={detailsReservation}
          onUpdated={onTraitsUpdated}
        />
      )}
    </div>
  );
}
