import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroomingAppointment } from '@/pages/staff/StaffGroomingCalendar';
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
import { Scissors, User, Clock, Calendar, FileText, UserCircle } from 'lucide-react';
import { useState } from 'react';

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

  // Sync selected groomer when dialog opens
  if (open && appointment && selectedGroomerId === null) {
    setSelectedGroomerId(appointment.groomer_id);
  }

  const handleAssignGroomer = async () => {
    if (!appointment || selectedGroomerId === appointment.groomer_id) return;

    try {
      const { error } = await supabase
        .from('reservations')
        .update({ groomer_id: selectedGroomerId })
        .eq('id', appointment.id);

      if (error) throw error;

      const groomerName = groomers?.find(g => g.id === selectedGroomerId)?.name || 'Unassigned';
      toast({
        title: 'Groomer assigned',
        description: `${appointment.pet_name} assigned to ${groomerName}`,
      });

      queryClient.invalidateQueries({ queryKey: ['grooming-appointments'] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign groomer',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setSelectedGroomerId(null);
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

          {/* Notes */}
          {appointment.notes && (
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Notes / Add-ons</div>
                <div className="text-sm">{appointment.notes}</div>
              </div>
            </div>
          )}

          <Separator />

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
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {selectedGroomerId !== appointment.groomer_id && (
            <Button onClick={handleAssignGroomer}>
              Update Groomer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
