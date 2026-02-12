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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CreditCard, Ban } from 'lucide-react';

interface CancelReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  serviceType: string;
  daycareCredits: number;
  boardingCredits: number;
  onConfirm: (useCredit: boolean, reason: string) => void;
}

export function CancelReservationDialog({
  open,
  onOpenChange,
  petName,
  serviceType,
  daycareCredits,
  boardingCredits,
  onConfirm,
}: CancelReservationDialogProps) {
  const [useCredit, setUseCredit] = useState<'yes' | 'no'>('no');
  const [reason, setReason] = useState('');

  const relevantCredits = serviceType === 'boarding' ? boardingCredits : daycareCredits;
  const creditType = serviceType === 'boarding' ? 'boarding' : 'daycare';
  const hasCredits = relevantCredits > 0;

  const handleConfirm = () => {
    onConfirm(useCredit === 'yes', reason.trim());
    onOpenChange(false);
    setUseCredit('no');
    setReason('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setUseCredit('no');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Reservation
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the reservation for{' '}
            <span className="font-medium text-foreground">{petName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancellation</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Enter the reason for cancelling this reservation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {(serviceType === 'daycare' || serviceType === 'boarding') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  Available {creditType} credits:
                </span>
                <span className={`text-lg font-bold ${hasCredits ? 'text-primary' : 'text-destructive'}`}>
                  {relevantCredits}
                </span>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Would you like to use a credit for this cancellation?
                </Label>
                <RadioGroup
                  value={useCredit}
                  onValueChange={(v) => setUseCredit(v as 'yes' | 'no')}
                  className="space-y-2"
                >
                  <div 
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      useCredit === 'yes' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => hasCredits && setUseCredit('yes')}
                  >
                    <RadioGroupItem 
                      value="yes" 
                      id="use-credit" 
                      disabled={!hasCredits}
                    />
                    <Label 
                      htmlFor="use-credit" 
                      className={`flex items-center gap-2 cursor-pointer flex-1 ${!hasCredits ? 'opacity-50' : ''}`}
                    >
                      <CreditCard className="h-4 w-4 text-primary" />
                      <div>
                        <span className="font-medium">Yes, use a credit</span>
                        <p className="text-xs text-muted-foreground">
                          {hasCredits 
                            ? `Deduct 1 from ${creditType} credits (${relevantCredits} → ${relevantCredits - 1})`
                            : `No ${creditType} credits available`
                          }
                        </p>
                      </div>
                    </Label>
                  </div>

                  <div 
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      useCredit === 'no' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setUseCredit('no')}
                  >
                    <RadioGroupItem value="no" id="no-credit" />
                    <Label htmlFor="no-credit" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Ban className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">No, don't use a credit</span>
                        <p className="text-xs text-muted-foreground">
                          Cancel without deducting credits
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {serviceType !== 'daycare' && serviceType !== 'boarding' && (
            <p className="text-sm text-muted-foreground">
              This {serviceType} reservation will be cancelled. Credits do not apply to this service type.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Keep Reservation
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            Cancel Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
