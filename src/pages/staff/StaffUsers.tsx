import { useState, useEffect } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useStaffCode } from '@/contexts/StaffCodeContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, User, Loader2, KeyRound } from 'lucide-react';
import { RolePermissionsEditor } from '@/components/staff/RolePermissionsEditor';

interface StaffCode {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
}

const roleConfig: Record<string, { label: string; icon: typeof Shield; variant: 'default' | 'secondary' | 'outline' }> = {
  admin: { label: 'Admin', icon: Shield, variant: 'default' },
  supervisor: { label: 'Supervisor', icon: Users, variant: 'secondary' },
  basic: { label: 'Basic', icon: User, variant: 'outline' },
};

function StaffUsersContent() {
  const { isCodeAdmin } = useStaffCode();
  const navigate = useNavigate();
  const [staffCodes, setStaffCodes] = useState<StaffCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCodeAdmin) {
      navigate('/staff');
    }
  }, [isCodeAdmin, navigate]);

  useEffect(() => {
    const fetchStaffCodes = async () => {
      const { data } = await supabase
        .from('staff_codes')
        .select('id, name, role, is_active')
        .eq('is_active', true)
        .order('name');
      setStaffCodes(data || []);
      setLoading(false);
    };
    fetchStaffCodes();
  }, []);

  if (!isCodeAdmin) return null;

  const groupedByRole = staffCodes.reduce<Record<string, StaffCode[]>>((acc, sc) => {
    if (!acc[sc.role]) acc[sc.role] = [];
    acc[sc.role].push(sc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">
          Configure what each role can access, and see which staff members have each role
        </p>
      </div>

      {/* Staff by Role Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Staff by Role
          </CardTitle>
          <CardDescription>
            Active staff codes grouped by their assigned role. Change role assignments in Staff Codes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {['admin', 'supervisor', 'basic'].map(role => {
                const config = roleConfig[role];
                const members = groupedByRole[role] || [];
                const Icon = config.icon;
                return (
                  <div key={role} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={config.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {members.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No staff assigned</p>
                    ) : (
                      <div className="space-y-1">
                        {members.map(m => (
                          <div key={m.id} className="text-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {m.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Editor */}
      <RolePermissionsEditor />
    </div>
  );
}

const StaffUsers = () => (
  <StaffLayout>
    <StaffUsersContent />
  </StaffLayout>
);

export default StaffUsers;
