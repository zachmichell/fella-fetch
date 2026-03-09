import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { addWeeks, format } from 'date-fns';

interface Props {
  reservation: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignGroomLevelDialog({ reservation, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [groomLevel, setGroomLevel] = useState<string>(
    reservation.pets?.groom_level?.toString() || ''
  );
  const [notes, setNotes] = useState('');

  // Get expiration weeks setting
  const { data: expirationWeeks } = useQuery({
    queryKey: ['groom-level-expiration-weeks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'groom_level_expiration_weeks')
        .maybeSingle();
      return (data?.value as number) || 8;
    },
  });

  const completeAndAssign = useMutation({
    mutationFn: async () => {
      const weeks = expirationWeeks || 8;
      const level = parseInt(groomLevel);
      const expirationDate = format(addWeeks(new Date(), weeks), 'yyyy-MM-dd');

      // Update pet groom level
      const { error: petError } = await supabase
        .from('pets')
        .update({
          groom_level: level,
          level_expiration_date: expirationDate,
          last_grooming_date: format(new Date(), 'yyyy-MM-dd'),
        })
        .eq('id', reservation.pet_id);
      if (petError) throw petError;

      // Update reservation status to checked_out
      const { error: resError } = await supabase
        .from('reservations')
        .update({
          status: 'checked_out' as any,
          checked_out_at: new Date().toISOString(),
          notes: notes ? `${reservation.notes || ''}\n[Groomer Note] ${notes}`.trim() : reservation.notes,
        })
        .eq('id', reservation.id);
      if (resError) throw resError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groomer-reservations'] });
      toast({ title: 'Appointment Completed', description: `Groom level ${groomLevel} assigned. Expires in ${expirationWeeks || 8} weeks.` });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Appointment & Assign Groom Level</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Pet: <span className="font-medium text-foreground">{reservation.pets?.name}</span>
              {reservation.pets?.breed && ` (${reservation.pets.breed})`}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Groom Level</Label>
            <Select value={groomLevel} onValueChange={setGroomLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select level..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 — Well maintained</SelectItem>
                <SelectItem value="2">Level 2 — Minor tangles</SelectItem>
                <SelectItem value="3">Level 3 — Matted</SelectItem>
                <SelectItem value="4">Level 4 — Severely matted</SelectItem>
              </SelectContent>
            </Select>
            {groomLevel && (
              <p className="text-xs text-muted-foreground">
                Expires: {format(addWeeks(new Date(), expirationWeeks || 8), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any notes about the groom..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => completeAndAssign.mutate()}
            disabled={!groomLevel || completeAndAssign.isPending}
          >
            {completeAndAssign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Complete & Assign Level
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
