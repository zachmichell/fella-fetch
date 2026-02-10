import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  X,
  MoreVertical,
  Search,
  Loader2,
  Dog,
  Undo2,
  CheckCircle,
  XCircle,
  Plus,
  Repeat,
} from 'lucide-react';
import { format } from 'date-fns';
import { ControlCenterReservation } from '@/components/staff/ControlCenterTable';
import { PetTraitBadges } from '@/components/staff/PetTraitBadges';
import { CancelReservationDialog } from '@/components/staff/CancelReservationDialog';
import { DeclineReservationDialog } from '@/components/staff/DeclineReservationDialog';

type TabValue = 'expected' | 'going_home' | 'checked_in' | 'requested';

interface MobileControlCenterProps {
  reservations: ControlCenterReservation[];
  loading: boolean;
  onCheckIn: (reservation: ControlCenterReservation) => void;
  onCheckOut: (reservation: ControlCenterReservation) => void;
  onUndoCheckIn: (reservation: ControlCenterReservation) => void;
  onAcceptReservation: (reservation: ControlCenterReservation) => void;
  onCancelReservation: (reservation: ControlCenterReservation, useCredit: boolean) => void;
  onDeclineReservation: (reservation: ControlCenterReservation, reason: string) => void;
  onAddService: (reservation: ControlCenterReservation) => void;
  onTraitsUpdated?: () => void;
}

