import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { checkPetInactivity, PetLastActivity } from '@/hooks/usePetLastActivity';
import { usePetInactivityDays } from '@/hooks/useSystemSettings';
import { format } from 'date-fns';

interface InactivityAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: string;
  petName: string;
  onProceed: () => void;
  onCancel: () => void;
}

export function InactivityAlertDialog({
  open,
  onOpenChange,
  petId,
  petName,
  onProceed,
  onCancel,
}: InactivityAlertDialogProps) {
  const [activityInfo, setActivityInfo] = useState<PetLastActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const { inactivityDays } = usePetInactivityDays();

  useEffect(() => {
    if (open && petId) {
      setLoading(true);
      checkPetInactivity(petId, inactivityDays).then((info) => {
        setActivityInfo(info);
        setLoading(false);
      });
    }
  }, [open, petId, inactivityDays]);

  const handleProceed = () => {
    onOpenChange(false);
    onProceed();
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancel();
  };

  if (loading) {
    return null;
  }

  // If pet is not inactive, proceed immediately
  if (activityInfo && !activityInfo.isInactive) {
    // Auto-proceed if pet is active
    if (open) {
      handleProceed();
    }
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Pet Inactivity Warning</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              <strong>{petName}</strong> has not had a reservation in a while:
            </p>
            {activityInfo?.lastReservationDate ? (
              <p className="text-foreground">
                Last visit: <strong>{format(new Date(activityInfo.lastReservationDate), 'MMMM d, yyyy')}</strong>
                <br />
                <span className="text-amber-600 font-medium">
                  ({activityInfo.daysSinceLastActivity} days ago)
                </span>
              </p>
            ) : (
              <p className="text-foreground">
                <span className="text-amber-600 font-medium">
                  This pet has no previous reservation history.
                </span>
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-3">
              Please verify the pet's vaccinations and health records are up to date before accepting this reservation.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleProceed}>
            Accept Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
