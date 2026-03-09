import { useState, useEffect } from 'react';
import { GroomerLayout } from '@/components/groomer/GroomerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

const GroomerSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groomer, isLoading } = useQuery({
    queryKey: ['my-groomer-record', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [intakeStyle, setIntakeStyle] = useState('One-At-A-Time');
  const [staggerDuration, setStaggerDuration] = useState(15);
  const [maxConcurrent, setMaxConcurrent] = useState(2);
  const [eodSafeguard, setEodSafeguard] = useState(false);
  const [eodBuffer, setEodBuffer] = useState(60);

  useEffect(() => {
    if (groomer) {
      setIntakeStyle(groomer.intake_style || 'One-At-A-Time');
      setStaggerDuration(groomer.stagger_duration || 15);
      setMaxConcurrent(groomer.max_concurrent || 2);
      setEodSafeguard(groomer.end_of_day_safeguard || false);
      setEodBuffer(groomer.eod_buffer_minutes || 60);
    }
  }, [groomer]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('groomers')
        .update({
          intake_style: intakeStyle,
          stagger_duration: staggerDuration,
          max_concurrent: maxConcurrent,
          end_of_day_safeguard: eodSafeguard,
          eod_buffer_minutes: eodBuffer,
        })
        .eq('id', groomer!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groomer-record'] });
      toast({ title: 'Settings Saved' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <GroomerLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </GroomerLayout>
    );
  }

  if (!groomer) {
    return (
      <GroomerLayout>
        <p className="text-muted-foreground text-center py-12">No groomer profile linked.</p>
      </GroomerLayout>
    );
  }

  return (
    <GroomerLayout>
      <div className="max-w-2xl space-y-6">
        <h2 className="text-2xl font-bold">My Settings</h2>

        <Card>
          <CardHeader>
            <CardTitle>Intake Style</CardTitle>
            <CardDescription>How you prefer to receive pets for grooming.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Intake Style</Label>
              <Select value={intakeStyle} onValueChange={setIntakeStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="One-At-A-Time">One At A Time</SelectItem>
                  <SelectItem value="Concurrent-Block">Concurrent Block</SelectItem>
                  <SelectItem value="Concurrent-Staggered">Concurrent Staggered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {intakeStyle !== 'One-At-A-Time' && (
              <>
                <div className="space-y-2">
                  <Label>Max Concurrent Pets</Label>
                  <Input type="number" min={1} max={10} value={maxConcurrent} onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 2)} />
                </div>
                {intakeStyle === 'Concurrent-Staggered' && (
                  <div className="space-y-2">
                    <Label>Stagger Duration (minutes)</Label>
                    <Input type="number" min={5} max={120} step={5} value={staggerDuration} onChange={(e) => setStaggerDuration(parseInt(e.target.value) || 15)} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>End of Day Safeguard</CardTitle>
            <CardDescription>Prevent Level 3/4 dogs from being booked in the final slots of the day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable EOD Safeguard</Label>
              <Switch checked={eodSafeguard} onCheckedChange={setEodSafeguard} />
            </div>
            {eodSafeguard && (
              <div className="space-y-2">
                <Label>Buffer (minutes before end of day)</Label>
                <Input type="number" min={15} max={240} step={15} value={eodBuffer} onChange={(e) => setEodBuffer(parseInt(e.target.value) || 60)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </GroomerLayout>
  );
};

export default GroomerSettings;
