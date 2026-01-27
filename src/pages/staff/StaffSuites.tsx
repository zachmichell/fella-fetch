import { useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BedDouble, 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical, 
  AlertTriangle,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

interface Suite {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  is_active: boolean;
  sort_order: number;
}

interface SuiteFormData {
  name: string;
  description: string;
  capacity: number;
}

const StaffSuites = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSuite, setEditingSuite] = useState<Suite | null>(null);
  const [deleteConfirmSuite, setDeleteConfirmSuite] = useState<Suite | null>(null);
  const [formData, setFormData] = useState<SuiteFormData>({
    name: '',
    description: '',
    capacity: 1,
  });
  const [draggedSuite, setDraggedSuite] = useState<Suite | null>(null);

  // Fetch suites
  const { data: suites, isLoading } = useQuery({
    queryKey: ['suites-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suites')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Suite[];
    },
  });

  // Create suite mutation
  const createSuite = useMutation({
    mutationFn: async (data: SuiteFormData) => {
      const maxSortOrder = suites?.reduce((max, s) => Math.max(max, s.sort_order || 0), 0) || 0;
      
      const { error } = await supabase
        .from('suites')
        .insert({
          name: data.name,
          description: data.description || null,
          capacity: data.capacity,
          sort_order: maxSortOrder + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suites-management'] });
      queryClient.invalidateQueries({ queryKey: ['suites'] });
      toast({ title: 'Suite created', description: 'New suite has been added' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create suite', variant: 'destructive' });
    },
  });

  // Update suite mutation
  const updateSuite = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SuiteFormData }) => {
      const { error } = await supabase
        .from('suites')
        .update({
          name: data.name,
          description: data.description || null,
          capacity: data.capacity,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suites-management'] });
      queryClient.invalidateQueries({ queryKey: ['suites'] });
      toast({ title: 'Suite updated', description: 'Changes have been saved' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update suite', variant: 'destructive' });
    },
  });

  // Delete suite mutation
  const deleteSuite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suites-management'] });
      queryClient.invalidateQueries({ queryKey: ['suites'] });
      toast({ title: 'Suite deleted', description: 'Suite has been removed' });
      setDeleteConfirmSuite(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete suite. It may have existing reservations.', variant: 'destructive' });
    },
  });

  // Toggle active status mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('suites')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suites-management'] });
      queryClient.invalidateQueries({ queryKey: ['suites'] });
    },
  });

  // Reorder suites mutation
  const reorderSuites = useMutation({
    mutationFn: async (reorderedSuites: Suite[]) => {
      const updates = reorderedSuites.map((suite, index) => 
        supabase
          .from('suites')
          .update({ sort_order: index + 1 })
          .eq('id', suite.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suites-management'] });
      queryClient.invalidateQueries({ queryKey: ['suites'] });
    },
  });

  const handleOpenCreate = () => {
    setEditingSuite(null);
    setFormData({ name: '', description: '', capacity: 1 });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (suite: Suite) => {
    setEditingSuite(suite);
    setFormData({
      name: suite.name,
      description: suite.description || '',
      capacity: suite.capacity,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSuite(null);
    setFormData({ name: '', description: '', capacity: 1 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Suite name is required', variant: 'destructive' });
      return;
    }

    if (formData.capacity < 1) {
      toast({ title: 'Error', description: 'Capacity must be at least 1', variant: 'destructive' });
      return;
    }

    if (editingSuite) {
      updateSuite.mutate({ id: editingSuite.id, data: formData });
    } else {
      createSuite.mutate(formData);
    }
  };

  const handleDragStart = (suite: Suite) => {
    setDraggedSuite(suite);
  };

  const handleDragOver = (e: React.DragEvent, targetSuite: Suite) => {
    e.preventDefault();
    if (!draggedSuite || draggedSuite.id === targetSuite.id) return;

    const newSuites = [...(suites || [])];
    const draggedIndex = newSuites.findIndex(s => s.id === draggedSuite.id);
    const targetIndex = newSuites.findIndex(s => s.id === targetSuite.id);

    newSuites.splice(draggedIndex, 1);
    newSuites.splice(targetIndex, 0, draggedSuite);

    // Optimistic update
    queryClient.setQueryData(['suites-management'], newSuites);
  };

  const handleDragEnd = () => {
    if (draggedSuite && suites) {
      reorderSuites.mutate(suites);
    }
    setDraggedSuite(null);
  };

  if (!isAdmin) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-96">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You must be an administrator to manage suites.
            </AlertDescription>
          </Alert>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <BedDouble className="h-6 w-6" />
              Suite Management
            </h1>
            <p className="text-muted-foreground">
              Manage boarding suites, capacities, and display order
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Suite
          </Button>
        </div>

        {/* Suites List */}
        <Card>
          <CardHeader>
            <CardTitle>Boarding Suites</CardTitle>
            <CardDescription>
              Drag to reorder suites. The order here determines how they appear on the lodging calendar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : suites?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No suites configured. Add your first suite to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {suites?.map((suite) => (
                  <div
                    key={suite.id}
                    draggable
                    onDragStart={() => handleDragStart(suite)}
                    onDragOver={(e) => handleDragOver(e, suite)}
                    onDragEnd={handleDragEnd}
                    className={`
                      flex items-center gap-4 p-4 border rounded-lg bg-card
                      cursor-grab active:cursor-grabbing
                      transition-all hover:border-primary/50
                      ${draggedSuite?.id === suite.id ? 'opacity-50' : ''}
                      ${!suite.is_active ? 'opacity-60 bg-muted/50' : ''}
                    `}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{suite.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          Capacity: {suite.capacity}
                        </Badge>
                        {!suite.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {suite.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {suite.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive.mutate({ id: suite.id, is_active: !suite.is_active })}
                      >
                        {suite.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(suite)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmSuite(suite)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSuite ? 'Edit Suite' : 'Add New Suite'}
            </DialogTitle>
            <DialogDescription>
              {editingSuite 
                ? 'Update the suite details below.'
                : 'Enter the details for the new boarding suite.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Suite Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Suite 1, Deluxe Suite A"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this suite"
                maxLength={200}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={10}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground">
                Number of pets that can stay in this suite at once
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createSuite.isPending || updateSuite.isPending}
              >
                {(createSuite.isPending || updateSuite.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingSuite ? 'Save Changes' : 'Create Suite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmSuite} onOpenChange={() => setDeleteConfirmSuite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Suite</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmSuite?.name}"? 
              This action cannot be undone. Suites with existing reservations cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmSuite && deleteSuite.mutate(deleteConfirmSuite.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSuite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffLayout>
  );
};

export default StaffSuites;