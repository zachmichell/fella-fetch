import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Dog, Calendar, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

interface CreateDaycareSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscriptionCreated?: () => void;
  preselectedClientId?: string;
  preselectedPetId?: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  client_id: string;
}

type DayType = 'full' | 'half';
type HalfDayPeriod = 'morning' | 'afternoon';
type Step = 'client' | 'pet' | 'dayType' | 'days' | 'confirm';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export function CreateDaycareSubscriptionDialog({
  open,
  onOpenChange,
  onSubscriptionCreated,
  preselectedClientId,
  preselectedPetId,
}: CreateDaycareSubscriptionDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('client');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(preselectedClientId || null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(preselectedPetId || null);
  const [dayType, setDayType] = useState<DayType>('full');
  const [halfDayPeriod, setHalfDayPeriod] = useState<HalfDayPeriod>('morning');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(preselectedClientId ? (preselectedPetId ? 'dayType' : 'pet') : 'client');
      setSelectedClientId(preselectedClientId || null);
      setSelectedPetId(preselectedPetId || null);
      setDayType('full');
      setHalfDayPeriod('morning');
      setSelectedDays([]);
      setNotes('');
    }
  }, [open, preselectedClientId, preselectedPetId]);

  // Fetch clients
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-for-subscription'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('last_name');

      if (error) throw error;
      return data as Client[];
    },
    enabled: open,
  });

  // Fetch pets for selected client
  const { data: pets = [], isLoading: loadingPets } = useQuery({
    queryKey: ['pets-for-subscription', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, breed, client_id')
        .eq('client_id', selectedClientId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Pet[];
    },
    enabled: !!selectedClientId && open,
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedPet = pets.find(p => p.id === selectedPetId);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = async () => {
    if (!selectedClientId || !selectedPetId || selectedDays.length === 0) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('daycare_subscriptions' as any)
        .insert({
          client_id: selectedClientId,
          pet_id: selectedPetId,
          day_type: dayType,
          half_day_period: dayType === 'half' ? halfDayPeriod : null,
          days_of_week: selectedDays,
          notes: notes || null,
          is_active: true,
          is_approved: false,
        });

      if (error) throw error;

      toast.success('Recurring daycare subscription created! It will be pending approval.');
      queryClient.invalidateQueries({ queryKey: ['daycare-subscriptions'] });
      onSubscriptionCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 'client': return !!selectedClientId;
      case 'pet': return !!selectedPetId;
      case 'dayType': return true;
      case 'days': return selectedDays.length > 0;
      case 'confirm': return true;
      default: return false;
    }
  };

  const goNext = () => {
    const steps: Step[] = ['client', 'pet', 'dayType', 'days', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const steps: Step[] = ['client', 'pet', 'dayType', 'days', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const getStepNumber = () => {
    const steps: Step[] = ['client', 'pet', 'dayType', 'days', 'confirm'];
    return steps.indexOf(step) + 1;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Recurring Daycare</DialogTitle>
          <DialogDescription>
            Step {getStepNumber()} of 5 — Set up a weekly recurring daycare schedule
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[300px] py-4">
          {/* Step 1: Select Client */}
          {step === 'client' && (
            <div className="space-y-4">
              <Label>Select Client</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {selectedClient 
                      ? `${selectedClient.first_name} ${selectedClient.last_name}`
                      : 'Search for a client...'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search clients..." />
                    <CommandList>
                      <CommandEmpty>No clients found.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.first_name} ${client.last_name}`}
                            onSelect={() => {
                              setSelectedClientId(client.id);
                              setSelectedPetId(null);
                              setClientSearchOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${selectedClientId === client.id ? 'opacity-100' : 'opacity-0'}`} />
                            {client.first_name} {client.last_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Step 2: Select Pet */}
          {step === 'pet' && (
            <div className="space-y-4">
              <Label>Select Pet for {selectedClient?.first_name}</Label>
              {loadingPets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : pets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No active pets found for this client
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => setSelectedPetId(pet.id)}
                        className={`w-full p-4 rounded-lg border-2 flex items-center gap-3 transition-all text-left ${
                          selectedPetId === pet.id
                            ? 'border-primary bg-accent/30'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Dog className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          {pet.breed && <p className="text-sm text-muted-foreground">{pet.breed}</p>}
                        </div>
                        {selectedPetId === pet.id && (
                          <Check className="ml-auto h-5 w-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Step 3: Day Type */}
          {step === 'dayType' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Day Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDayType('full')}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      dayType === 'full'
                        ? 'border-primary bg-accent/30'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Clock className="h-6 w-6 mx-auto mb-2" />
                    <p className="font-medium">Full Day</p>
                    <p className="text-sm text-muted-foreground">All day care</p>
                  </button>
                  <button
                    onClick={() => setDayType('half')}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      dayType === 'half'
                        ? 'border-primary bg-accent/30'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Clock className="h-6 w-6 mx-auto mb-2" />
                    <p className="font-medium">Half Day</p>
                    <p className="text-sm text-muted-foreground">Morning or afternoon</p>
                  </button>
                </div>
              </div>

              {dayType === 'half' && (
                <div className="space-y-4">
                  <Label>Half Day Period</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setHalfDayPeriod('morning')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        halfDayPeriod === 'morning'
                          ? 'border-primary bg-accent/30'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium">Morning</p>
                      <p className="text-xs text-muted-foreground">Until 12:00 PM</p>
                    </button>
                    <button
                      onClick={() => setHalfDayPeriod('afternoon')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        halfDayPeriod === 'afternoon'
                          ? 'border-primary bg-accent/30'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium">Afternoon</p>
                      <p className="text-xs text-muted-foreground">1:00 PM onwards</p>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Select Days */}
          {step === 'days' && (
            <div className="space-y-4">
              <Label>Select Days of the Week</Label>
              <p className="text-sm text-muted-foreground">
                Choose which days {selectedPet?.name} will attend daycare each week
              </p>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      selectedDays.includes(day.value)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-sm">{day.short}</p>
                  </button>
                ))}
              </div>

              {selectedDays.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4">
                  {selectedDays.map((day) => {
                    const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                    return (
                      <Badge key={day} variant="secondary">
                        {dayInfo?.label}
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="pt-4">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any special instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <Label>Confirm Subscription Details</Label>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium">{selectedClient?.first_name} {selectedClient?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pet:</span>
                  <span className="font-medium">{selectedPet?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Day Type:</span>
                  <span className="font-medium">
                    {dayType === 'full' ? 'Full Day' : `Half Day (${halfDayPeriod})`}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Days:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {selectedDays.map((day) => {
                      const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                      return (
                        <Badge key={day} variant="outline" className="text-xs">
                          {dayInfo?.short}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                {notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm">Notes:</span>
                    <p className="text-sm mt-1">{notes}</p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This subscription will be pending until approved. Once approved, reservations will be automatically generated.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step !== 'client' && (
              <Button variant="ghost" onClick={goBack} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            {step === 'confirm' ? (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Subscription
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canGoNext()}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