const getServiceTypeLabel = (serviceType: string, notes: string | null): string => {
  if (serviceType === 'daycare') {
    const isHalfDay = notes?.toLowerCase().includes('half day');
    return isHalfDay ? 'Half Day' : 'Full Day';
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

// Parse drop-off and pick-up times from notes
const parseTimesFromNotes = (notes: string | null): { dropOff: string | null; pickUp: string | null } => {
  if (!notes) return { dropOff: null, pickUp: null };
  const dropOffMatch = notes.match(/Drop-off:\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  const pickUpMatch = notes.match(/Pick-up:\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  return {
    dropOff: dropOffMatch ? dropOffMatch[1].trim() : null,
    pickUp: pickUpMatch ? pickUpMatch[1].trim() : null,
  };
};

function PetAvatar({ petName }: { petName: string }) {
  return (
    <Avatar className="h-10 w-10">
      <AvatarFallback><Dog className="h-4 w-4" /></AvatarFallback>
    </Avatar>
  );
}

export function MobileControlCenter({
  reservations,
  loading,
  onCheckIn,
  onCheckOut,
  onUndoCheckIn,
  onAcceptReservation,
  onCancelReservation,
  onDeclineReservation,
  onAddService,
}: MobileControlCenterProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('expected');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ControlCenterReservation | null>(null);

  const expectedCount = reservations.filter(r => r.status === 'confirmed').length;
  const goingHomeCount = reservations.filter(r => r.status === 'checked_in').length;
  const requestedCount = reservations.filter(r => r.status === 'pending').length;

  const getFilteredByTab = () => {
    switch (activeTab) {
      case 'expected': return reservations.filter(r => r.status === 'confirmed');
      case 'going_home': return reservations.filter(r => r.status === 'checked_in');
      case 'checked_in': return reservations.filter(r => r.status === 'checked_in');
      case 'requested': return reservations.filter(r => r.status === 'pending');
      default: return reservations;
    }
  };

  const filtered = getFilteredByTab().filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.pet_name.toLowerCase().includes(q) || r.client_name.toLowerCase().includes(q);
  });

  const handleCancelClick = (reservation: ControlCenterReservation) => {
    setSelectedReservation(reservation);
    setCancelDialogOpen(true);
  };

  const handleDeclineClick = (reservation: ControlCenterReservation) => {
    setSelectedReservation(reservation);
    setDeclineDialogOpen(true);
  };

  return (
    <div className="space-y-3">
      {/* Tabs - scrollable horizontally */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="w-full h-auto p-0 bg-transparent gap-0 flex overflow-x-auto">
          <TabsTrigger
            value="expected"
            className="flex-1 min-w-0 rounded-none text-[11px] px-1 py-2 data-[state=active]:bg-green-500 data-[state=active]:text-white bg-green-600 text-white whitespace-nowrap"
          >
            Expected ({expectedCount})
          </TabsTrigger>
          <TabsTrigger
            value="going_home"
            className="flex-1 min-w-0 rounded-none text-[11px] px-1 py-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white bg-cyan-600 text-white whitespace-nowrap"
          >
            Home ({goingHomeCount})
          </TabsTrigger>
          <TabsTrigger
            value="checked_in"
            className="flex-1 min-w-0 rounded-none text-[11px] px-1 py-2 data-[state=active]:bg-slate-500 data-[state=active]:text-white bg-slate-600 text-white whitespace-nowrap"
          >
            In ({goingHomeCount})
          </TabsTrigger>
          <TabsTrigger
            value="requested"
            className="flex-1 min-w-0 rounded-none text-[11px] px-1 py-2 data-[state=active]:bg-rose-500 data-[state=active]:text-white bg-rose-600 text-white whitespace-nowrap"
          >
            Requests ({requestedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search pet or client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Dog className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No reservations found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((res) => {
            const times = parseTimesFromNotes(res.notes);
            return (
              <Card key={res.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <PetAvatar petName={res.pet_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{res.pet_name}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${serviceTypeColors[res.service_type] || ''}`}>
                          {getServiceTypeLabel(res.service_type, res.notes)}
                        </Badge>
                        {res.subscription_id && (
                          <Repeat className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{res.client_name}</p>
                      {res.pet_traits && res.pet_traits.length > 0 && (
                        <div className="mt-1">
                          <PetTraitBadges traits={res.pet_traits} />
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        {times.dropOff && <span>Drop: {times.dropOff}</span>}
                        {times.pickUp && <span>Pick: {times.pickUp}</span>}
                        {!times.dropOff && !times.pickUp && res.start_time && (
                          <span>{res.start_time.slice(0, 5)}</span>
                        )}
                        {res.payment_pending && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">$ Due</Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {activeTab === 'expected' && (
                        <Button size="sm" className="h-8 px-2 text-xs" onClick={() => onCheckIn(res)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> In
                        </Button>
                      )}
                      {activeTab === 'going_home' && (
                        <Button size="sm" className="h-8 px-2 text-xs" onClick={() => onCheckOut(res)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Out
                        </Button>
                      )}
                      {activeTab === 'checked_in' && (
                        <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onUndoCheckIn(res)}>
                          <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
                        </Button>
                      )}
                      {activeTab === 'requested' && (
                        <>
                          <Button size="sm" className="h-8 w-8 p-0" onClick={() => onAcceptReservation(res)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleDeclineClick(res)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onAddService(res)}>
                            <Plus className="h-4 w-4 mr-2" /> Add Service
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCancelClick(res)} className="text-destructive">
                            <X className="h-4 w-4 mr-2" /> Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Dialog */}
      {selectedReservation && (
        <CancelReservationDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          petName={selectedReservation.pet_name}
          serviceType={selectedReservation.service_type}
          daycareCredits={selectedReservation.daycare_credits}
          boardingCredits={selectedReservation.boarding_credits}
          onConfirm={(useCredit) => {
            onCancelReservation(selectedReservation, useCredit);
            setCancelDialogOpen(false);
            setSelectedReservation(null);
          }}
        />
      )}

      {/* Decline Dialog */}
      {selectedReservation && (
        <DeclineReservationDialog
          open={declineDialogOpen}
          onOpenChange={setDeclineDialogOpen}
          petName={selectedReservation.pet_name}
          serviceType={selectedReservation.service_type}
          onConfirm={(reason) => {
            onDeclineReservation(selectedReservation, reason);
            setDeclineDialogOpen(false);
            setSelectedReservation(null);
          }}
        />
      )}
    </div>
  );
}
