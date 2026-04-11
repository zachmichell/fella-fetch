import { useState, useEffect, useRef } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Shield, User, Eye, EyeOff, Users, Clock } from 'lucide-react';
import { RolePermissionsEditor } from '@/components/staff/RolePermissionsEditor';
import { useStaffCode } from '@/contexts/StaffCodeContext';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '@/hooks/useSystemSettings';

type StaffCodeRole = 'basic' | 'supervisor' | 'admin';

interface StaffCode {
  id: string;
  name: string;
  code: string;
  role: StaffCodeRole;
  is_active: boolean;
  created_at: string;
}

const roleLabels: Record<StaffCodeRole, string> = {
  basic: 'Basic',
  supervisor: 'Supervisor',
  admin: 'Admin',
};

const roleDescriptions: Record<StaffCodeRole, string> = {
  basic: 'Main menu only',
  supervisor: 'Main + Operations',
  admin: 'Full access',
};

const StaffManagementContent = () => {
  const { toast } = useToast();
  const { isCodeAdmin } = useStaffCode();
  const navigate = useNavigate();
  const { getSetting, updateSetting, isLoading: settingsLoading } = useSystemSettings();
  const [staffCodes, setStaffCodes] = useState<StaffCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffCode | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<StaffCode | null>(null);
  const [showCodes, setShowCodes] = useState<Record<string, boolean>>({});
  const [inactivityTimeout, setInactivityTimeout] = useState<number>(60);
  const [savingTimeout, setSavingTimeout] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    role: 'basic' as StaffCodeRole,
    is_active: true,
  });

  // Load inactivity timeout setting
  const timeoutInitialized = useRef(false);
  useEffect(() => {
    if (!settingsLoading && !timeoutInitialized.current) {
      timeoutInitialized.current = true;
      const timeout = getSetting<number>('staff_inactivity_timeout', 60);
      setInactivityTimeout(timeout);
    }
  }, [settingsLoading]);

  const handleSaveTimeout = async () => {
    setSavingTimeout(true);
    try {
      await updateSetting.mutateAsync({ 
        key: 'staff_inactivity_timeout', 
        value: inactivityTimeout,
        description: 'Duration in seconds before staff code lock activates due to inactivity'
      });
      
      toast({ title: 'Inactivity timeout updated!' });
    } catch (error) {
      console.error('Error saving timeout:', error);
      toast({
        title: 'Error',
        description: 'Failed to save timeout setting',
        variant: 'destructive',
      });
    } finally {
      setSavingTimeout(false);
    }
  };

  // Redirect non-admin code users
  useEffect(() => {
    if (!isCodeAdmin) {
      navigate('/staff');
    }
  }, [isCodeAdmin, navigate]);

  const fetchStaffCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_codes')
        .select('*')
        .order('name');

      if (error) throw error;
      setStaffCodes(data || []);
    } catch (error) {
      console.error('Error fetching staff codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffCodes();
  }, []);

  const handleOpenDialog = (staff?: StaffCode) => {
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        name: staff.name,
        code: staff.code,
        role: staff.role,
        is_active: staff.is_active,
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        code: '',
        role: 'basic',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and code are required',
        variant: 'destructive',
      });
      return;
    }

    if (!/^\d{4}$/.test(formData.code)) {
      toast({
        title: 'Validation Error',
        description: 'Code must be exactly 4 digits',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingStaff) {
        const { error } = await supabase
          .from('staff_codes')
          .update({
            name: formData.name,
            code: formData.code,
            role: formData.role,
            is_active: formData.is_active,
          })
          .eq('id', editingStaff.id);

        if (error) throw error;
        toast({ title: 'Staff code updated successfully!' });
      } else {
        const { error } = await supabase
          .from('staff_codes')
          .insert([{
            name: formData.name,
            code: formData.code,
            role: formData.role,
            is_active: formData.is_active,
          }]);

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Duplicate Code',
              description: 'This code is already in use',
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }
        toast({ title: 'Staff code created successfully!' });
      }

      setIsDialogOpen(false);
      fetchStaffCodes();
    } catch (error) {
      console.error('Error saving staff code:', error);
      toast({
        title: 'Error',
        description: 'Failed to save staff code',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteStaff) return;

    try {
      const { error } = await supabase
        .from('staff_codes')
        .delete()
        .eq('id', deleteStaff.id);

      if (error) throw error;

      toast({ title: 'Staff code deleted successfully!' });
      setDeleteStaff(null);
      fetchStaffCodes();
    } catch (error) {
      console.error('Error deleting staff code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete staff code',
        variant: 'destructive',
      });
    }
  };

  const toggleShowCode = (id: string) => {
    setShowCodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getRoleBadge = (role: StaffCodeRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        );
      case 'supervisor':
        return (
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            Supervisor
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <User className="h-3 w-3 mr-1" />
            Basic
          </Badge>
        );
    }
  };

  if (!isCodeAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff access codes and permissions</p>
        </div>
        <Button className="gap-2" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4" />
          Add Staff Code
        </Button>
      </div>

      {/* Inactivity Timeout Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Inactivity Timeout
          </CardTitle>
          <CardDescription>
            Lock the staff portal after this many seconds of inactivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Input
                type="number"
                min={10}
                max={3600}
                value={inactivityTimeout}
                onChange={(e) => setInactivityTimeout(Math.max(10, Math.min(3600, parseInt(e.target.value) || 60)))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Min: 10 seconds, Max: 3600 seconds (1 hour)
              </p>
            </div>
            <Button onClick={handleSaveTimeout} disabled={savingTimeout}>
              {savingTimeout ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Codes</CardTitle>
          <CardDescription>
            Each staff member has a unique 4-digit code to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : staffCodes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No staff codes yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffCodes.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {showCodes[staff.id] ? staff.code : '••••'}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleShowCode(staff.id)}
                        >
                          {showCodes[staff.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(staff.role)}</TableCell>
                    <TableCell>
                      <Badge variant={staff.is_active ? 'default' : 'outline'}>
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(staff)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteStaff(staff)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff Code' : 'Add Staff Code'}</DialogTitle>
            <DialogDescription>
              {editingStaff
                ? 'Update the staff member\'s information'
                : 'Create a new staff access code'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Staff member name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">4-Digit Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setFormData({ ...formData, code: value });
                }}
                placeholder="0000"
                maxLength={4}
                className="font-mono text-lg tracking-widest"
              />
            </div>
            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select
                value={formData.role}
                onValueChange={(value: StaffCodeRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['basic', 'supervisor', 'admin'] as StaffCodeRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex flex-col">
                        <span>{roleLabels[role]}</span>
                        <span className="text-xs text-muted-foreground">{roleDescriptions[role]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Allow this code to be used for login
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingStaff ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStaff} onOpenChange={() => setDeleteStaff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the code for "{deleteStaff?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StaffManagement = () => {
  return (
    <StaffLayout>
      <StaffManagementContent />
    </StaffLayout>
  );
};

export default StaffManagement;