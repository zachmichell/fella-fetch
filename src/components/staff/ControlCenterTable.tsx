import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2,
  Dog,
  Tags
} from 'lucide-react';
import { format } from 'date-fns';
import { PetTraitBadges, type PetTrait } from './PetTraitBadges';
import { ManagePetTraitsDialog } from './ManagePetTraitsDialog';
import { CancelReservationDialog } from './CancelReservationDialog';

export interface ControlCenterReservation {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_breed: string | null;
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
}

type TabValue = 'expected' | 'going_home' | 'checked_in' | 'requested';

interface ControlCenterTableProps {
  reservations: ControlCenterReservation[];
  loading: boolean;
  onCheckIn: (reservation: ControlCenterReservation) => void;
  onCheckOut: (reservation: ControlCenterReservation) => void;
  onCancelReservation: (reservation: ControlCenterReservation, useCredit: boolean) => void;
  onAddService: (reservation: ControlCenterReservation) => void;
  onTraitsUpdated?: () => void;
}

const serviceTypeLabels: Record<string, string> = {
  daycare: 'Daycare | Full Day',
  boarding: 'Boarding',
  grooming: 'Grooming',
  training: 'Training',
};

const serviceTypeColors: Record<string, string> = {
  daycare: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  boarding: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  grooming: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  training: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function ControlCenterTable({
  reservations,
  loading,
  onCheckIn,
  onCheckOut,
  onCancelReservation,
  onAddService,
  onTraitsUpdated,
}: ControlCenterTableProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('expected');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ControlCenterReservation | null>(null);
  const [traitsDialogOpen, setTraitsDialogOpen] = useState(false);
  const [selectedPetForTraits, setSelectedPetForTraits] = useState<{ id: string; name: string } | null>(null);

  // Filter by tab
  const getFilteredByTab = () => {
    switch (activeTab) {
      case 'expected':
        return reservations.filter(r => r.status === 'confirmed' || r.status === 'pending');
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

  // Filter by search
  const filteredReservations = getFilteredByTab().filter(r => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.pet_name.toLowerCase().includes(query) ||
      r.client_name.toLowerCase().includes(query)
    );
  });

  // Tab counts
  const expectedCount = reservations.filter(r => r.status === 'confirmed' || r.status === 'pending').length;
  const goingHomeCount = reservations.filter(r => r.status === 'checked_in').length;
  const checkedInCount = reservations.filter(r => r.status === 'checked_in').length;
  const requestedCount = reservations.filter(r => r.status === 'pending').length;

  const formatDateTime = (date: string, time: string | null) => {
    const d = new Date(date);
    const dateStr = format(d, 'EEE, MM/dd');
    const timeStr = time ? time.slice(0, 5) : '';
    return timeStr ? `${dateStr}, ${timeStr}` : dateStr;
  };

  const handleCancelClick = (reservation: ControlCenterReservation) => {
    setSelectedReservation(reservation);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = (useCredit: boolean) => {
    if (selectedReservation) {
      onCancelReservation(selectedReservation, useCredit);
    }
    setCancelDialogOpen(false);
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
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[140px]">Actions</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Lodging</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation) => (
                <TableRow key={reservation.id} className="hover:bg-muted/30">
                  {/* Actions Column */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
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
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                          onClick={() => onCheckOut(reservation)}
                          title="Check Out"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancelClick(reservation)}
                        title="Cancel Reservation"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Reservation</DropdownMenuItem>
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
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{reservation.pet_name}</span>
                        {reservation.pet_breed && (
                          <span className="text-muted-foreground text-sm">
                            ({reservation.pet_breed})
                          </span>
                        )}
                      </div>
                      {/* Pet Trait Icons */}
                      <PetTraitBadges traits={reservation.pet_traits || []} maxDisplay={6} />
                    </div>
                  </TableCell>

                  {/* Owner Column */}
                  <TableCell>
                    <div>
                      <span>{reservation.client_name}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className={reservation.daycare_credits <= 0 ? 'text-destructive font-medium' : ''}>
                          DC: {reservation.daycare_credits}
                        </span>
                        {' | '}
                        <span className={reservation.half_daycare_credits <= 0 ? 'text-destructive font-medium' : ''}>
                          HD: {reservation.half_daycare_credits}
                        </span>
                        {' | '}
                        <span className={reservation.boarding_credits <= 0 ? 'text-destructive font-medium' : ''}>
                          BC: {reservation.boarding_credits}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Type Column */}
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={serviceTypeColors[reservation.service_type] || ''}
                    >
                      {serviceTypeLabels[reservation.service_type] || reservation.service_type}
                    </Badge>
                  </TableCell>

                  {/* Lodging Column */}
                  <TableCell>
                    {reservation.service_type === 'boarding' ? (
                      <span className="text-sm">
                        {reservation.lodging || 'Not assigned'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Services Column */}
                  <TableCell>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => onAddService(reservation)}
                      title="Add Service"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </TableCell>

                  {/* Start Column */}
                  <TableCell>
                    <span className="text-sm">
                      {formatDateTime(reservation.start_date, reservation.start_time)}
                    </span>
                  </TableCell>

                  {/* End Column */}
                  <TableCell>
                    <span className="text-sm">
                      {reservation.end_date 
                        ? formatDateTime(reservation.end_date, reservation.end_time)
                        : reservation.end_time 
                          ? formatDateTime(reservation.start_date, reservation.end_time)
                          : '—'
                      }
                    </span>
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
    </div>
  );
}
