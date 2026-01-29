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
  Pill,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Medication {
  id: string;
  pet_id: string;
  name: string;
  dosage: string;
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

interface PetMedicationsManagerProps {
  petId: string;
  petName: string;
  onUpdate?: () => void;
}

export const PetMedicationsManager = ({
  petId,
  petName,
  onUpdate,
}: PetMedicationsManagerProps) => {
  const { toast } = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedMedForLogs, setSelectedMedForLogs] = useState<Medication | null>(null);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    timing: '',
    instructions: '',
  });

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('pet_medications')
        .select('*')
        .eq('pet_id', petId)
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCareLogs = async (medicationId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('pet_care_logs')
        .select('id, administered_at, amount_given, amount_taken, notes')
        .eq('pet_id', petId)
        .eq('log_type', 'medication')
        .eq('reference_id', medicationId)
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
    fetchMedications();
  }, [petId]);

  const openAddDialog = () => {
    setEditingMed(null);
    setForm({ name: '', dosage: '', frequency: '', timing: '', instructions: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (med: Medication) => {
    setEditingMed(med);
    setForm({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      timing: med.timing || '',
      instructions: med.instructions || '',
    });
    setDialogOpen(true);
  };

  const openLogsDialog = (med: Medication) => {
    setSelectedMedForLogs(med);
    setLogsDialogOpen(true);
    fetchCareLogs(med.id);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.dosage.trim() || !form.frequency.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name, dosage, and frequency are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingMed) {
        const { error } = await supabase
          .from('pet_medications')
          .update({
            name: form.name.trim(),
            dosage: form.dosage.trim(),
            frequency: form.frequency.trim(),
            timing: form.timing.trim() || null,
            instructions: form.instructions.trim() || null,
          })
          .eq('id', editingMed.id);

        if (error) throw error;
        toast({ title: 'Medication updated successfully' });
      } else {
        const { error } = await supabase
          .from('pet_medications')
          .insert({
            pet_id: petId,
            name: form.name.trim(),
            dosage: form.dosage.trim(),
            frequency: form.frequency.trim(),
            timing: form.timing.trim() || null,
            instructions: form.instructions.trim() || null,
          });

        if (error) throw error;
        toast({ title: 'Medication added successfully' });
      }

      setDialogOpen(false);
      fetchMedications();
      onUpdate?.();
    } catch (error) {
      console.error('Error saving medication:', error);
      toast({
        title: 'Error',
        description: 'Failed to save medication',
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
        .from('pet_medications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Medication removed' });
      fetchMedications();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting medication:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove medication',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (med: Medication) => {
    try {
      const { error } = await supabase
        .from('pet_medications')
        .update({ is_active: !med.is_active })
        .eq('id', med.id);

      if (error) throw error;
      fetchMedications();
    } catch (error) {
      console.error('Error toggling medication:', error);
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
              <Pill className="h-4 w-4" />
              Medications
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openAddDialog} className="gap-1 h-7">
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {medications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No medications added yet
            </p>
          ) : (
            <div className="space-y-3">
              {medications.map((med) => (
                <div
                  key={med.id}
                  className={`p-3 rounded-lg border ${
                    med.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{med.name}</p>
                        {!med.is_active && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {med.dosage} • {med.frequency}
                      </p>
                      {med.timing && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> {med.timing}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openLogsDialog(med)}
                        className="h-7 w-7 p-0"
                        title="View administration log"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(med)}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(med.id)}
                        disabled={deleting === med.id}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        {deleting === med.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {med.instructions && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      {med.instructions}
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
              {editingMed ? 'Edit Medication' : 'Add Medication'}
            </DialogTitle>
            <DialogDescription>
              {editingMed
                ? `Update ${editingMed.name} details`
                : `Add a new medication for ${petName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="med-name">Medication Name *</Label>
              <Input
                id="med-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Apoquel"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="med-dosage">Dosage *</Label>
                <Input
                  id="med-dosage"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  placeholder="e.g., 16mg"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="med-frequency">Frequency *</Label>
                <Input
                  id="med-frequency"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  placeholder="e.g., Twice daily"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="med-timing">Timing</Label>
              <Input
                id="med-timing"
                value={form.timing}
                onChange={(e) => setForm({ ...form, timing: e.target.value })}
                placeholder="e.g., Morning and evening with food"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="med-instructions">Special Instructions</Label>
              <Textarea
                id="med-instructions"
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="Any special instructions for administering this medication"
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
              {editingMed ? 'Save Changes' : 'Add Medication'}
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
              Administration Log
            </DialogTitle>
            <DialogDescription>
              {selectedMedForLogs?.name} - {selectedMedForLogs?.dosage}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : careLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No administration records yet
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
