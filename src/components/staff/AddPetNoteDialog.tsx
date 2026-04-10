import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AddPetNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: string;
  petName: string;
  reservationId?: string;
}

export function AddPetNoteDialog({
  open,
  onOpenChange,
  petId,
  petName,
  reservationId,
}: AddPetNoteDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim() || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('pet_notes').insert({
        pet_id: petId,
        note: note.trim(),
        created_by: user.id,
        source_type: 'reservation',
        source_id: reservationId || null,
      });

      if (error) throw error;

      toast({ title: 'Note added successfully' });
      setNote('');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error adding note',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Note for {petName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="pet-note">Note</Label>
          <Textarea
            id="pet-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter a note about this pet for this visit..."
            rows={4}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !note.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
