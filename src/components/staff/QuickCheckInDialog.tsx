import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Search, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePetActivityLog } from '@/hooks/usePetActivityLog';
import { fetchCollectionProducts, getCollectionIdFromGid, ShopifyProduct } from '@/lib/shopify';
import { TraitAlertDialog } from './TraitAlertDialog';

interface ServiceType {
  id: string;
  name: string;
  display_name: string;
  category: string;
  credit_field: string | null;
}

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  client_id: string;
  client_name: string;
}

interface PetTrait {
  id: string;
  icon_name: string;
  color_key: string;
  title: string;
  is_alert: boolean;
}

interface Addon {
  id: string;
  title: string;
  price: string;
  selected: boolean;
  variantId?: string;
}

interface QuickCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Helper to get current time in HH:mm format
function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function QuickCheckInDialog({ open, onOpenChange, onSuccess }: QuickCheckInDialogProps) {
  const { toast } = useToast();
  const { logActivity } = usePetActivityLog();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pet[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedPetTraits, setSelectedPetTraits] = useState<PetTrait[]>([]);
  
  // Service type state
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  
  // Date/time state
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState(getCurrentTime());
  const [endTime, setEndTime] = useState('17:00');
  
  // Add-ons state
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  
  // Notes
  const [notes, setNotes] = useState('');
  
  // Submission state
  const [submitting, setSubmitting] = useState(false);
  
  // Trait alert state
  const [traitAlertOpen, setTraitAlertOpen] = useState(false);
  const [alertTraits, setAlertTraits] = useState<PetTrait[]>([]);

  // Reset start time when dialog opens
  useEffect(() => {
    if (open) {
      setStartTime(getCurrentTime());
    }
  }, [open]);

  // Fetch service types on mount
  useEffect(() => {
    const fetchServiceTypes = async () => {
      const { data, error } = await supabase
        .from('service_types')
        .select('id, name, display_name, category, credit_field')
        .eq('is_active', true)
        .in('category', ['reservation', 'service'])
        .order('sort_order', { ascending: true });
      
      if (!error && data) {
        setServiceTypes(data);
      }
    };
    
    if (open) {
      fetchServiceTypes();
    }
  }, [open]);

  // Fetch add-ons from Shopify collections mapped as 'addons'
  useEffect(() => {
    const fetchAddons = async () => {
      setLoadingAddons(true);
      try {
        // Get addon collection mappings
        const { data: mappings } = await supabase
          .from('shopify_collection_mappings')
          .select('shopify_collection_id, shopify_collection_title')
          .eq('category', 'addons');
        
        if (mappings && mappings.length > 0) {
          const allAddons: Addon[] = [];
          
          // Fetch products from each addon collection
          for (const mapping of mappings) {
            // Extract handle from collection ID or use a query approach
            // The collection ID is stored as the numeric ID, we need to fetch by handle
            // For now, we'll use the title to create a handle
            const handle = mapping.shopify_collection_title.toLowerCase().replace(/\s+/g, '-');
            
            try {
              const products = await fetchCollectionProducts(handle, 50);
              
              products.forEach((product: ShopifyProduct) => {
                const variant = product.node.variants.edges[0]?.node;
                if (variant) {
                  allAddons.push({
                    id: product.node.id,
                    title: product.node.title,
                    price: `$${parseFloat(variant.price.amount).toFixed(2)}`,
                    selected: false,
                    variantId: variant.id,
                  });
                }
              });
            } catch (err) {
              console.error(`Error fetching products for collection ${handle}:`, err);
            }
          }
          
          // Remove duplicates by ID
          const uniqueAddons = allAddons.filter((addon, index, self) => 
            index === self.findIndex(a => a.id === addon.id)
          );
          
          setAddons(uniqueAddons);
        } else {
          setAddons([]);
        }
      } catch (error) {
        console.error('Error fetching addons:', error);
        setAddons([]);
      } finally {
        setLoadingAddons(false);
      }
    };
    
    if (open) {
      fetchAddons();
    }
  }, [open]);

  // Search for pets/clients - fixed to search properly
  useEffect(() => {
    const searchPets = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        // First search pets by name
        const { data: petsByName, error: petError } = await supabase
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
          .ilike('name', `%${searchQuery}%`)
          .limit(10);

        // Also search by client name
        const { data: clientMatches, error: clientError } = await supabase
          .from('clients')
          .select('id, first_name, last_name')
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
          .limit(10);

        let results: Pet[] = [];

        // Add pets found by pet name
        if (!petError && petsByName) {
          results = petsByName.map((pet: any) => ({
            id: pet.id,
            name: pet.name,
            breed: pet.breed,
            client_id: pet.client_id,
            client_name: pet.clients ? `${pet.clients.first_name} ${pet.clients.last_name}` : 'Unknown',
          }));
        }

        // If we found clients, fetch their pets too
        if (!clientError && clientMatches && clientMatches.length > 0) {
          const clientIds = clientMatches.map(c => c.id);
          
          const { data: petsByClient } = await supabase
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
            .in('client_id', clientIds)
            .limit(20);

          if (petsByClient) {
            const additionalPets = petsByClient.map((pet: any) => ({
              id: pet.id,
              name: pet.name,
              breed: pet.breed,
              client_id: pet.client_id,
              client_name: pet.clients ? `${pet.clients.first_name} ${pet.clients.last_name}` : 'Unknown',
            }));

            // Merge and deduplicate
            const existingIds = new Set(results.map(p => p.id));
            additionalPets.forEach(pet => {
              if (!existingIds.has(pet.id)) {
                results.push(pet);
              }
            });
          }
        }

        setSearchResults(results.slice(0, 10));
      } catch (error) {
        console.error('Error searching pets:', error);
      } finally {
        setSearching(false);
      }
    };
    
    const debounce = setTimeout(searchPets, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Fetch pet traits when a pet is selected
  useEffect(() => {
    const fetchPetTraits = async () => {
      if (!selectedPet) {
        setSelectedPetTraits([]);
        return;
      }

      const { data, error } = await supabase
        .from('pet_traits')
        .select('id, icon_name, color_key, title, is_alert')
        .eq('pet_id', selectedPet.id);

      if (!error && data) {
        setSelectedPetTraits(data);
      }
    };

    fetchPetTraits();
  }, [selectedPet]);

  const handleSelectPet = (pet: Pet) => {
    setSelectedPet(pet);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleToggleAddon = (addonId: string) => {
    setAddons(prev => prev.map(addon => 
      addon.id === addonId ? { ...addon, selected: !addon.selected } : addon
    ));
  };

  const handleSubmitClick = () => {
    if (!selectedPet || !selectedServiceType) {
      toast({
        title: 'Missing information',
        description: 'Please select a pet and service type',
        variant: 'destructive',
      });
      return;
    }

    // Check for alert traits
    const alerts = selectedPetTraits.filter(t => t.is_alert);
    if (alerts.length > 0) {
      setAlertTraits(alerts);
      setTraitAlertOpen(true);
    } else {
      performCheckIn();
    }
  };

  const performCheckIn = async () => {
    if (!selectedPet || !selectedServiceType) return;

    setSubmitting(true);
    try {
      const checkInTime = new Date().toISOString();
      
      // Create the reservation with checked_in status
      const { data: reservation, error } = await supabase
        .from('reservations')
        .insert({
          pet_id: selectedPet.id,
          service_type: selectedServiceType as any,
          status: 'checked_in',
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          start_time: startTime,
          end_time: endTime,
          checked_in_at: checkInTime,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Deduct credit if applicable
      const serviceType = serviceTypes.find(st => st.name === selectedServiceType);
      if (serviceType?.credit_field === 'daycare_credits') {
        await supabase.rpc('deduct_daycare_credit', { p_client_id: selectedPet.client_id });
      }

      const selectedAddons = addons.filter(a => a.selected);

      // Log the activity
      await logActivity({
        petId: selectedPet.id,
        reservationId: reservation.id,
        actionType: 'pet_checked_in',
        actionCategory: 'check_in',
        description: `${selectedPet.name} quick check-in for ${serviceType?.display_name || selectedServiceType}`,
        details: {
          service_type: selectedServiceType,
          check_in_time: checkInTime,
          is_drop_in: true,
          addons: selectedAddons.map(a => ({ title: a.title, price: a.price })),
        }
      });

      toast({
        title: 'Check-in successful!',
        description: `${selectedPet.name} has been checked in for ${serviceType?.display_name || selectedServiceType}`,
      });

      // Reset form and close
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create check-in. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPet(null);
    setSelectedPetTraits([]);
    setSelectedServiceType('');
    setStartDate(new Date());
    setEndDate(undefined);
    setStartTime(getCurrentTime());
    setEndTime('17:00');
    setAddons(prev => prev.map(a => ({ ...a, selected: false })));
    setNotes('');
    setAlertTraits([]);
  };

  const isBoarding = selectedServiceType === 'boarding';
  const selectedAddons = addons.filter(a => a.selected);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Quick Check In</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-2">
              {/* Pet Search */}
              <div className="space-y-2">
                <Label>Search Pet or Client</Label>
                {selectedPet ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{selectedPet.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPet.breed ? `${selectedPet.breed} • ` : ''}{selectedPet.client_name}
                      </p>
                      {selectedPetTraits.filter(t => t.is_alert).length > 0 && (
                        <p className="text-xs text-destructive mt-1">
                          ⚠️ Has {selectedPetTraits.filter(t => t.is_alert).length} alert trait(s)
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedPet(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by pet or client name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                    {(searchResults.length > 0 || searching) && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg">
                        {searching ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                            Searching...
                          </div>
                        ) : (
                          <ul className="py-1 max-h-60 overflow-auto">
                            {searchResults.map((pet) => (
                              <li
                                key={pet.id}
                                className="px-3 py-2 hover:bg-muted cursor-pointer"
                                onClick={() => handleSelectPet(pet)}
                              >
                                <p className="font-medium">{pet.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {pet.breed ? `${pet.breed} • ` : ''}{pet.client_name}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Service Type */}
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {serviceTypes.map((st) => (
                      <SelectItem key={st.id} value={st.name}>
                        {st.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {isBoarding && (
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => date < startDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Add-ons */}
              <div className="space-y-2">
                <Label>Add-ons (Optional)</Label>
                {loadingAddons ? (
                  <div className="text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading add-ons...
                  </div>
                ) : addons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No add-ons available. Configure add-on collections in Shopify Settings.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {addons.map((addon) => (
                      <div
                        key={addon.id}
                        className={cn(
                          "flex items-center space-x-2 p-2 border rounded-md cursor-pointer transition-colors",
                          addon.selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => handleToggleAddon(addon.id)}
                      >
                        <Checkbox checked={addon.selected} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{addon.title}</p>
                          <p className="text-xs text-muted-foreground">{addon.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedAddons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedAddons.map((addon) => (
                      <Badge key={addon.id} variant="secondary" className="text-xs">
                        {addon.title}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Any special instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitClick} 
              disabled={!selectedPet || !selectedServiceType || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking In...
                </>
              ) : (
                'Check In Now'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trait Alert Dialog */}
      <TraitAlertDialog
        open={traitAlertOpen}
        onOpenChange={setTraitAlertOpen}
        petName={selectedPet?.name || ''}
        alertTraits={alertTraits}
        onAcknowledge={() => {
          setTraitAlertOpen(false);
          performCheckIn();
        }}
      />
    </>
  );
}
