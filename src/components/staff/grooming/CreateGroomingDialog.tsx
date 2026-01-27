import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addMinutes, parse } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateGroomingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groomerId: string | null;
  groomerName: string | null;
  date: Date | null;
  startTime: string | null;
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

// Generate time options in 15-min increments
const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      options.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
];

export const CreateGroomingDialog = ({
  open,
  onOpenChange,
  groomerId,
  groomerName,
  date,
  startTime,
}: CreateGroomingDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [petSearchOpen, setPetSearchOpen] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState<string>(startTime || '09:00');
  const [duration, setDuration] = useState<string>('60');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStartTime(startTime || '09:00');
      setSelectedPetId('');
      setDuration('60');
      setNotes('');
    }
  }, [open, startTime]);

  // Fetch all active pets with their clients
  const { data: pets = [] } = useQuery({
    queryKey: ['pets-for-grooming'],
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

  const calculateEndTime = () => {
    if (!selectedStartTime) return '';
    const startDate = parse(selectedStartTime, 'HH:mm', new Date());
    const endDate = addMinutes(startDate, parseInt(duration));
    return format(endDate, 'HH:mm');
  };

  const handleSubmit = async () => {
    if (!selectedPetId || !date || !selectedStartTime) {
      toast({
        title: 'Missing information',
        description: 'Please select a pet and time',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const endTime = calculateEndTime();
      
      const { error } = await supabase.from('reservations').insert({
        pet_id: selectedPetId,
        service_type: 'grooming',
        status: 'confirmed',
        start_date: format(date, 'yyyy-MM-dd'),
        start_time: `${selectedStartTime}:00`,
        end_time: `${endTime}:00`,
        groomer_id: groomerId,
        notes: notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Appointment created',
        description: `Grooming appointment for ${selectedPet?.name} has been scheduled`,
      });

      queryClient.invalidateQueries({ queryKey: ['grooming-appointments'] });
      handleClose();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create appointment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPetId('');
    setDuration('60');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            New Grooming Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Groomer & Date Info (Read-only) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Groomer</Label>
              <Input value={groomerName || 'Unassigned'} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input value={date ? format(date, 'PPP') : ''} disabled className="bg-muted" />
            </div>
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

          {/* Time & Duration Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* End time preview */}
          <div className="text-sm text-muted-foreground">
            Appointment ends at: {format(parse(calculateEndTime(), 'HH:mm', new Date()), 'h:mm a')}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (include add-ons: bath, nail trim, etc.)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Full groom with bath and nail trim"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedPetId}>
            {isSubmitting ? 'Creating...' : 'Create Appointment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
