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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  onAddServices: (services: string[], notes: string) => void;
}

const availableServices = [
  { id: 'bath', label: 'Bath', price: 25 },
  { id: 'nail_trim', label: 'Nail Trim', price: 15 },
  { id: 'ear_cleaning', label: 'Ear Cleaning', price: 10 },
  { id: 'teeth_brushing', label: 'Teeth Brushing', price: 12 },
  { id: 'full_groom', label: 'Full Groom', price: 65 },
  { id: 'deshed_treatment', label: 'De-shed Treatment', price: 35 },
  { id: 'flea_treatment', label: 'Flea Treatment', price: 20 },
  { id: 'nail_grind', label: 'Nail Grind (Dremel)', price: 20 },
];

export function AddServiceDialog({
  open,
  onOpenChange,
  petName,
  onAddServices,
}: AddServiceDialogProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId)
        ? prev.filter(s => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = () => {
    onAddServices(selectedServices, notes);
    setSelectedServices([]);
    setNotes('');
    onOpenChange(false);
  };

  const totalPrice = selectedServices.reduce((sum, serviceId) => {
    const service = availableServices.find(s => s.id === serviceId);
    return sum + (service?.price || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Services for {petName}</DialogTitle>
          <DialogDescription>
            Select additional services to add to this reservation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-3">
            {availableServices.map((service) => (
              <div 
                key={service.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleService(service.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={service.id}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <Label htmlFor={service.id} className="cursor-pointer">
                    {service.label}
                  </Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  ${service.price}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Special Instructions</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions for these services..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {selectedServices.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Total</span>
              <span className="font-bold text-lg">${totalPrice}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedServices.length === 0}
          >
            Add {selectedServices.length} Service{selectedServices.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
