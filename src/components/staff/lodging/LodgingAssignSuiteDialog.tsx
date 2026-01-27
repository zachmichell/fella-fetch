import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BoardingReservation } from '@/pages/staff/StaffLodgingCalendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BedDouble } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Suite {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
}

interface LodgingAssignSuiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: BoardingReservation | null;
}

export const LodgingAssignSuiteDialog = ({
  open,
  onOpenChange,
  reservation,
}: LodgingAssignSuiteDialogProps) => {
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch suites
  const { data: suites, isLoading } = useQuery({
    queryKey: ['suites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suites')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Suite[];
    },
  });

  const handleAssign = async () => {
    if (!reservation || !selectedSuiteId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ suite_id: selectedSuiteId })
        .eq('id', reservation.id);

      if (error) throw error;

      const suite = suites?.find(s => s.id === selectedSuiteId);
      toast({
        title: 'Suite assigned',
        description: `${reservation.pet_name} assigned to ${suite?.name || 'suite'}`,
      });

      queryClient.invalidateQueries({ queryKey: ['boarding-reservations'] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign suite',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAssignment = async () => {
    if (!reservation) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ suite_id: null })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({
        title: 'Suite removed',
        description: `${reservation.pet_name} is now unassigned`,
      });

      queryClient.invalidateQueries({ queryKey: ['boarding-reservations'] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove suite assignment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="h-5 w-5" />
            {reservation.suite_id ? 'Move to Different Suite' : 'Assign Suite'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select a suite for <span className="font-medium">{reservation.pet_name}</span>
          </p>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <RadioGroup
              value={selectedSuiteId}
              onValueChange={setSelectedSuiteId}
              className="space-y-2"
            >
              {suites?.map((suite) => (
                <div
                  key={suite.id}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                    selectedSuiteId === suite.id && "border-primary bg-primary/5",
                    suite.id === reservation.suite_id && "border-green-500 bg-green-50 dark:bg-green-900/20"
                  )}
                  onClick={() => setSelectedSuiteId(suite.id)}
                >
                  <RadioGroupItem value={suite.id} id={suite.id} />
                  <Label htmlFor={suite.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{suite.name}</div>
                        {suite.description && (
                          <div className="text-sm text-muted-foreground">{suite.description}</div>
                        )}
                      </div>
                      {suite.id === reservation.suite_id && (
                        <span className="text-xs text-green-600 dark:text-green-400">Current</span>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {reservation.suite_id && (
            <Button
              variant="outline"
              onClick={handleRemoveAssignment}
              disabled={isSubmitting}
              className="text-red-600 hover:text-red-700"
            >
              Remove Assignment
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isSubmitting || !selectedSuiteId || selectedSuiteId === reservation.suite_id}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign Suite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
