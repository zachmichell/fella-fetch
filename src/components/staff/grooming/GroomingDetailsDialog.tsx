import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroomingAppointment } from '@/pages/staff/StaffGroomingCalendar';
import { storefrontApiRequest } from '@/lib/shopify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Scissors, User, Clock, Calendar, FileText, UserCircle, ChevronDown, ChevronUp, Tag, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PetGroomingPreferencesEditor } from './PetGroomingPreferencesEditor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface GroomingVariant {
  id: string;
  title: string;
  price: string;
}

interface GroomingProduct {
  id: string;
  title: string;
  variants: GroomingVariant[];
}

interface GroomingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: GroomingAppointment | null;
}

export const GroomingDetailsDialog = ({
  open,
  onOpenChange,
  appointment,
}: GroomingDetailsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroomerId, setSelectedGroomerId] = useState<string | null>(null);
  const [selectedVariantTitle, setSelectedVariantTitle] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Parse groom type from notes
  const parseGroomType = (notes: string | null): string | null => {
    if (!notes) return null;
    const match = notes.match(/Groom Type:\s*([^|]+)/i);
    return match ? match[1].trim() : null;
  };

  // Parse service name from notes
  const parseServiceName = (notes: string | null): string | null => {
    if (!notes) return null;
    const match = notes.match(/Service:\s*([^|]+)/i);
    return match ? match[1].trim() : null;
  };

  // Fetch groomers
  const { data: groomers } = useQuery({
    queryKey: ['groomers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Get the product name from the appointment notes
  const currentProductName = parseServiceName(appointment?.notes);

  // Fetch variants for the current product from Shopify
  const { data: productVariants, isLoading: variantsLoading } = useQuery({
    queryKey: ['grooming-product-variants', currentProductName],
    queryFn: async () => {
      if (!currentProductName) return [];
      
      // Fetch groom products and find the one matching our service name
      const query = `
        query GetGroomProducts {
          products(first: 50, query: "product_type:Groom") {
            edges {
              node {
                id
                title
                variants(first: 50) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await storefrontApiRequest(query, {});
      if (!response?.data?.products?.edges) return [];
      
      // Find the product that matches the service name
      const matchingProduct = response.data.products.edges.find(
        (edge: any) => edge.node.title.toLowerCase() === currentProductName.toLowerCase()
      );
      
      if (!matchingProduct) return [];
      
      return matchingProduct.node.variants.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        price: edge.node.price.amount,
      }));
    },
    enabled: open && !!currentProductName,
  });


  // Sync state when dialog opens
  useEffect(() => {
    if (open && appointment) {
      setSelectedGroomerId(appointment.groomer_id);
      setSelectedVariantTitle(parseGroomType(appointment.notes));
    }
  }, [open, appointment]);

  const handleUpdate = async () => {
    if (!appointment) return;

    const hasGroomerChange = selectedGroomerId !== appointment.groomer_id;
    const currentGroomType = parseGroomType(appointment.notes);
    const hasVariantChange = selectedVariantTitle !== currentGroomType;

    if (!hasGroomerChange && !hasVariantChange) return;

    setIsUpdating(true);
    try {
      const updates: Record<string, any> = {};

      if (hasGroomerChange) {
        updates.groomer_id = selectedGroomerId;
      }

      if (hasVariantChange) {
        // Update the notes with the new groom type
        let newNotes = appointment.notes || '';
        
        if (currentGroomType) {
          // Replace existing groom type
          newNotes = newNotes.replace(/Groom Type:\s*[^|]+\s*\|?/i, '').trim();
        }
        
        // Add new groom type at the beginning
        if (selectedVariantTitle) {
          newNotes = `Groom Type: ${selectedVariantTitle}${newNotes ? ' | ' + newNotes : ''}`;
        }
        
        updates.notes = newNotes.replace(/\|\s*$/, '').trim();
      }

      const { error } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', appointment.id);

      if (error) throw error;

      const messages: string[] = [];
      if (hasGroomerChange) {
        const groomerName = groomers?.find(g => g.id === selectedGroomerId)?.name || 'Unassigned';
        messages.push(`Groomer: ${groomerName}`);
      }
      if (hasVariantChange) {
        messages.push(`Groom type: ${selectedVariantTitle || 'Removed'}`);
      }

      toast({
        title: 'Appointment updated',
        description: messages.join(', '),
      });

      queryClient.invalidateQueries({ queryKey: ['grooming-appointments'] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update appointment',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setSelectedGroomerId(null);
    setSelectedVariantTitle(null);
    onOpenChange(false);
  };

  if (!appointment) return null;

  const currentGroomer = groomers?.find(g => g.id === appointment.groomer_id);

  const getStatusBadge = () => {
    switch (appointment.status) {
      case 'checked_in':
        return <Badge className="bg-green-500">In Progress</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500">Confirmed</Badge>;
      case 'checked_out':
        return <Badge variant="secondary">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500">Pending</Badge>;
      default:
        return <Badge variant="outline">{appointment.status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Grooming Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pet & Client Info */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{appointment.pet_name}</h3>
              <p className="text-sm text-muted-foreground">{appointment.pet_breed || 'Unknown breed'}</p>
              <p className="text-sm text-muted-foreground">Owner: {appointment.client_name}</p>
            </div>
            {getStatusBadge()}
          </div>

          <Separator />

          {/* Appointment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="font-medium">
                  {format(parseISO(appointment.start_date), 'PPP')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Time</div>
                <div className="font-medium">
                  {appointment.start_time 
                    ? format(parseISO(`2000-01-01T${appointment.start_time}`), 'h:mm a')
                    : 'Not set'}
                  {appointment.end_time && (
                    <> - {format(parseISO(`2000-01-01T${appointment.end_time}`), 'h:mm a')}</>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Current Groomer */}
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Groomer</div>
              <div className="font-medium flex items-center gap-2">
                {currentGroomer ? (
                  <>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: currentGroomer.color }}
                    />
                    {currentGroomer.name}
                  </>
                ) : (
                  <span className="text-amber-600">Unassigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Requested Groom Type */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Requested Groom Type</div>
              <div className="font-medium">
                {parseGroomType(appointment.notes) || (
                  <span className="text-muted-foreground italic">Not specified</span>
                )}
              </div>
              {parseServiceName(appointment.notes) && (
                <div className="text-xs text-muted-foreground">
                  {parseServiceName(appointment.notes)}
                </div>
              )}
            </div>
          </div>

          {/* Notes (without groom type since it's shown separately) */}
          {appointment.notes && (
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Notes</div>
                <div className="text-sm">
                  {appointment.notes
                    .replace(/Groom Type:\s*[^|]+\s*\|?/i, '')
                    .replace(/Service:\s*[^|]+\s*\|?/i, '')
                    .replace(/\|\s*$/, '')
                    .trim() || 'No additional notes'}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Change Groom Type */}
          <div className="space-y-2">
            <Label>Change Groom Type {currentProductName && <span className="text-muted-foreground font-normal">({currentProductName})</span>}</Label>
            {!currentProductName ? (
              <p className="text-sm text-muted-foreground italic">No service specified for this appointment</p>
            ) : variantsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading options...
              </div>
            ) : productVariants && productVariants.length > 0 ? (
              <Select 
                value={selectedVariantTitle || '__none__'} 
                onValueChange={(v) => setSelectedVariantTitle(v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select groom type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  {productVariants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.title}>
                      {variant.title} - ${parseFloat(variant.price).toFixed(0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground italic">No variants found</p>
            )}
          </div>

          {/* Assign/Reassign Groomer */}
          <div className="space-y-2">
            <Label>Assign Groomer</Label>
            <Select 
              value={selectedGroomerId || ''} 
              onValueChange={(v) => setSelectedGroomerId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select groomer..." />
              </SelectTrigger>
              <SelectContent>
                {groomers?.map((groomer) => (
                  <SelectItem key={groomer.id} value={groomer.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: groomer.color }}
                      />
                      {groomer.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Pet Grooming Preferences (Collapsible) */}
          <Collapsible open={prefsOpen} onOpenChange={setPrefsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Scissors className="h-4 w-4" />
                  Set Grooming Preferences for {appointment.pet_name}
                </span>
                {prefsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <PetGroomingPreferencesEditor
                petId={appointment.pet_id}
                petName={appointment.pet_name}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {(selectedGroomerId !== appointment.groomer_id || 
            selectedVariantTitle !== parseGroomType(appointment.notes)) && (
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
