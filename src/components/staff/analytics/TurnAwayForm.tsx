import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const REASONS = ['Capacity', 'Failed Assessment', 'Waitlisted', 'Vaccination Missing', 'Behavior Issue', 'Other'];

export const TurnAwayForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [serviceType, setServiceType] = useState('daycare');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const { data: turnAways } = useQuery({
    queryKey: ['turn-aways'],
    queryFn: async () => {
      const { data } = await supabase.from('turn_aways')
        .select('*')
        .order('date', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('turn_aways').insert({
        service_type: serviceType,
        date,
        reason,
        estimated_value: value ? parseFloat(value) : null,
        notes: notes || null,
        created_by: user?.id || '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turn-aways'] });
      toast.success('Turn-away logged');
      setReason('');
      setValue('');
      setNotes('');
    },
    onError: () => toast.error('Failed to log turn-away'),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Log Turn-Away</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daycare">Daycare</SelectItem>
              <SelectItem value="boarding">Boarding</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Reason" /></SelectTrigger>
            <SelectContent>
              {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Est. value $" value={value} onChange={e => setValue(e.target.value)} className="h-9" />
          <Button size="sm" className="h-9" disabled={!reason || addMutation.isPending} onClick={() => addMutation.mutate()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {turnAways && turnAways.length > 0 && (
          <div className="max-h-[200px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnAways.map((ta: any) => (
                  <TableRow key={ta.id}>
                    <TableCell>{format(new Date(ta.date), 'MMM d')}</TableCell>
                    <TableCell className="capitalize">{ta.service_type}</TableCell>
                    <TableCell>{ta.reason}</TableCell>
                    <TableCell className="text-right">{ta.estimated_value ? `$${ta.estimated_value}` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
