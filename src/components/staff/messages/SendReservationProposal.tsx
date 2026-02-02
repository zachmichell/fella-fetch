import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addMinutes, parse } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
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
import { Check, ChevronsUpDown, CalendarIcon, BedDouble, Scissors, Send, Dog, Sun, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceTypeIcon } from '@/components/ui/service-type-icon';
import { 
  SHOPIFY_STOREFRONT_URL, 
  SHOPIFY_STOREFRONT_TOKEN 
} from '@/lib/shopify';

interface SendReservationProposalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSend: (proposalContent: string, proposalData: ReservationProposalData) => Promise<void>;
}

export interface ReservationProposalData {
  type: 'reservation_proposal';
  serviceType: 'boarding' | 'grooming' | 'daycare';
  daycareType?: 'full' | 'half';
  petId: string;
  petName: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  groomerId?: string;
  groomerName?: string;
  suiteId?: string;
  suiteName?: string;
  notes?: string;
  shopifyProductId?: string;
  shopifyProductTitle?: string;
  shopifyVariantId?: string;
  shopifyVariantTitle?: string;
  price?: string;
  status: 'pending_client_approval';
}

interface Pet {
  id: string;
  name: string;
  breed: string | null;
}

interface Groomer {
  id: string;
  name: string;
}

interface Suite {
  id: string;
  name: string;
}

interface ShopifyVariant {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
}

interface ShopifyProduct {
  id: string;
  title: string;
  variants: { edges: Array<{ node: ShopifyVariant }> };
}

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

