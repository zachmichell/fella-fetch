import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CalendarIcon, Check, ChevronsUpDown, Dog } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateBoardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suiteId: string | null;
  suiteName: string | null;
  startDate: Date | null;
}

interface PetWithClient {
  id: string;
  name: string;
  breed: string | null;
  client_id: string;
  clients: {
    first_name: string;
    last_name: string;
  };
}

export const CreateBoardingDialog = ({
  open,
  onOpenChange,
  suiteId,
  suiteName,
  startDate,
}: CreateBoardingDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [petSearchOpen, setPetSearchOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(startDate || undefined);
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all active pets with their clients
  const { data: pets = [] } = useQuery({
    queryKey: ['pets-for-booking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pets')
        .select(`
          id,
          name,
          breed,
          client_id,
          clients (
            first_name,
            last_name
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as PetWithClient[];
    },
  });

  const selectedPet = pets.find(p => p.id === selectedPetId);

  const handleSubmit = async () => {
    if (!selectedPetId || !checkInDate || !suiteId) {
      toast({
        title: 'Missing information',
        description: 'Please select a pet and check-in date',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('reservations').insert({
        pet_id: selectedPetId,
        service_type: 'boarding',
        status: 'confirmed',
        start_date: format(checkInDate, 'yyyy-MM-dd'),
        end_date: checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : null,
        suite_id: suiteId,
        notes: notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Reservation created',
        description: `Boarding reservation for ${selectedPet?.name} has been created`,
      });

      queryClient.invalidateQueries({ queryKey: ['boarding-reservations'] });
      handleClose();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create reservation',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPetId('');
    setCheckInDate(startDate || undefined);
    setCheckOutDate(undefined);
    setNotes('');
    onOpenChange(false);
  };

  // Update check-in date when startDate prop changes
  if (open && startDate && !checkInDate) {
    setCheckInDate(startDate);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dog className="h-5 w-5" />
            New Boarding Reservation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Suite Info (Read-only) */}
          <div className="space-y-2">
            <Label>Suite</Label>
            <Input value={suiteName || 'Unassigned'} disabled className="bg-muted" />
          </div>

          {/* Pet Selection */}
          <div className="space-y-2">
            <Label>Pet *</Label>
            <Popover open={petSearchOpen} onOpenChange={setPetSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={petSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedPet ? (
                    <span>
                      {selectedPet.name} - {selectedPet.clients.first_name} {selectedPet.clients.last_name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select a pet...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search pets..." />
                  <CommandList>
                    <CommandEmpty>No pet found.</CommandEmpty>
                    <CommandGroup>
                      {pets.map((pet) => (
                        <CommandItem
                          key={pet.id}
                          value={`${pet.name} ${pet.clients.first_name} ${pet.clients.last_name}`}
                          onSelect={() => {
                            setSelectedPetId(pet.id);
                            setPetSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedPetId === pet.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{pet.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {pet.breed || 'Unknown breed'} • {pet.clients.first_name} {pet.clients.last_name}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkInDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkInDate ? format(checkInDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    onSelect={setCheckInDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Check-out Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkOutDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOutDate ? format(checkOutDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOutDate}
                    onSelect={setCheckOutDate}
                    disabled={(date) => checkInDate ? date < checkInDate : false}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedPetId || !checkInDate}>
            {isSubmitting ? 'Creating...' : 'Create Reservation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
