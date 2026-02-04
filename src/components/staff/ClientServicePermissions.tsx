import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ServiceTypeIcon } from '@/components/ui/service-type-icon';

interface ServiceType {
  id: string;
  name: string;
  display_name: string;
  category: string;
  icon_name: string | null;
  color: string | null;
}

interface ClientServicePermissionsProps {
  clientId: string;
}

export const ClientServicePermissions = ({ clientId }: ClientServicePermissionsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all active service types
        const { data: types, error: typesError } = await supabase
          .from('service_types')
          .select('id, name, display_name, category, icon_name, color')
          .eq('is_active', true)
          .order('sort_order')
          .order('name');

        if (typesError) throw typesError;

        // Fetch existing permissions for this client
        const { data: perms, error: permsError } = await supabase
          .from('client_service_permissions')
          .select('service_type_id, is_allowed')
          .eq('client_id', clientId);

        if (permsError) throw permsError;

        setServiceTypes(types || []);
        
        // Build permissions map - default to true (allowed) if no record exists
        const permMap: Record<string, boolean> = {};
        types?.forEach(t => {
          const existing = perms?.find(p => p.service_type_id === t.id);
          permMap[t.id] = existing ? existing.is_allowed : true;
        });
        setPermissions(permMap);
      } catch (error) {
        console.error('Error fetching service permissions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load service permissions',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, toast]);

  const handleToggle = async (serviceTypeId: string, allowed: boolean) => {
    setSaving(serviceTypeId);
    try {
      // Upsert the permission record
      const { error } = await supabase
        .from('client_service_permissions')
        .upsert({
          client_id: clientId,
          service_type_id: serviceTypeId,
          is_allowed: allowed,
        }, {
          onConflict: 'client_id,service_type_id',
        });

      if (error) throw error;

      setPermissions(prev => ({
        ...prev,
        [serviceTypeId]: allowed,
      }));
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  // Group service types by category
  const grouped = serviceTypes.reduce((acc, st) => {
    const cat = st.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(st);
    return acc;
  }, {} as Record<string, ServiceType[]>);

  const categoryLabels: Record<string, string> = {
    reservation: 'Reservations',
    service: 'Services',
    add_on: 'Add-ons',
    other: 'Other',
  };

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, types]) => (
        <div key={category} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {categoryLabels[category] || category}
          </p>
          <div className="space-y-2">
            {types.map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <ServiceTypeIcon 
                    iconName={st.icon_name} 
                    className="h-5 w-5" 
                  />
                  <Label htmlFor={`perm-${st.id}`} className="font-medium cursor-pointer">
                    {st.display_name}
                  </Label>
                </div>
                <Switch
                  id={`perm-${st.id}`}
                  checked={permissions[st.id] ?? true}
                  onCheckedChange={(checked) => handleToggle(st.id, checked)}
                  disabled={saving === st.id}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
