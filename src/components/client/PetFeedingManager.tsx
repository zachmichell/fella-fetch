import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UtensilsCrossed,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FeedingSchedule {
  id: string;
  pet_id: string;
  food_type: string;
  amount: string;
  frequency: string;
  timing: string | null;
  instructions: string | null;
  is_active: boolean;
  created_at: string;
}

interface CareLog {
  id: string;
  administered_at: string;
  amount_given: string | null;
  amount_taken: string | null;
  notes: string | null;
}

interface PetFeedingManagerProps {
  petId: string;
  petName: string;
  onUpdate?: () => void;
}

export const PetFeedingManager = ({
  petId,
  petName,
  onUpdate,
}: PetFeedingManagerProps) => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<FeedingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FeedingSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedScheduleForLogs, setSelectedScheduleForLogs] = useState<FeedingSchedule | null>(null);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [form, setForm] = useState({
    food_type: '',
    amount: '',
    frequency: '',
    timing: '',
    instructions: '',
  });

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('pet_feeding_schedules')
        .select('*')
        .eq('pet_id', petId)
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching feeding schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCareLogs = async (scheduleId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('pet_care_logs')
        .select('id, administered_at, amount_given, amount_taken, notes')
        .eq('pet_id', petId)
        .eq('log_type', 'feeding')
        .eq('reference_id', scheduleId)
        .order('administered_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCareLogs(data || []);
    } catch (error) {
      console.error('Error fetching care logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [petId]);

  const openAddDialog = () => {
    setEditingSchedule(null);
    setForm({ food_type: '', amount: '', frequency: '', timing: '', instructions: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (schedule: FeedingSchedule) => {
    setEditingSchedule(schedule);
    setForm({
      food_type: schedule.food_type,
      amount: schedule.amount,
      frequency: schedule.frequency,
      timing: schedule.timing || '',
      instructions: schedule.instructions || '',
    });
    setDialogOpen(true);
  };

  const openLogsDialog = (schedule: FeedingSchedule) => {
    setSelectedScheduleForLogs(schedule);
    setLogsDialogOpen(true);
    fetchCareLogs(schedule.id);
  };

  const handleSave = async () => {
    if (!form.food_type.trim() || !form.amount.trim() || !form.frequency.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Food type, amount, and frequency are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingSchedule) {
        const { error } = await supabase
          .from('pet_feeding_schedules')
          .update({
            food_type: form.food_type.trim(),
            amount: form.amount.trim(),
            frequency: form.frequency.trim(),
            timing: form.timing.trim() || null,
            instructions: form.instructions.trim() || null,
          })
          .eq('id', editingSchedule.id);

        if (error) throw error;
        toast({ title: 'Feeding schedule updated successfully' });
      } else {
        const { error } = await supabase
          .from('pet_feeding_schedules')
          .insert({
            pet_id: petId,
            food_type: form.food_type.trim(),
            amount: form.amount.trim(),
            frequency: form.frequency.trim(),
            timing: form.timing.trim() || null,
            instructions: form.instructions.trim() || null,
          });

        if (error) throw error;
        toast({ title: 'Feeding schedule added successfully' });
      }

      setDialogOpen(false);
      fetchSchedules();
      onUpdate?.();
    } catch (error) {
      console.error('Error saving feeding schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save feeding schedule',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('pet_feeding_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Feeding schedule removed' });
      fetchSchedules();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting feeding schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove feeding schedule',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Feeding Schedule
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openAddDialog} className="gap-1 h-7">
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No feeding schedule added yet
            </p>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`p-3 rounded-lg border ${
                    schedule.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{schedule.food_type}</p>
                        {!schedule.is_active && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {schedule.amount} • {schedule.frequency}
                      </p>
                      {schedule.timing && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> {schedule.timing}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openLogsDialog(schedule)}
                        className="h-7 w-7 p-0"
                        title="View feeding log"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(schedule)}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(schedule.id)}
                        disabled={deleting === schedule.id}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        {deleting === schedule.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {schedule.instructions && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      {schedule.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Feeding Schedule' : 'Add Feeding Schedule'}
            </DialogTitle>
            <DialogDescription>
              {editingSchedule
                ? `Update feeding details`
                : `Add feeding instructions for ${petName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="feed-type">Food Type *</Label>
              <Input
                id="feed-type"
                value={form.food_type}
                onChange={(e) => setForm({ ...form, food_type: e.target.value })}
                placeholder="e.g., Blue Buffalo Adult Chicken"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="feed-amount">Amount *</Label>
                <Input
                  id="feed-amount"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g., 1 cup"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="feed-frequency">Frequency *</Label>
                <Input
                  id="feed-frequency"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  placeholder="e.g., Twice daily"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feed-timing">Timing</Label>
              <Input
                id="feed-timing"
                value={form.timing}
                onChange={(e) => setForm({ ...form, timing: e.target.value })}
                placeholder="e.g., 7am and 6pm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feed-instructions">Special Instructions</Label>
              <Textarea
                id="feed-instructions"
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="Any special instructions (allergies, mixing with water, etc.)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSchedule ? 'Save Changes' : 'Add Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Care Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Feeding Log
            </DialogTitle>
            <DialogDescription>
              {selectedScheduleForLogs?.food_type} - {selectedScheduleForLogs?.amount}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : careLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No feeding records yet
              </p>
            ) : (
              <div className="space-y-3">
                {careLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {format(new Date(log.administered_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {log.amount_taken && (
                        <Badge variant="outline" className="text-xs">
                          {log.amount_taken}
                        </Badge>
                      )}
                    </div>
                    {log.amount_given && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Given: {log.amount_given}
                      </p>
                    )}
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
