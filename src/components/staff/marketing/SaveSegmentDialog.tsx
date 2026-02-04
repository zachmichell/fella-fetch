import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FilterCondition } from './MarketingFilterBuilder';

interface SaveSegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterCondition[];
  onSaved: () => void;
}

export const SaveSegmentDialog = ({
  open,
  onOpenChange,
  filters,
  onSaved,
}: SaveSegmentDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this segment',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('marketing_segments')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          filters: filters as any,
          is_preset: false,
        });

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Segment saved successfully',
      });

      setName('');
      setDescription('');
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save segment',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Segment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Segment Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Lapsed Grooming Clients"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this segment targets..."
              rows={3}
            />
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-2">Filters ({filters.length}):</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {filters.map((filter, i) => (
                <li key={i}>
                  {filter.field.replace(/_/g, ' ')} {filter.operator} {filter.value}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Segment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
