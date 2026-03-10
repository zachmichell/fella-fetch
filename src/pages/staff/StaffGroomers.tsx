import { useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Scissors, 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical, 
  AlertTriangle,
  Loader2,
  Save,
  Mail,
  Phone,
  
  CalendarDays,
  Link2,
  Unlink,
  ShoppingBag,
  Grid3X3
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
// GroomerDurationsDialog removed — replaced by ServiceMatrixEditor
import { GroomerScheduleDialog } from '@/components/staff/grooming/GroomerScheduleDialog';
import { ServiceMatrixEditor } from '@/components/staff/grooming/ServiceMatrixEditor';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Groomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number | null;
  shopify_staff_id: string | null;
  shopify_staff_name: string | null;
  intake_style: string;
  stagger_duration: number;
  end_of_day_safeguard: boolean;
  eod_buffer_minutes: number;
  max_concurrent: number;
  user_id: string | null;
}


interface GroomerFormData {
  name: string;
  email: string;
  phone: string;
  color: string;
}

const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
];

const StaffGroomers = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroomer, setEditingGroomer] = useState<Groomer | null>(null);
  const [deleteConfirmGroomer, setDeleteConfirmGroomer] = useState<Groomer | null>(null);
  // durationsGroomer state removed
  const [scheduleGroomer, setScheduleGroomer] = useState<Groomer | null>(null);
  const [matrixGroomer, setMatrixGroomer] = useState<Groomer | null>(null);
  const [formData, setFormData] = useState<GroomerFormData>({
    name: '',
    email: '',
    phone: '',
    color: '#3b82f6',
  });
  const [draggedGroomer, setDraggedGroomer] = useState<Groomer | null>(null);
  const [linkingGroomer, setLinkingGroomer] = useState<Groomer | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Fetch groomers
  const { data: groomers, isLoading } = useQuery({
    queryKey: ['groomers-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomers')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Groomer[];
    },
  });

  // Create groomer mutation
  const createGroomer = useMutation({
    mutationFn: async (data: GroomerFormData) => {
      const maxSortOrder = groomers?.reduce((max, g) => Math.max(max, g.sort_order || 0), 0) || 0;
      
      const { error } = await supabase
        .from('groomers')
        .insert({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          color: data.color,
          sort_order: maxSortOrder + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groomers-management'] });
      queryClient.invalidateQueries({ queryKey: ['groomers'] });
      toast({ title: 'Groomer created', description: 'New groomer has been added' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create groomer', variant: 'destructive' });
    },
  });

  // Update groomer mutation
  const updateGroomer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GroomerFormData }) => {
      const { error } = await supabase
        .from('groomers')
        .update({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          color: data.color,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groomers-management'] });
      queryClient.invalidateQueries({ queryKey: ['groomers'] });
      toast({ title: 'Groomer updated', description: 'Changes have been saved' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update groomer', variant: 'destructive' });
    },
  });

  // Delete groomer mutation
  const deleteGroomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('groomers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groomers-management'] });
      queryClient.invalidateQueries({ queryKey: ['groomers'] });
      toast({ title: 'Groomer deleted', description: 'Groomer has been removed' });
      setDeleteConfirmGroomer(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete groomer. They may have existing appointments.', variant: 'destructive' });
    },
  });

  // Toggle active status mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('groomers')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groomers-management'] });
      queryClient.invalidateQueries({ queryKey: ['groomers'] });
    },
  });

  const [manualStaffName, setManualStaffName] = useState('');

  // Link groomer to Shopify staff
  const linkShopifyStaff = useMutation({
    mutationFn: async ({ groomerId, staffId, staffName }: { groomerId: string; staffId: string | null; staffName: string | null }) => {
      const { error } = await supabase
        .from('groomers')
        .update({ shopify_staff_id: staffId, shopify_staff_name: staffName } as any)
        .eq('id', groomerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groomers-management'] });
      queryClient.invalidateQueries({ queryKey: ['groomers'] });
      toast({ title: 'Shopify link updated', description: 'Groomer has been linked to Shopify staff' });
      setLinkingGroomer(null);
      setSelectedStaffId('');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to link Shopify staff', variant: 'destructive' });
    },
  });

  // Reorder groomers mutation
  const reorderGroomers = useMutation({
    mutationFn: async (reorderedGroomers: Groomer[]) => {
      const updates = reorderedGroomers.map((groomer, index) => 
        supabase
          .from('groomers')
          .update({ sort_order: index + 1 })
          .eq('id', groomer.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groomers-management'] });
      queryClient.invalidateQueries({ queryKey: ['groomers'] });
    },
  });

  const handleOpenCreate = () => {
    setEditingGroomer(null);
    setFormData({ name: '', email: '', phone: '', color: '#3b82f6' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (groomer: Groomer) => {
    setEditingGroomer(groomer);
    setFormData({
      name: groomer.name,
      email: groomer.email || '',
      phone: groomer.phone || '',
      color: groomer.color || '#3b82f6',
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGroomer(null);
    setFormData({ name: '', email: '', phone: '', color: '#3b82f6' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Groomer name is required', variant: 'destructive' });
      return;
    }

    if (editingGroomer) {
      updateGroomer.mutate({ id: editingGroomer.id, data: formData });
    } else {
      createGroomer.mutate(formData);
    }
  };

  const handleDragStart = (groomer: Groomer) => {
    setDraggedGroomer(groomer);
  };

  const handleDragOver = (e: React.DragEvent, targetGroomer: Groomer) => {
    e.preventDefault();
    if (!draggedGroomer || draggedGroomer.id === targetGroomer.id) return;

    const newGroomers = [...(groomers || [])];
    const draggedIndex = newGroomers.findIndex(g => g.id === draggedGroomer.id);
    const targetIndex = newGroomers.findIndex(g => g.id === targetGroomer.id);

    newGroomers.splice(draggedIndex, 1);
    newGroomers.splice(targetIndex, 0, draggedGroomer);

    // Optimistic update
    queryClient.setQueryData(['groomers-management'], newGroomers);
  };

  const handleDragEnd = () => {
    if (draggedGroomer && groomers) {
      reorderGroomers.mutate(groomers);
    }
    setDraggedGroomer(null);
  };

  if (!isAdmin) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-96">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You must be an administrator to manage groomers.
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
              <Scissors className="h-6 w-6" />
              Groomer Management
            </h1>
            <p className="text-muted-foreground">
              Manage grooming staff, contact info, and calendar colors
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Groomer
          </Button>
        </div>

        {/* Groomers List */}
        <Card>
          <CardHeader>
            <CardTitle>Grooming Staff</CardTitle>
            <CardDescription>
              Drag to reorder groomers. The order here determines how they appear on the grooming calendar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : groomers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No groomers configured. Add your first groomer to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {groomers?.map((groomer) => (
                  <div
                    key={groomer.id}
                    draggable
                    onDragStart={() => handleDragStart(groomer)}
                    onDragOver={(e) => handleDragOver(e, groomer)}
                    onDragEnd={handleDragEnd}
                    className={`
                      flex items-center gap-4 p-4 border rounded-lg bg-card
                      cursor-grab active:cursor-grabbing
                      transition-all hover:border-primary/50
                      ${draggedGroomer?.id === groomer.id ? 'opacity-50' : ''}
                      ${!groomer.is_active ? 'opacity-60 bg-muted/50' : ''}
                    `}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    
                    {/* Color indicator */}
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-background shadow-sm"
                      style={{ backgroundColor: groomer.color || '#3b82f6' }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{groomer.name}</span>
                        {!groomer.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                        {groomer.shopify_staff_name && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            {groomer.shopify_staff_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {groomer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {groomer.email}
                          </span>
                        )}
                        {groomer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {groomer.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setScheduleGroomer(groomer)}
                          >
                            <CalendarDays className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Set availability</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMatrixGroomer(groomer)}
                          >
                            <Grid3X3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Service duration matrix (by size & level)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setLinkingGroomer(groomer);
                              setSelectedStaffId(groomer.shopify_staff_id || '');
                            }}
                          >
                            {groomer.shopify_staff_id ? (
                              <Link2 className="h-4 w-4 text-primary" />
                            ) : (
                              <Unlink className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {groomer.shopify_staff_id ? 'Change Shopify link' : 'Link to Shopify staff'}
                        </TooltipContent>
                      </Tooltip>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive.mutate({ id: groomer.id, is_active: !groomer.is_active })}
                      >
                        {groomer.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(groomer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmGroomer(groomer)}
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
              {editingGroomer ? 'Edit Groomer' : 'Add New Groomer'}
            </DialogTitle>
            <DialogDescription>
              {editingGroomer 
                ? 'Update the groomer details below.'
                : 'Enter the details for the new groomer.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sarah Smith"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., sarah@example.com"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., (555) 123-4567"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label>Calendar Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: colorOption.value })}
                    className={`
                      w-8 h-8 rounded-full transition-all border-2
                      ${formData.color === colorOption.value 
                        ? 'ring-2 ring-offset-2 ring-offset-background scale-110 ring-primary' 
                        : 'hover:scale-105 border-transparent'
                      }
                    `}
                    style={{ backgroundColor: colorOption.value }}
                    title={colorOption.label}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                This color will be used to identify the groomer's appointments on the calendar
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createGroomer.isPending || updateGroomer.isPending}
              >
                {(createGroomer.isPending || updateGroomer.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingGroomer ? 'Save Changes' : 'Create Groomer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmGroomer} onOpenChange={() => setDeleteConfirmGroomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Groomer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmGroomer?.name}"? 
              This action cannot be undone. Groomers with existing appointments cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmGroomer && deleteGroomer.mutate(deleteConfirmGroomer.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGroomer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Service Matrix Editor */}
      <ServiceMatrixEditor
        open={!!matrixGroomer}
        onOpenChange={(open) => !open && setMatrixGroomer(null)}
        groomerId={matrixGroomer?.id ?? ''}
        groomerName={matrixGroomer?.name ?? ''}
      />

      {/* Groomer Schedule Dialog */}
      <GroomerScheduleDialog
        groomer={scheduleGroomer}
        open={!!scheduleGroomer}
        onOpenChange={(open) => !open && setScheduleGroomer(null)}
      />

      {/* Shopify Staff Linking Dialog */}
      <Dialog open={!!linkingGroomer} onOpenChange={(open) => { if (!open) { setLinkingGroomer(null); setSelectedStaffId(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Link to Shopify Staff
            </DialogTitle>
            <DialogDescription>
              Link "{linkingGroomer?.name}" to a Shopify staff member for commission and order attribution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingStaff ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading Shopify staff...</span>
              </div>
            ) : shopifyStaff && shopifyStaff.length > 0 ? (
              <div className="space-y-2">
                <Label>Shopify Staff Member</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Shopify staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {shopifyStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name} — {staff.email}
                        {staff.account_owner && ' (Owner)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No Shopify staff members found. Make sure your Shopify access token has the <code>read_users</code> scope.
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {linkingGroomer?.shopify_staff_id && (
              <Button
                variant="outline"
                onClick={() => linkShopifyStaff.mutate({ groomerId: linkingGroomer.id, staffId: null, staffName: null })}
                disabled={linkShopifyStaff.isPending}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Unlink
              </Button>
            )}
            <Button
              onClick={() => {
                if (!linkingGroomer || !selectedStaffId) return;
                const staff = shopifyStaff?.find(s => s.id === selectedStaffId);
                const staffName = staff ? `${staff.first_name} ${staff.last_name}`.trim() : null;
                linkShopifyStaff.mutate({ groomerId: linkingGroomer.id, staffId: selectedStaffId, staffName });
              }}
              disabled={!selectedStaffId || linkShopifyStaff.isPending}
            >
              {linkShopifyStaff.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Link Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
};

export default StaffGroomers;
