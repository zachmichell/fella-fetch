import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addMinutes, parse } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  SHOPIFY_STOREFRONT_URL,
  SHOPIFY_STOREFRONT_TOKEN,
} from '@/lib/shopify';
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
import { Check, ChevronsUpDown, Scissors, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

interface ShopifyVariant {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
}

interface ShopifyProduct {
  id: string;
  title: string;
  productType: string;
  variants: { edges: Array<{ node: ShopifyVariant }> };
}

interface ServiceOption {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  price: string;
  displayName: string;
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

const DEFAULT_DURATION = 60; // Default duration in minutes if no custom duration set

const GROOM_PRODUCTS_QUERY = `
  query GetGroomProducts {
    products(first: 100, query: "product_type:Groom") {
      edges {
        node {
          id
          title
          productType
          variants(first: 50) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchGroomProducts(): Promise<ShopifyProduct[]> {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query: GROOM_PRODUCTS_QUERY }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`Shopify error: ${data.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }

  return data.data.products?.edges?.map((edge: { node: ShopifyProduct }) => edge.node) || [];
}

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
  const [selectedService, setSelectedService] = useState<string>('');
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Shopify grooming products
  const { data: products = [] } = useQuery({
    queryKey: ['shopify-groom-products'],
    queryFn: fetchGroomProducts,
    staleTime: 5 * 60 * 1000,
  });

  // Build service options from products
  const serviceOptions: ServiceOption[] = products.flatMap((product) =>
    product.variants.edges.map(({ node: variant }) => ({
      productId: product.id,
      productTitle: product.title,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price.amount,
      displayName: variant.title === 'Default Title' 
        ? product.title 
        : `${product.title} - ${variant.title}`,
    }))
  );

  const selectedServiceOption = serviceOptions.find(s => s.variantId === selectedService);

  // Fetch groomer's custom durations
  const { data: groomerDurations = [] } = useQuery({
    queryKey: ['groomer-durations', groomerId],
    queryFn: async () => {
      if (!groomerId) return [];
      const { data, error } = await supabase
        .from('groomer_service_durations')
        .select('*')
        .eq('groomer_id', groomerId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!groomerId,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStartTime(startTime || '09:00');
      setSelectedPetId('');
      setSelectedService('');
      setDuration(DEFAULT_DURATION);
      setIsCustomDuration(false);
      setNotes('');
    }
  }, [open, startTime]);

  // Auto-update duration when service or groomer changes
  useEffect(() => {
    if (selectedService && groomerId) {
      const customDuration = groomerDurations.find(
        (d) => d.shopify_variant_id === selectedService
      );
      
      if (customDuration) {
        setDuration(customDuration.duration_minutes);
        setIsCustomDuration(true);
      } else {
        setDuration(DEFAULT_DURATION);
        setIsCustomDuration(false);
      }
    }
  }, [selectedService, groomerId, groomerDurations]);

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
    const endDate = addMinutes(startDate, duration);
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
      
      // Include service info in notes if selected
      const serviceNote = selectedServiceOption 
        ? `Service: ${selectedServiceOption.displayName} ($${parseFloat(selectedServiceOption.price).toFixed(2)})`
        : '';
      const fullNotes = [serviceNote, notes].filter(Boolean).join('\n');
      
      const { error } = await supabase.from('reservations').insert({
        pet_id: selectedPetId,
        service_type: 'grooming',
        status: 'confirmed',
        start_date: format(date, 'yyyy-MM-dd'),
        start_time: `${selectedStartTime}:00`,
        end_time: `${endTime}:00`,
        groomer_id: groomerId,
        notes: fullNotes || null,
        price: selectedServiceOption ? parseFloat(selectedServiceOption.price) : null,
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
    setSelectedService('');
    setDuration(DEFAULT_DURATION);
    setNotes('');
    onOpenChange(false);
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hours}h`;
    return `${hours}h ${remainingMins}m`;
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

          {/* Service Selection */}
          <div className="space-y-2">
            <Label>Service</Label>
            <Popover open={serviceSearchOpen} onOpenChange={setServiceSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={serviceSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedServiceOption ? (
                    <span className="truncate">{selectedServiceOption.displayName}</span>
                  ) : (
                    <span className="text-muted-foreground">Select a service...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search services..." />
                  <CommandList>
                    <CommandEmpty>No service found.</CommandEmpty>
                    <CommandGroup>
                      {serviceOptions.map((service) => {
                        const hasDuration = groomerDurations.some(
                          (d) => d.shopify_variant_id === service.variantId
                        );
                        return (
                          <CommandItem
                            key={service.variantId}
                            value={service.displayName}
                            onSelect={() => {
                              setSelectedService(service.variantId);
                              setServiceSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedService === service.variantId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col flex-1">
                              <span className="font-medium">{service.displayName}</span>
                              <span className="text-xs text-muted-foreground">
                                ${parseFloat(service.price).toFixed(2)}
                                {hasDuration && groomerId && (
                                  <span className="ml-2 text-primary">
                                    • Custom duration set
                                  </span>
                                )}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
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
              <Label className="flex items-center gap-2">
                Duration
                {isCustomDuration && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    <Clock className="h-3 w-3 mr-1" />
                    {groomerName}'s speed
                  </Badge>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || DEFAULT_DURATION)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
          </div>

          {/* End time preview */}
          <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span>
              Appointment: {format(parse(selectedStartTime, 'HH:mm', new Date()), 'h:mm a')} → {format(parse(calculateEndTime(), 'HH:mm', new Date()), 'h:mm a')}
              <span className="text-muted-foreground ml-1">({formatDuration(duration)})</span>
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Extra brushing needed, sensitive ears..."
              rows={2}
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
