import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, ChevronLeft, ChevronRight, Check, User, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { storefrontApiRequest, type ShopifyProduct } from '@/lib/shopify';
import { format, addDays, startOfDay, isAfter, isBefore } from 'date-fns';
import { toast } from 'sonner';

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: string;
  petName: string;
  reservationId?: string;
  onServiceAdded?: () => void;
}

export interface SelectedService {
  id: string;
  title: string;
  price: number;
  variantId: string;
  variantTitle: string;
}

interface CollectionMapping {
  id: string;
  shopify_collection_id: string;
  shopify_collection_title: string;
  category: string;
}

interface Groomer {
  id: string;
  name: string;
  color: string;
  email: string | null;
}

interface GroomerSchedule {
  groomer_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
}

interface GroomerDuration {
  groomer_id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  duration_minutes: number;
}

type Step = 'product' | 'variant' | 'groomer' | 'schedule' | 'confirm';

const TIME_SLOTS = [
  '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45',
];

export function AddServiceDialog({
  open,
  onOpenChange,
  petId,
  petName,
  reservationId,
  onServiceAdded,
}: AddServiceDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('product');
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{id: string; title: string; price: string} | null>(null);
  const [selectedGroomer, setSelectedGroomer] = useState<Groomer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('product');
      setSelectedProduct(null);
      setSelectedVariant(null);
      setSelectedGroomer(null);
      setSelectedDate(undefined);
      setSelectedTime(null);
    }
  }, [open]);

  // Fetch collection mappings for services and addons categories
  const { data: serviceMappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ['shopify-service-addon-collection-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopify_collection_mappings')
        .select('*')
        .in('category', ['services', 'addons']);
      
      if (error) throw error;
      return data as CollectionMapping[];
    },
    enabled: open,
  });

  // Fetch products from mapped collections
  const { data: serviceProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['shopify-service-products', serviceMappings?.map(m => m.shopify_collection_id)],
    queryFn: async () => {
      if (!serviceMappings || serviceMappings.length === 0) return [];

      const allProducts: ShopifyProduct[] = [];
      const seenProductIds = new Set<string>();
      
      for (const mapping of serviceMappings) {
        try {
          const collectionQuery = `
            query GetCollectionById($id: ID!) {
              node(id: $id) {
                ... on Collection {
                  handle
                  products(first: 50) {
                    edges {
                      node {
                        id
                        title
                        description
                        handle
                        productType
                        vendor
                        priceRange {
                          minVariantPrice {
                            amount
                            currencyCode
                          }
                        }
                        images(first: 1) {
                          edges {
                            node {
                              url
                              altText
                            }
                          }
                        }
                        variants(first: 20) {
                          edges {
                            node {
                              id
                              title
                              price {
                                amount
                                currencyCode
                              }
                              availableForSale
                              selectedOptions {
                                name
                                value
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          `;
          
          const gid = `gid://shopify/Collection/${mapping.shopify_collection_id}`;
          const result = await storefrontApiRequest(collectionQuery, { id: gid });
          const products = result?.data?.node?.products?.edges || [];
          
          for (const product of products) {
            if (!seenProductIds.has(product.node.id)) {
              seenProductIds.add(product.node.id);
              allProducts.push(product);
            }
          }
        } catch (error) {
          console.error(`Error fetching products for collection ${mapping.shopify_collection_title}:`, error);
        }
      }
      
      return allProducts;
    },
    enabled: open && !!serviceMappings && serviceMappings.length > 0,
  });

  // Fetch groomers
  const { data: groomers } = useQuery({
    queryKey: ['groomers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Groomer[];
    },
    enabled: open && step === 'groomer',
  });

  // Fetch groomer schedules
  const { data: groomerSchedules } = useQuery({
    queryKey: ['groomer-schedules', selectedGroomer?.id],
    queryFn: async () => {
      if (!selectedGroomer) return [];
      const { data, error } = await supabase
        .from('groomer_schedules')
        .select('*')
        .eq('groomer_id', selectedGroomer.id);
      
      if (error) throw error;
      return data as GroomerSchedule[];
    },
    enabled: open && step === 'schedule' && !!selectedGroomer,
  });

  // Fetch groomer durations
  const { data: groomerDurations } = useQuery({
    queryKey: ['groomer-durations', selectedGroomer?.id],
    queryFn: async () => {
      if (!selectedGroomer) return [];
      const { data, error } = await supabase
        .from('groomer_service_durations')
        .select('*')
        .eq('groomer_id', selectedGroomer.id);
      
      if (error) throw error;
      return data as GroomerDuration[];
    },
    enabled: open && step === 'schedule' && !!selectedGroomer,
  });

  // Fetch existing reservations for the selected groomer and date
  const { data: existingReservations } = useQuery({
    queryKey: ['groomer-reservations', selectedGroomer?.id, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!selectedGroomer || !selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('reservations')
        .select('id, start_time, end_time')
        .eq('groomer_id', selectedGroomer.id)
        .eq('start_date', dateStr)
        .in('status', ['pending', 'confirmed', 'checked_in']);
      
      if (error) throw error;
      return data;
    },
    enabled: open && step === 'schedule' && !!selectedGroomer && !!selectedDate,
  });

  const isLoading = isLoadingMappings || isLoadingProducts;

  // Check if groomer is available on selected date
  const isGroomerAvailableOnDate = (date: Date): boolean => {
    if (!groomerSchedules) return false;
    const dayOfWeek = date.getDay();
    const schedule = groomerSchedules.find(s => s.day_of_week === dayOfWeek);
    return schedule?.is_available ?? false;
  };

  // Get service duration for selected variant
  const getServiceDuration = (): number => {
    if (!groomerDurations || !selectedProduct || !selectedVariant) return 60;
    
    const productId = selectedProduct.node.id.replace('gid://shopify/Product/', '');
    const variantId = selectedVariant.id.replace('gid://shopify/ProductVariant/', '');
    
    const duration = groomerDurations.find(
      d => d.shopify_product_id === productId && d.shopify_variant_id === variantId
    );
    
    return duration?.duration_minutes ?? 60;
  };

  // Get available time slots for selected date
  const getAvailableTimeSlots = (): string[] => {
    if (!groomerSchedules || !selectedDate) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const schedule = groomerSchedules.find(s => s.day_of_week === dayOfWeek);
    if (!schedule || !schedule.is_available) return [];
    
    const startTime = schedule.start_time.slice(0, 5);
    const endTime = schedule.end_time.slice(0, 5);
    const duration = getServiceDuration();
    
    // Filter time slots within working hours
    const available = TIME_SLOTS.filter(slot => {
      if (slot < startTime) return false;
      
      // Check if service would end before groomer's end time
      const [hours, minutes] = slot.split(':').map(Number);
      const slotMinutes = hours * 60 + minutes;
      const endMinutes = slotMinutes + duration;
      const [endHours, endMins] = endTime.split(':').map(Number);
      const groomerEndMinutes = endHours * 60 + endMins;
      
      if (endMinutes > groomerEndMinutes) return false;
      
      // Check for conflicts with existing reservations
      if (existingReservations) {
        for (const res of existingReservations) {
          if (!res.start_time || !res.end_time) continue;
          
          const resStart = res.start_time.slice(0, 5);
          const resEnd = res.end_time.slice(0, 5);
          const [resStartH, resStartM] = resStart.split(':').map(Number);
          const [resEndH, resEndM] = resEnd.split(':').map(Number);
          const resStartMinutes = resStartH * 60 + resStartM;
          const resEndMinutes = resEndH * 60 + resEndM;
          
          // Check overlap
          if (slotMinutes < resEndMinutes && endMinutes > resStartMinutes) {
            return false;
          }
        }
      }
      
      return true;
    });
    
    return available;
  };

  const formatPrice = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleProductSelect = (product: ShopifyProduct) => {
    setSelectedProduct(product);
    const variants = product.node.variants.edges;
    
    // If only one variant, auto-select and skip to groomer
    if (variants.length === 1) {
      const variant = variants[0].node;
      setSelectedVariant({
        id: variant.id,
        title: variant.title,
        price: variant.price.amount,
      });
      setStep('groomer');
    } else {
      setStep('variant');
    }
  };

  const handleVariantSelect = (variant: {id: string; title: string; price: string}) => {
    setSelectedVariant(variant);
    setStep('groomer');
  };

  const handleGroomerSelect = (groomer: Groomer) => {
    setSelectedGroomer(groomer);
    setStep('schedule');
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('confirm');
  };

  const handleBack = () => {
    switch (step) {
      case 'variant':
        setStep('product');
        setSelectedProduct(null);
        break;
      case 'groomer':
        if (selectedProduct && selectedProduct.node.variants.edges.length > 1) {
          setStep('variant');
          setSelectedVariant(null);
        } else {
          setStep('product');
          setSelectedProduct(null);
          setSelectedVariant(null);
        }
        break;
      case 'schedule':
        setStep('groomer');
        setSelectedGroomer(null);
        setSelectedDate(undefined);
        setSelectedTime(null);
        break;
      case 'confirm':
        setStep('schedule');
        setSelectedTime(null);
        break;
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !selectedVariant || !selectedGroomer || !selectedDate || !selectedTime) {
      return;
    }

    setIsSubmitting(true);
    try {
      const duration = getServiceDuration();
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;

      // Create grooming reservation linked to parent reservation
      const { error } = await supabase
        .from('reservations')
        .insert({
          pet_id: petId,
          service_type: 'grooming',
          status: 'confirmed',
          start_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: `${selectedTime}:00`,
          end_time: endTime,
          groomer_id: selectedGroomer.id,
          price: parseFloat(selectedVariant.price),
          notes: `Service: ${selectedProduct.node.title} | Groom Type: ${selectedVariant.title}`,
          parent_reservation_id: reservationId || null,
        });

      if (error) throw error;

      toast.success(`Grooming service scheduled for ${petName}`);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['groomer-reservations'] });
      
      onServiceAdded?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating service reservation:', error);
      toast.error('Failed to schedule service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const getStepTitle = () => {
    switch (step) {
      case 'product': return 'Select Service';
      case 'variant': return 'Select Option';
      case 'groomer': return 'Select Groomer';
      case 'schedule': return 'Select Date & Time';
      case 'confirm': return 'Confirm Service';
    }
  };

  const availableSlots = getAvailableTimeSlots();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Service for {petName}</DialogTitle>
          <DialogDescription>
            {getStepTitle()}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 px-2 py-3 border-b">
          {['product', 'variant', 'groomer', 'schedule', 'confirm'].map((s, idx) => {
            const stepOrder = ['product', 'variant', 'groomer', 'schedule', 'confirm'];
            const currentIdx = stepOrder.indexOf(step);
            const isActive = stepOrder.indexOf(s) === currentIdx;
            const isPast = stepOrder.indexOf(s) < currentIdx;
            
            // Skip variant step indicator if product has only 1 variant
            if (s === 'variant' && selectedProduct && selectedProduct.node.variants.edges.length <= 1) {
              return null;
            }
            
            return (
              <div key={s} className="flex items-center gap-2">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    isPast ? 'bg-primary' : 
                    isActive ? 'bg-primary animate-pulse' : 
                    'bg-muted-foreground/30'
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col py-4">
          {/* Step: Product Selection */}
          {step === 'product' && (
            isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !serviceProducts || serviceProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No services available</p>
                <p className="text-sm mt-1">
                  Add services to a Shopify collection and categorize it as "Services" in settings.
                </p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-1 gap-3 pr-4">
                  {serviceProducts.map((product) => {
                    const price = product.node.priceRange.minVariantPrice;
                    const imageUrl = product.node.images.edges[0]?.node.url;
                    
                    return (
                      <div 
                        key={product.node.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleProductSelect(product)}
                      >
                        <div className="flex items-center gap-3">
                          {imageUrl && (
                            <img 
                              src={imageUrl} 
                              alt={product.node.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{product.node.title}</p>
                            {product.node.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {product.node.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatPrice(price.amount, price.currencyCode)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )
          )}

          {/* Step: Variant Selection */}
          {step === 'variant' && selectedProduct && (
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 gap-3 pr-4">
                {selectedProduct.node.variants.edges.map((variantEdge) => {
                  const variant = variantEdge.node;
                  
                  return (
                    <div 
                      key={variant.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleVariantSelect({
                        id: variant.id,
                        title: variant.title,
                        price: variant.price.amount,
                      })}
                    >
                      <div>
                        <p className="font-medium">{variant.title}</p>
                        {variant.selectedOptions && variant.selectedOptions.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {variant.selectedOptions.map(o => o.value).join(' / ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatPrice(variant.price.amount, variant.price.currencyCode)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Step: Groomer Selection */}
          {step === 'groomer' && (
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 gap-3 pr-4">
                {groomers?.map((groomer) => (
                  <div 
                    key={groomer.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleGroomerSelect(groomer)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: groomer.color }}
                      >
                        {groomer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{groomer.name}</p>
                        {groomer.email && (
                          <p className="text-xs text-muted-foreground">{groomer.email}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Step: Schedule Selection */}
          {step === 'schedule' && selectedGroomer && (
            <div className="flex flex-col gap-4 overflow-hidden">
              <div className="flex flex-col items-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => 
                    isBefore(date, startOfDay(new Date())) || 
                    !isGroomerAvailableOnDate(date)
                  }
                  className="rounded-md border"
                />
              </div>
              
              {selectedDate && (
                <div className="flex-1 overflow-hidden">
                  <Label className="mb-2 block">Available Times</Label>
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No available time slots for this date
                    </p>
                  ) : (
                    <ScrollArea className="h-[120px]">
                      <div className="grid grid-cols-4 gap-2 pr-4">
                        {availableSlots.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleTimeSelect(time)}
                            className="text-xs"
                          >
                            {formatTime(time)}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-medium">{selectedProduct?.node.title}</p>
                    <p className="text-sm text-muted-foreground">{selectedVariant?.title}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Groomer</p>
                    <p className="font-medium">{selectedGroomer?.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {selectedTime && formatTime(selectedTime)} ({getServiceDuration()} minutes)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg">
                  {selectedVariant && formatPrice(selectedVariant.price, 'CAD')}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          {step !== 'product' ? (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          
          {step === 'confirm' && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Schedule Service
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
