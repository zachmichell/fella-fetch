import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const ClassManager = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('1');
  const [capacity, setCapacity] = useState('10');

  const { data: classTypes } = useQuery({
    queryKey: ['class-types'],
    queryFn: async () => {
      const { data } = await supabase.from('class_types')
        .select('*')
        .order('level', { ascending: true })
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('class_types').insert({
        name,
        level: parseInt(level),
        max_capacity: parseInt(capacity),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-types'] });
      toast.success('Class type added');
      setName('');
      setLevel('1');
      setCapacity('10');
    },
    onError: () => toast.error('Failed to add class type'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('class_types').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-types'] }),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Class Types</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <Input placeholder="Class name" value={name} onChange={e => setName(e.target.value)} className="h-9 col-span-2" />
          <Input type="number" placeholder="Level" value={level} onChange={e => setLevel(e.target.value)} className="h-9" min="1" />
          <Button size="sm" className="h-9" disabled={!name || addMutation.isPending} onClick={() => addMutation.mutate()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {classTypes && classTypes.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classTypes.map((ct: any) => (
                <TableRow key={ct.id}>
                  <TableCell className="font-medium">{ct.name}</TableCell>
                  <TableCell>L{ct.level}</TableCell>
                  <TableCell>{ct.max_capacity}</TableCell>
                  <TableCell>
                    <Badge
                      variant={ct.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleMutation.mutate({ id: ct.id, isActive: ct.is_active })}
                    >
                      {ct.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
