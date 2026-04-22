import { useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, LogIn, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, formatDistanceStrict } from 'date-fns';

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number | null;
  notes: string | null;
}

const formatDuration = (start: string, end: string) => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
};

const StaffTimeClock = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [recent, setRecent] = useState<TimeEntry[]>([]);
  const [now, setNow] = useState(new Date());
  const [breakMinutes, setBreakMinutes] = useState<string>('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_time_clock')
      .select('*')
      .eq('user_id', user.id)
      .order('clock_in', { ascending: false })
      .limit(20);
    if (error) {
      toast.error('Failed to load time entries');
    } else {
      const entries = (data || []) as TimeEntry[];
      const open = entries.find(e => !e.clock_out) || null;
      setActiveEntry(open);
      setRecent(entries.filter(e => e.clock_out));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleClockIn = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('staff_time_clock').insert({
      user_id: user.id,
      clock_in: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast.error('Failed to clock in');
    } else {
      toast.success('Clocked in');
      load();
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('staff_time_clock')
      .update({
        clock_out: new Date().toISOString(),
        break_minutes: parseInt(breakMinutes) || 0,
        notes: notes || null,
      })
      .eq('id', activeEntry.id);
    setSubmitting(false);
    if (error) {
      toast.error('Failed to clock out');
    } else {
      toast.success('Clocked out');
      setBreakMinutes('0');
      setNotes('');
      load();
    }
  };

  return (
    <StaffLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold">Time Clock</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(now, 'EEEE, MMMM d, yyyy • h:mm:ss a')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {activeEntry ? 'Currently Clocked In' : 'Not Clocked In'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeEntry ? (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40">
                  <div>
                    <p className="text-sm text-muted-foreground">Started</p>
                    <p className="font-medium">{format(new Date(activeEntry.clock_in), 'h:mm a')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Elapsed</p>
                    <p className="font-mono text-2xl font-semibold tabular-nums">
                      {formatDistanceStrict(new Date(activeEntry.clock_in), now)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="break">Break (minutes)</Label>
                    <Input
                      id="break"
                      type="number"
                      min="0"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What did you work on?"
                      rows={2}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleClockOut}
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                  variant="destructive"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4 mr-2" /> Clock Out</>}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleClockIn}
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4 mr-2" /> Clock In</>}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No completed shifts yet</p>
            ) : (
              <div className="space-y-2">
                {recent.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(entry.clock_in), 'EEE, MMM d')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.clock_in), 'h:mm a')} – {format(new Date(entry.clock_out!), 'h:mm a')}
                        {entry.break_minutes ? ` • ${entry.break_minutes}m break` : ''}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{entry.notes}</p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {formatDuration(entry.clock_in, entry.clock_out!)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
};

export default StaffTimeClock;
