import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  UtensilsCrossed,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  History,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string | null;
  instructions: string | null;
  is_active: boolean;
}

interface FeedingSchedule {
  id: string;
  food_type: string;
  amount: string;
  frequency: string;
  timing: string | null;
  instructions: string | null;
  is_active: boolean;
}

interface CareLog {
  id: string;
  log_type: string;
  reference_id: string;
  administered_at: string;
  amount_given: string | null;
  amount_taken: string | null;
  notes: string | null;
}

interface StaffPetCareLoggerProps {
  petId: string;
  petName: string;
  reservationId?: string;
}

export const StaffPetCareLogger = ({
  petId,
  petName,
  reservationId,
}: StaffPetCareLoggerProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [feedingSchedules, setFeedingSchedules] = useState<FeedingSchedule[]>([]);
  const [recentLogs, setRecentLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'medication' | 'feeding'; item: Medication | FeedingSchedule } | null>(null);
  const [saving, setSaving] = useState(false);

  const [logForm, setLogForm] = useState({
    amount_given: '',
    amount_taken: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [medsRes, feedRes, logsRes] = await Promise.all([
        supabase
          .from('pet_medications')
          .select('id, name, dosage, frequency, timing, instructions, is_active')
          .eq('pet_id', petId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('pet_feeding_schedules')
          .select('id, food_type, amount, frequency, timing, instructions, is_active')
          .eq('pet_id', petId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('pet_care_logs')
          .select('id, log_type, reference_id, administered_at, amount_given, amount_taken, notes')
          .eq('pet_id', petId)
          .order('administered_at', { ascending: false })
          .limit(10),
      ]);

      if (medsRes.error) throw medsRes.error;
      if (feedRes.error) throw feedRes.error;
      if (logsRes.error) throw logsRes.error;

      setMedications(medsRes.data || []);
      setFeedingSchedules(feedRes.data || []);
      setRecentLogs(logsRes.data || []);
    } catch (error) {
      console.error('Error fetching care data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [petId]);

  const openLogDialog = (type: 'medication' | 'feeding', item: Medication | FeedingSchedule) => {
    setSelectedItem({ type, item });
    setLogForm({
      amount_given: type === 'medication' ? (item as Medication).dosage : (item as FeedingSchedule).amount,
      amount_taken: '',
      notes: '',
    });
    setLogDialogOpen(true);
  };

  const handleLogAdministration = async () => {
    if (!selectedItem || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('pet_care_logs')
        .insert({
          pet_id: petId,
          log_type: selectedItem.type,
          reference_id: selectedItem.item.id,
          administered_by: user.id,
          amount_given: logForm.amount_given.trim() || null,
          amount_taken: logForm.amount_taken.trim() || null,
          notes: logForm.notes.trim() || null,
          reservation_id: reservationId || null,
        });

      if (error) throw error;

      toast({
        title: 'Logged Successfully',
        description: `${selectedItem.type === 'medication' ? 'Medication' : 'Feeding'} administration recorded`,
      });

      setLogDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error logging administration:', error);
      toast({
        title: 'Error',
        description: 'Failed to log administration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getItemName = (log: CareLog) => {
    if (log.log_type === 'medication') {
      const med = medications.find(m => m.id === log.reference_id);
      return med?.name || 'Unknown medication';
    } else {
      const feed = feedingSchedules.find(f => f.id === log.reference_id);
      return feed?.food_type || 'Unknown feeding';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasMedications = medications.length > 0;
  const hasFeedingSchedules = feedingSchedules.length > 0;

  if (!hasMedications && !hasFeedingSchedules) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p className="text-sm">No medications or feeding schedules set up for {petName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Medications */}
        {hasMedications && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {medications.map((med) => (
                <div
                  key={med.id}
                  className="p-3 rounded-lg border bg-background flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{med.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {med.dosage} • {med.frequency}
                    </p>
                    {med.timing && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {med.timing}
                      </p>
                    )}
                    {med.instructions && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{med.instructions}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openLogDialog('medication', med)}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Log
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Feeding Schedules */}
        {hasFeedingSchedules && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Feeding Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {feedingSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="p-3 rounded-lg border bg-background flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{schedule.food_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {schedule.amount} • {schedule.frequency}
                    </p>
                    {schedule.timing && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {schedule.timing}
                      </p>
                    )}
                    {schedule.instructions && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{schedule.instructions}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openLogDialog('feeding', schedule)}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Log
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="p-2 rounded border bg-muted/30 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {log.log_type === 'medication' ? (
                            <Pill className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <UtensilsCrossed className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="font-medium">{getItemName(log)}</span>
                        </div>
                        {log.amount_taken && (
                          <Badge variant="outline" className="text-xs">
                            {log.amount_taken}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(log.administered_at), 'MMM d, h:mm a')}
                        {log.notes && ` • ${log.notes}`}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Log Administration Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Log {selectedItem?.type === 'medication' ? 'Medication' : 'Feeding'}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.type === 'medication'
                ? `${(selectedItem.item as Medication).name} - ${(selectedItem.item as Medication).dosage}`
                : `${(selectedItem?.item as FeedingSchedule)?.food_type} - ${(selectedItem?.item as FeedingSchedule)?.amount}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount-given">Amount Given</Label>
              <Input
                id="amount-given"
                value={logForm.amount_given}
                onChange={(e) => setLogForm({ ...logForm, amount_given: e.target.value })}
                placeholder="e.g., 1 tablet, 1 cup"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount-taken">Amount Taken / Consumed</Label>
              <Input
                id="amount-taken"
                value={logForm.amount_taken}
                onChange={(e) => setLogForm({ ...logForm, amount_taken: e.target.value })}
                placeholder="e.g., All, Half, None"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="log-notes">Notes</Label>
              <Textarea
                id="log-notes"
                value={logForm.notes}
                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                placeholder="Any observations or issues..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogAdministration} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Administration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
