import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BoardingReservation } from '@/pages/staff/StaffLodgingCalendar';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { PetTraitBadges } from '@/components/staff/PetTraitBadges';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, BedDouble, FileText, Clock } from 'lucide-react';

interface LodgingPetDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: BoardingReservation | null;
}

export const LodgingPetDetailsDialog = ({
  open,
  onOpenChange,
  reservation,
}: LodgingPetDetailsDialogProps) => {
  // Fetch pet traits
  const { data: traits } = useQuery({
    queryKey: ['pet-traits', reservation?.pet_id],
    queryFn: async () => {
      if (!reservation?.pet_id) return [];
      
      const { data, error } = await supabase
        .from('pet_traits')
        .select('*')
        .eq('pet_id', reservation.pet_id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!reservation?.pet_id,
  });

  // Fetch suite info
  const { data: suite } = useQuery({
    queryKey: ['suite', reservation?.suite_id],
    queryFn: async () => {
      if (!reservation?.suite_id) return null;
      
      const { data, error } = await supabase
        .from('suites')
        .select('*')
        .eq('id', reservation.suite_id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!reservation?.suite_id,
  });

  if (!reservation) return null;

  const startDate = parseISO(reservation.start_date);
  const endDate = reservation.end_date ? parseISO(reservation.end_date) : null;
  const nights = endDate ? differenceInDays(endDate, startDate) : 0;

  const getStatusBadge = () => {
    switch (reservation.status) {
      case 'checked_in':
        return <Badge className="bg-green-500">Checked In</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500">Confirmed</Badge>;
      case 'checked_out':
        return <Badge variant="secondary">Checked Out</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{reservation.status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{reservation.pet_name}</span>
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pet Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{reservation.client_name}</span>
            {reservation.pet_breed && (
              <>
                <span>•</span>
                <span>{reservation.pet_breed}</span>
              </>
            )}
          </div>

          {/* Traits */}
          {traits && traits.length > 0 && (
            <div>
              <PetTraitBadges traits={traits} />
            </div>
          )}

          <Separator />

          {/* Stay Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {format(startDate, 'MMM d')}
                  {endDate && ` - ${format(endDate, 'MMM d, yyyy')}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : 'Day visit'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {suite ? suite.name : 'No suite assigned'}
                </div>
                {suite?.description && (
                  <div className="text-sm text-muted-foreground">{suite.description}</div>
                )}
              </div>
            </div>

            {reservation.checked_in_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm">
                    Checked in: {format(parseISO(reservation.checked_in_at), 'MMM d, h:mm a')}
                  </div>
                  {reservation.checked_out_at && (
                    <div className="text-sm">
                      Checked out: {format(parseISO(reservation.checked_out_at), 'MMM d, h:mm a')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {reservation.notes && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">{reservation.notes}</div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
