import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutDashboard, Calendar, Users, Dog, ClipboardList, Clock,
  BarChart3, Settings, HeartPulse, Scissors, BedDouble, MessageCircle,
  MessageSquare, Repeat, Megaphone, Sparkles, UserCog, ShoppingBag,
  Layers, KeyRound, Shield, Loader2, Save
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PagePermission {
  key: string;
  title: string;
  icon: LucideIcon;
  section: 'main' | 'operations' | 'admin';
}

export const ALL_PAGES: PagePermission[] = [
  // Main
  { key: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { key: 'messages', title: 'Messages', icon: MessageCircle, section: 'main' },
  { key: 'calendar', title: 'Calendar', icon: Calendar, section: 'main' },
  { key: 'lodging', title: 'Lodging', icon: BedDouble, section: 'main' },
  { key: 'grooming', title: 'Grooming', icon: Scissors, section: 'main' },
  { key: 'clients', title: 'Clients', icon: Users, section: 'main' },
  { key: 'pets', title: 'Pets', icon: Dog, section: 'main' },
  // Operations
  { key: 'pet-care', title: 'Pet Care', icon: HeartPulse, section: 'operations' },
  { key: 'report-cards', title: 'Report Cards', icon: ClipboardList, section: 'operations' },
  { key: 'subscriptions', title: 'Subscriptions', icon: Repeat, section: 'operations' },
  { key: 'trait-templates', title: 'Trait Templates', icon: Sparkles, section: 'operations' },
  { key: 'time-clock', title: 'Time Clock', icon: Clock, section: 'operations' },
  { key: 'analytics', title: 'Analytics', icon: BarChart3, section: 'operations' },
  // Admin
  { key: 'staff-management', title: 'Staff Codes', icon: KeyRound, section: 'admin' },
  { key: 'marketing', title: 'Marketing', icon: Megaphone, section: 'admin' },
  { key: 'communications', title: 'SMS & Comms', icon: MessageSquare, section: 'admin' },
  { key: 'users', title: 'User Management', icon: UserCog, section: 'admin' },
  { key: 'suites', title: 'Suite Management', icon: BedDouble, section: 'admin' },
  { key: 'groomers', title: 'Groomer Management', icon: Scissors, section: 'admin' },
  { key: 'service-types', title: 'Service Types', icon: Layers, section: 'admin' },
  { key: 'shopify-settings', title: 'Shopify Settings', icon: ShoppingBag, section: 'admin' },
  { key: 'settings', title: 'Settings', icon: Settings, section: 'admin' },
];

// Default permissions for each role
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  basic: ['dashboard', 'messages', 'calendar', 'lodging', 'grooming', 'clients', 'pets'],
  supervisor: [
    'dashboard', 'messages', 'calendar', 'lodging', 'grooming', 'clients', 'pets',
    'pet-care', 'report-cards', 'subscriptions', 'trait-templates', 'time-clock',
  ],
};

export type RolePermissions = Record<string, string[]>;

const SECTION_LABELS = {
  main: 'Main',
  operations: 'Operations',
  admin: 'Admin',
};

export function RolePermissionsEditor() {
  const { toast } = useToast();
  const { getSetting, updateSetting, isLoading } = useSystemSettings();
  const [permissions, setPermissions] = useState<RolePermissions>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && !initialized) {
      const saved = getSetting<RolePermissions>('role_permissions', DEFAULT_PERMISSIONS);
      setPermissions(saved);
      setInitialized(true);
    }
  }, [isLoading, initialized]);

  const togglePage = (role: string, pageKey: string) => {
    setPermissions(prev => {
      const current = prev[role] || [];
      const updated = current.includes(pageKey)
        ? current.filter(k => k !== pageKey)
        : [...current, pageKey];
      return { ...prev, [role]: updated };
    });
    setHasChanges(true);
  };

  const toggleSection = (role: string, section: string, enable: boolean) => {
    const sectionKeys = ALL_PAGES.filter(p => p.section === section).map(p => p.key);
    setPermissions(prev => {
      const current = prev[role] || [];
      const withoutSection = current.filter(k => !sectionKeys.includes(k));
      return {
        ...prev,
        [role]: enable ? [...withoutSection, ...sectionKeys] : withoutSection,
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: 'role_permissions',
        value: permissions,
        description: 'Configurable page access permissions per staff role',
      });
      toast({ title: 'Permissions saved' });
      setHasChanges(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to save permissions', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !initialized) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const roles: { key: string; label: string; description: string }[] = [
    { key: 'basic', label: 'Basic', description: 'Standard staff members' },
    { key: 'supervisor', label: 'Supervisor', description: 'Team leads with expanded access' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Permissions
            </CardTitle>
            <CardDescription>
              Configure which pages each role can access. Admin always has full access.
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList className="mb-4">
            {roles.map(r => (
              <TabsTrigger key={r.key} value={r.key}>{r.label}</TabsTrigger>
            ))}
            <TabsTrigger value="admin" disabled>
              Admin
              <Badge variant="outline" className="ml-1.5 text-[10px]">Full Access</Badge>
            </TabsTrigger>
          </TabsList>

          {roles.map(role => {
            const rolePerms = permissions[role.key] || [];
            return (
              <TabsContent key={role.key} value={role.key} className="space-y-6">
                <p className="text-sm text-muted-foreground">{role.description}</p>
                
                {(['main', 'operations', 'admin'] as const).map(section => {
                  const sectionPages = ALL_PAGES.filter(p => p.section === section);
                  const allEnabled = sectionPages.every(p => rolePerms.includes(p.key));
                  const someEnabled = sectionPages.some(p => rolePerms.includes(p.key));
                  
                  return (
                    <div key={section} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">
                          {SECTION_LABELS[section]}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleSection(role.key, section, !allEnabled)}
                        >
                          {allEnabled ? 'Disable All' : 'Enable All'}
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {sectionPages.map(page => {
                          const enabled = rolePerms.includes(page.key);
                          const Icon = page.icon;
                          return (
                            <div
                              key={page.key}
                              className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{page.title}</span>
                              </div>
                              <Switch
                                checked={enabled}
                                onCheckedChange={() => togglePage(role.key, page.key)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
