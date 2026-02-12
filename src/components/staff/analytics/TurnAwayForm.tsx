import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';
import { Plus, CalendarIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useTurnAwayReasons } from '@/hooks/useTurnAwayReasons';

const parseLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const TurnAwayForm = () => {
  const { user } = useAuth();
  const { reasons: REASONS } = useTurnAwayReasons();
  const queryClient = useQueryClient();
  const [serviceType, setServiceType] = useState('daycare');
  const [reason, setReason] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [filterStart, setFilterStart] = useState<Date>(subMonths(new Date(), 1));
  const [filterEnd, setFilterEnd] = useState<Date>(new Date());

  const filterStartDate = format(filterStart, 'yyyy-MM-dd');
  const filterEndDate = format(filterEnd, 'yyyy-MM-dd');

  const { data: turnAways } = useQuery({
    queryKey: ['turn-aways', filterStartDate, filterEndDate],
    queryFn: async () => {
      const { data } = await supabase.from('turn_aways')
        .select('*')
        .gte('date', filterStartDate)
        .lte('date', filterEndDate)
        .order('date', { ascending: false });
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('turn_aways').insert({
        service_type: serviceType,
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daycare">Daycare</SelectItem>
              <SelectItem value="boarding">Boarding</SelectItem>
              <SelectItem value="grooming">Grooming</SelectItem>
              <SelectItem value="training">Training</SelectItem>
            </SelectContent>
          </Select>
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
        <div className="flex gap-2 items-center px-1 flex-wrap">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <DatePickerButton date={filterStart} onSelect={setFilterStart} />
          <span className="text-sm text-muted-foreground">to</span>
          <DatePickerButton date={filterEnd} onSelect={setFilterEnd} />
        </div>
        {turnAways && turnAways.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-muted-foreground">{turnAways.length} turn-away{turnAways.length !== 1 ? 's' : ''}</span>
              <span className="text-sm font-bold text-destructive">
                Total Lost: ${turnAways.reduce((sum: number, ta: any) => sum + (ta.estimated_value || 0), 0).toFixed(2)}
              </span>
            </div>
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
                      <TableCell>{format(parseLocalDate(ta.date), 'MMM d')}</TableCell>
                      <TableCell className="capitalize">{ta.service_type}</TableCell>
                      <TableCell>{ta.reason}</TableCell>
                      <TableCell className="text-right">{ta.estimated_value ? `$${ta.estimated_value}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DatePickerButton = ({ date, onSelect }: { date: Date; onSelect: (d: Date) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className={cn("h-8 w-[130px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
        {date ? format(date, 'MMM d, yyyy') : 'Pick date'}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={date}
        onSelect={(d) => d && onSelect(d)}
        initialFocus
        className={cn("p-3 pointer-events-auto")}
      />
    </PopoverContent>
  </Popover>
);
