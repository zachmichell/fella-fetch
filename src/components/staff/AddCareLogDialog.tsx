import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StaffPetCareLogger } from './StaffPetCareLogger';

interface AddCareLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: string;
  petName: string;
  reservationId?: string;
}

export function AddCareLogDialog({
  open,
  onOpenChange,
  petId,
  petName,
  reservationId,
}: AddCareLogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Log Care for {petName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <StaffPetCareLogger
            petId={petId}
            petName={petName}
            reservationId={reservationId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
