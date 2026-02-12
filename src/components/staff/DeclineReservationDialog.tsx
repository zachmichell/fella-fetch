import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTurnAwayReasons } from '@/hooks/useTurnAwayReasons';

interface DeclineReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  serviceType: string;
  onConfirm: (reason: string) => void;
}

export function DeclineReservationDialog({
  open,
  onOpenChange,
  petName,
  serviceType,
  onConfirm,
}: DeclineReservationDialogProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const { reasons } = useTurnAwayReasons();

  const handleConfirm = () => {
    const fullReason = notes.trim() ? `${reason} - ${notes.trim()}` : reason;
    onConfirm(fullReason);
    setReason('');
    setNotes('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
      setNotes('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Decline Reservation</DialogTitle>
          <DialogDescription>
            You are about to decline the {serviceType} reservation for <strong>{petName}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Reason for declining</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {reasons.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="decline-notes">Additional notes (optional)</Label>
            <Textarea
              id="decline-notes"
              placeholder="Add any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!reason}
          >
            Decline Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
