import { useState, useMemo } from 'react';
import { GroomingAppointment } from '@/pages/staff/StaffGroomingCalendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, User, CheckCircle, XCircle, GripVertical, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const parseGroomingNotes = (notes: string | null): { productTitle: string | null; variantTitle: string | null } => {
  if (!notes) return { productTitle: null, variantTitle: null };
  
  let productTitle: string | null = null;
  let variantTitle: string | null = null;
  
  // Parse "Service: Product Title" format
  const serviceMatch = notes.match(/Service:\s*([^\n|]+)/);
  if (serviceMatch) productTitle = serviceMatch[1].trim();
  
  // Parse "Groom Type: Variant Title" format  
  const groomTypeMatch = notes.match(/Groom Type:\s*([^\n|]+)/);
  if (groomTypeMatch) variantTitle = groomTypeMatch[1].trim();
  
  return { productTitle, variantTitle };
};

interface GroomingAppointmentCellProps {
  appointment: GroomingAppointment;
  groomerColor: string;
  onClick: () => void;
  onDrop: (appointment: GroomingAppointment) => void;
}

export const GroomingAppointmentCell = ({
  appointment,
  groomerColor,
  onClick,
  onDrop,
}: GroomingAppointmentCellProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const { productTitle, variantTitle } = useMemo(
    () => parseGroomingNotes(appointment.notes),
    [appointment.notes]
  );

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(appointment));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleComplete = async () => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'checked_out' })
        .eq('id', appointment.id);

      if (error) throw error;

      // Create Shopify order attributed to groomer's staff account
      try {
        const { data: orderResult, error: orderError } = await supabase.functions.invoke('shopify-create-grooming-order', {
          body: { reservationId: appointment.id },
        });
        if (orderError) {
          console.error('Failed to create Shopify order:', orderError);
        } else if (orderResult?.shopify_order_name) {
          toast({
            title: 'Shopify Order Created',
            description: `Order ${orderResult.shopify_order_name} created for ${appointment.pet_name}`,
          });
        }
      } catch (orderErr) {
        console.error('Failed to create Shopify order:', orderErr);
        // Don't fail the completion if order creation fails
      }

      // Send webhook notification with locked-in payload structure
      try {
        await supabase.functions.invoke('grooming-complete-webhook', {
          body: {
            reservationId: appointment.id,
            petName: appointment.pet_name,
            clientName: appointment.client_name,
            clientPhone: appointment.client_phone || '',
            groomerName: appointment.groomer_name || '',
            serviceType: productTitle || 'Unknown',
            completedAt: new Date().toISOString(),
            notes: appointment.notes || null,
          },
        });
      } catch (webhookError) {
        console.error('Failed to send webhook:', webhookError);
        // Don't fail the completion if webhook fails
      }

      toast({
        title: 'Completed',
        description: `${appointment.pet_name}'s grooming marked as complete`,
      });

      queryClient.invalidateQueries({ queryKey: ['grooming-appointments'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update appointment',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async () => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: 'Cancelled',
        description: `${appointment.pet_name}'s appointment has been cancelled`,
      });

      queryClient.invalidateQueries({ queryKey: ['grooming-appointments'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment',
        variant: 'destructive',
      });
    }
  };

  const getStatusStyles = () => {
    switch (appointment.status) {
      case 'checked_in':
        return 'bg-green-100 dark:bg-green-900/30 border-green-300';
      case 'confirmed':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300';
      case 'checked_out':
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300';
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300';
      default:
        return 'bg-muted border-muted-foreground/20';
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "h-full min-h-[50px] p-2 rounded border-l-4 cursor-grab active:cursor-grabbing transition-all",
        getStatusStyles(),
        isDragging && "opacity-50"
      )}
      style={{ borderLeftColor: groomerColor }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">{appointment.pet_name}</span>
          </div>
          <div className="text-xs text-muted-foreground truncate">{appointment.client_name}</div>
          
          {/* Product and variant display */}
          {(productTitle || variantTitle) ? (
            <div className="mt-1 space-y-0.5">
              {productTitle && (
                <div className="text-xs font-medium text-foreground truncate">{productTitle}</div>
              )}
              {variantTitle && (
                <div className="text-xs text-muted-foreground truncate">{variantTitle}</div>
              )}
            </div>
          ) : (
            <div className="mt-1">
              <Badge variant="secondary" className="text-xs py-0 gap-1">
                <Scissors className="h-3 w-3" />
                Grooming
              </Badge>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
              <User className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            
            {appointment.status !== 'checked_out' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleComplete(); }}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </DropdownMenuItem>
            )}

            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              className="text-destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