export function SendReservationProposal({ 
  open, 
  onOpenChange, 
  clientId, 
  clientName,
  onSend 
}: SendReservationProposalProps) {
  const { toast } = useToast();
  const [serviceType, setServiceType] = useState<'boarding' | 'grooming' | 'daycare'>('daycare');
  const [daycareType, setDaycareType] = useState<'full' | 'half'>('full');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [petSearchOpen, setPetSearchOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [selectedGroomerId, setSelectedGroomerId] = useState('');
  const [selectedSuiteId, setSelectedSuiteId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch client's pets
  const { data: pets = [] } = useQuery({
    queryKey: ['client-pets', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, breed')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Pet[];
    },
    enabled: !!clientId,
  });

  // Fetch groomers
  const { data: groomers = [] } = useQuery({
    queryKey: ['groomers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomers')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Groomer[];
    },
    enabled: serviceType === 'grooming',
  });

  // Fetch suites
  const { data: suites = [] } = useQuery({
    queryKey: ['suites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suites')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Suite[];
    },
    enabled: serviceType === 'boarding',
  });

  // Fetch grooming products from Shopify
  const { data: groomingProducts = [] } = useQuery({
    queryKey: ['shopify-grooming-products'],
    queryFn: async () => {
      // Get the grooming collection mapping
      const { data: mappings } = await supabase
        .from('shopify_collection_mappings')
        .select('shopify_collection_id')
        .eq('category', 'reservations');

      if (!mappings?.length) return [];

      const collectionId = mappings[0].shopify_collection_id;
      const numericId = collectionId.replace('gid://shopify/Collection/', '');

      const query = `
        query {
          collection(id: "gid://shopify/Collection/${numericId}") {
            products(first: 50) {
              edges {
                node {
                  id
                  title
                  productType
                  variants(first: 20) {
                    edges {
                      node {
                        id
                        title
                        price { amount currencyCode }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      const products = result.data?.collection?.products?.edges?.map((e: any) => e.node) || [];
      // Filter for grooming products by title
      return products.filter((p: ShopifyProduct) => 
        p.title.toLowerCase().includes('groom')
      );
    },
    enabled: serviceType === 'grooming',
  });

  const selectedPet = pets.find(p => p.id === selectedPetId);
  const selectedGroomer = groomers.find(g => g.id === selectedGroomerId);
  const selectedSuite = suites.find(s => s.id === selectedSuiteId);
  const selectedProduct = groomingProducts.find((p: ShopifyProduct) => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.variants.edges.find(
    (e: { node: ShopifyVariant }) => e.node.id === selectedVariantId
  )?.node;

  // Reset form when service type changes
  useEffect(() => {
    setSelectedPetId('');
    setCheckInDate(undefined);
    setCheckOutDate(undefined);
    setStartTime('');
    setEndTime('');
    setSelectedGroomerId('');
    setSelectedSuiteId('');
    setSelectedProductId('');
    setSelectedVariantId('');
    setNotes('');
    setDaycareType('full');
  }, [serviceType]);

  // Reset variant when product changes
  useEffect(() => {
    setSelectedVariantId('');
  }, [selectedProductId]);

  const handleSend = async () => {
    if (!selectedPetId || !checkInDate) {
      toast({
        title: 'Missing information',
        description: 'Please select a pet and date',
        variant: 'destructive',
      });
      return;
    }

    if (serviceType === 'grooming' && (!selectedGroomerId || !startTime)) {
      toast({
        title: 'Missing information',
        description: 'Please select a groomer and time',
        variant: 'destructive',
      });
      return;
    }

    if (serviceType === 'daycare' && (!startTime || !endTime)) {
      toast({
        title: 'Missing information',
        description: 'Please select drop-off and pick-up times',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const proposalData: ReservationProposalData = {
        type: 'reservation_proposal',
        serviceType,
        daycareType: serviceType === 'daycare' ? daycareType : undefined,
        petId: selectedPetId,
        petName: selectedPet?.name || '',
        startDate: format(checkInDate, 'yyyy-MM-dd'),
        endDate: checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        groomerId: selectedGroomerId || undefined,
        groomerName: selectedGroomer?.name || undefined,
        suiteId: selectedSuiteId || undefined,
        suiteName: selectedSuite?.name || undefined,
        notes: notes || undefined,
        shopifyProductId: selectedProductId || undefined,
        shopifyProductTitle: selectedProduct?.title || undefined,
        shopifyVariantId: selectedVariantId || undefined,
        shopifyVariantTitle: selectedVariant?.title || undefined,
        price: selectedVariant?.price.amount || undefined,
        status: 'pending_client_approval',
      };

      // Send only the proposal marker - the card will display all the details
      await onSend('', proposalData);
      onOpenChange(false);
      
      // Reset form
      setSelectedPetId('');
      setCheckInDate(undefined);
      setCheckOutDate(undefined);
      setStartTime('');
      setEndTime('');
      setSelectedGroomerId('');
      setSelectedSuiteId('');
      setSelectedProductId('');
      setSelectedVariantId('');
      setNotes('');
      setDaycareType('full');

    } catch (error) {
      console.error('Error sending proposal:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reservation proposal',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Reservation Proposal to {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service Type Selection */}
          <div className="space-y-2">
            <Label>Service Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={serviceType === 'daycare' ? 'default' : 'outline'}
                className="flex items-center gap-2"
                onClick={() => setServiceType('daycare')}
              >
                <Sun className="h-4 w-4" />
                Daycare
              </Button>
              <Button
                type="button"
                variant={serviceType === 'boarding' ? 'default' : 'outline'}
                className="flex items-center gap-2"
                onClick={() => setServiceType('boarding')}
              >
                <BedDouble className="h-4 w-4" />
                Boarding
              </Button>
              <Button
                type="button"
                variant={serviceType === 'grooming' ? 'default' : 'outline'}
                className="flex items-center gap-2"
                onClick={() => setServiceType('grooming')}
              >
                <Scissors className="h-4 w-4" />
                Grooming
              </Button>
            </div>
          </div>

          {/* Pet Selection */}
          <div className="space-y-2">
            <Label>Pet</Label>
            <Popover open={petSearchOpen} onOpenChange={setPetSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedPet ? (
                    <div className="flex items-center gap-2">
                      <Dog className="h-4 w-4" />
                      {selectedPet.name} {selectedPet.breed && `(${selectedPet.breed})`}
                    </div>
                  ) : (
                    'Select pet...'
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search pets..." />
                  <CommandList>
                    <CommandEmpty>No pets found.</CommandEmpty>
                    <CommandGroup>
                      {pets.map((pet) => (
                        <CommandItem
                          key={pet.id}
                          value={pet.name}
                          onSelect={() => {
                            setSelectedPetId(pet.id);
                            setPetSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedPetId === pet.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {pet.name} {pet.breed && `(${pet.breed})`}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {serviceType === 'daycare' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              {/* Day Type */}
              <div className="space-y-2">
                <Label>Day Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={daycareType === 'full' ? 'default' : 'outline'}
                    onClick={() => setDaycareType('full')}
                  >
                    Full Day
                  </Button>
                  <Button
                    type="button"
                    variant={daycareType === 'half' ? 'default' : 'outline'}
                    onClick={() => setDaycareType('half')}
                  >
                    Half Day
                  </Button>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkInDate ? format(checkInDate, 'PPP') : 'Select date...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkInDate}
                      onSelect={setCheckInDate}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Drop-off Time */}
              <div className="space-y-2">
                <Label>Drop-off Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time..." />
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

              {/* Pick-up Time */}
              <div className="space-y-2">
                <Label>Pick-up Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time..." />
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
            </div>
          )}

          {/* Boarding Fields */}
          {serviceType === 'boarding' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              {/* Check-in Date */}
              <div className="space-y-2">
                <Label>Check-in Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkInDate ? format(checkInDate, 'PPP') : 'Select date...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkInDate}
                      onSelect={setCheckInDate}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Check-out Date */}
              <div className="space-y-2">
                <Label>Check-out Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOutDate ? format(checkOutDate, 'PPP') : 'Select date...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkOutDate}
                      onSelect={setCheckOutDate}
                      disabled={(date) => !checkInDate || date <= checkInDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Suite Selection */}
              <div className="space-y-2">
                <Label>Suite (Optional)</Label>
                <Select value={selectedSuiteId} onValueChange={setSelectedSuiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select suite..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suites.map((suite) => (
                      <SelectItem key={suite.id} value={suite.id}>
                        {suite.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Grooming Fields */}
          {serviceType === 'grooming' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              {/* Groomer Selection */}
              <div className="space-y-2">
                <Label>Groomer</Label>
                <Select value={selectedGroomerId} onValueChange={setSelectedGroomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select groomer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groomers.map((groomer) => (
                      <SelectItem key={groomer.id} value={groomer.id}>
                        {groomer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkInDate ? format(checkInDate, 'PPP') : 'Select date...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkInDate}
                      onSelect={setCheckInDate}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time..." />
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

              {/* Service/Product Selection */}
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groomingProducts.map((product: ShopifyProduct) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Variant Selection */}
              {selectedProduct && (
                <div className="space-y-2">
                  <Label>Groom Type</Label>
                  <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProduct.variants.edges.map((edge: { node: ShopifyVariant }) => (
                        <SelectItem key={edge.node.id} value={edge.node.id}>
                          {edge.node.title} - ${parseFloat(edge.node.price.amount).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Proposal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
