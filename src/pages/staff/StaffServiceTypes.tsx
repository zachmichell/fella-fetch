import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical, Calendar, Scissors, Package, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ShopifyProductSelector } from '@/components/staff/ShopifyProductSelector';
import { ServiceTypeIconPicker } from '@/components/staff/ServiceTypeIconPicker';
import { ServiceTypeIcon } from '@/components/ui/service-type-icon';

interface ServiceType {
  id: string;
  name: string;
  display_name: string;
  category: 'reservation' | 'service' | 'add_on';
  description: string | null;
  credit_field: string | null;
  credits_per_unit: number;
  color: string;
  icon_name: string;
  is_active: boolean;
  sort_order: number;
}

const COLORS = [
  { value: 'blue', label: 'Blue' },
  { value: 'sky', label: 'Sky' },
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' },
  { value: 'green', label: 'Green' },
  { value: 'amber', label: 'Amber' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Red' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'gray', label: 'Gray' },
];

const CATEGORIES = [
  { value: 'reservation', label: 'Reservation', description: 'Daycare, boarding, assessments', icon: Calendar },
  { value: 'service', label: 'Service', description: 'Grooming, training appointments', icon: Scissors },
  { value: 'add_on', label: 'Add-on', description: 'Extra services added to reservations', icon: Package },
];

const CREDIT_FIELDS = [
  { value: 'none', label: 'No credits' },
  { value: 'daycare_credits', label: 'Daycare Credits' },
  { value: 'half_daycare_credits', label: 'Half Day Daycare Credits' },
  { value: 'boarding_credits', label: 'Boarding Credits' },
];

const defaultFormData: Partial<ServiceType> = {
  name: '',
  display_name: '',
  category: 'reservation',
  description: '',
  credit_field: null,
  credits_per_unit: 1,
  color: 'gray',
  icon_name: 'calendar',
  is_active: true,
  sort_order: 0,
};

export default function StaffServiceTypes() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState<Partial<ServiceType>>(defaultFormData);

  const { data: serviceTypes = [], isLoading } = useQuery({
    queryKey: ['service-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .order('category')
        .order('sort_order');
      
      if (error) throw error;
      return data as ServiceType[];
    },
  });

  // Fetch linked product counts
  const { data: productCounts = {} } = useQuery({
    queryKey: ['service-type-product-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_type_products')
        .select('service_type_id');
      
      if (error) throw error;
      
      // Count products per service type
      const counts: Record<string, number> = {};
      data.forEach(item => {
        counts[item.service_type_id] = (counts[item.service_type_id] || 0) + 1;
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ServiceType>) => {
      const { error } = await supabase.from('service_types').insert({
        name: data.name!.toLowerCase().replace(/\s+/g, '_'),
        display_name: data.display_name!,
        category: data.category!,
        description: data.description || null,
        credit_field: data.credit_field || null,
        credits_per_unit: data.credits_per_unit || 1,
        color: data.color || 'gray',
        icon_name: data.icon_name || 'calendar',
        is_active: data.is_active ?? true,
        sort_order: data.sort_order || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      toast.success('Service type created');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error('Failed to create service type', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceType> }) => {
      const { error } = await supabase
        .from('service_types')
        .update({
          display_name: data.display_name,
          category: data.category,
          description: data.description || null,
          credit_field: data.credit_field || null,
          credits_per_unit: data.credits_per_unit || 1,
          color: data.color,
          icon_name: data.icon_name,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      toast.success('Service type updated');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error('Failed to update service type', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      toast.success('Service type deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete service type', { description: error.message });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('service_types')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update status', { description: error.message });
    },
  });

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (type: ServiceType) => {
    setEditingType(type);
    setFormData(type);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = () => {
    if (!formData.display_name?.trim()) {
      toast.error('Display name is required');
      return;
    }

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    } else {
      if (!formData.name?.trim()) {
        // Auto-generate name from display_name
        formData.name = formData.display_name.toLowerCase().replace(/\s+/g, '_');
      }
      createMutation.mutate(formData);
    }
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800',
      sky: 'bg-sky-100 text-sky-800',
      purple: 'bg-purple-100 text-purple-800',
      pink: 'bg-pink-100 text-pink-800',
      green: 'bg-green-100 text-green-800',
      amber: 'bg-amber-100 text-amber-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800',
      cyan: 'bg-cyan-100 text-cyan-800',
      gray: 'bg-gray-100 text-gray-800',
    };
    return colorMap[color] || colorMap.gray;
  };

  const filterByCategory = (category: string) => 
    serviceTypes.filter(t => t.category === category);

  const renderTypeRow = (type: ServiceType) => (
    <TableRow key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
      <TableCell>
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <Badge className={`${getColorClass(type.color)} gap-1`}>
            <ServiceTypeIcon iconName={type.icon_name} className="h-3 w-3" />
            {type.display_name}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">{type.name}</TableCell>
      <TableCell>
        {type.credit_field ? (
          <span className="text-sm">
            {type.credits_per_unit} {type.credit_field.replace('_', ' ')}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {productCounts[type.id] ? (
          <Badge variant="outline" className="gap-1">
            <ShoppingBag className="h-3 w-3" />
            {productCounts[type.id]}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <Switch
          checked={type.is_active}
          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: type.id, is_active: checked })}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(type)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Delete "${type.display_name}"? This cannot be undone.`)) {
                  deleteMutation.mutate(type.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Service Types</h1>
            <p className="text-muted-foreground">
              Manage reservation types, services, and add-ons
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingType ? 'Edit Service Type' : 'Add Service Type'}</DialogTitle>
                <DialogDescription>
                  {editingType 
                    ? 'Update the service type configuration'
                    : 'Create a new reservation type, service, or add-on'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Name *</Label>
                    <Input
                      value={formData.display_name || ''}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="Full Day Daycare"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>System Name</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Auto-generated"
                      disabled={!!editingType}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: 'reservation' | 'service' | 'add_on') => 
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            <span>{cat.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Credit Type</Label>
                    <Select
                      value={formData.credit_field || 'none'}
                      onValueChange={(value) => 
                        setFormData({ ...formData, credit_field: value === 'none' ? null : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No credits" />
                      </SelectTrigger>
                      <SelectContent>
                        {CREDIT_FIELDS.map(cf => (
                          <SelectItem key={cf.value} value={cf.value}>
                            {cf.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Credits Per Unit</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.credits_per_unit || 1}
                      onChange={(e) => setFormData({ ...formData, credits_per_unit: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select
                      value={formData.color || 'gray'}
                      onValueChange={(value) => setFormData({ ...formData, color: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLORS.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full bg-${color.value}-500`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.sort_order || 0}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <ServiceTypeIconPicker
                    value={formData.icon_name || 'calendar'}
                    onChange={(value) => setFormData({ ...formData, icon_name: value })}
                    color={formData.color || 'gray'}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>

                {/* Shopify Product Linking */}
                <ShopifyProductSelector 
                  serviceTypeId={editingType?.id || null}
                  serviceTypeName={formData.display_name || 'this service type'}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingType ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="reservation">
          <TabsList>
            <TabsTrigger value="reservation" className="gap-2">
              <Calendar className="h-4 w-4" />
              Reservations
            </TabsTrigger>
            <TabsTrigger value="service" className="gap-2">
              <Scissors className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="add_on" className="gap-2">
              <Package className="h-4 w-4" />
              Add-ons
            </TabsTrigger>
          </TabsList>

          {['reservation', 'service', 'add_on'].map(category => (
            <TabsContent key={category} value={category}>
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize">{category.replace('_', '-')} Types</CardTitle>
                  <CardDescription>
                    {category === 'reservation' && 'Daycare, boarding, assessments and other reservation types'}
                    {category === 'service' && 'Standalone services like grooming and training'}
                    {category === 'add_on' && 'Extra services that can be added to reservations'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : filterByCategory(category).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No {category.replace('_', ' ')} types configured
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>System Key</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead>Products</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterByCategory(category).map(renderTypeRow)}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </StaffLayout>
  );
}
