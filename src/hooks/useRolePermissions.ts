import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStaffCode } from '@/contexts/StaffCodeContext';

// Page key to route mapping
const PAGE_ROUTE_MAP: Record<string, string> = {
  'dashboard': '/staff',
  'messages': '/staff/messages',
  'calendar': '/staff/calendar',
  'lodging': '/staff/lodging',
  'grooming': '/staff/grooming',
  'clients': '/staff/clients',
  'pets': '/staff/pets',
  'pet-care': '/staff/pet-care',
  'report-cards': '/staff/report-cards',
  'subscriptions': '/staff/subscriptions',
  'trait-templates': '/staff/trait-templates',
  'time-clock': '/staff/time-clock',
  'analytics': '/staff/analytics',
  'staff-management': '/staff/staff-management',
  'marketing': '/staff/marketing',
  'communications': '/staff/communications',
  'users': '/staff/users',
  'suites': '/staff/suites',
  'groomers': '/staff/groomers',
  'service-types': '/staff/service-types',
  'shopify-settings': '/staff/shopify-settings',
  'settings': '/staff/settings',
};

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  basic: ['dashboard', 'messages', 'calendar', 'lodging', 'grooming', 'clients', 'pets'],
  supervisor: [
    'dashboard', 'messages', 'calendar', 'lodging', 'grooming', 'clients', 'pets',
    'pet-care', 'report-cards', 'subscriptions', 'trait-templates', 'time-clock',
  ],
};

export function useRolePermissions() {
  const { staffRole, isCodeAdmin } = useStaffCode();
  const [permissions, setPermissions] = useState<Record<string, string[]>>(DEFAULT_PERMISSIONS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'role_permissions')
          .single();
        
        if (!error && data?.value && typeof data.value === 'object') {
          setPermissions(data.value as Record<string, string[]>);
        }
      } catch {
        // use defaults
      }
      setLoaded(true);
    };
    fetch();
  }, []);

  // Admin always has access to everything
  const hasPageAccess = (pageKey: string): boolean => {
    if (!staffRole) return false;
    if (isCodeAdmin) return true;
    const rolePerms = permissions[staffRole] || [];
    return rolePerms.includes(pageKey);
  };

  const hasRouteAccess = (route: string): boolean => {
    if (!staffRole) return false;
    if (isCodeAdmin) return true;
    
    // Find the page key for this route
    const entry = Object.entries(PAGE_ROUTE_MAP).find(([_, r]) => {
      if (r === '/staff') return route === '/staff';
      return route.startsWith(r);
    });
    
    if (!entry) return true; // Unknown routes default to accessible
    return hasPageAccess(entry[0]);
  };

  const getAllowedPages = (): string[] => {
    if (!staffRole) return [];
    if (isCodeAdmin) return Object.keys(PAGE_ROUTE_MAP);
    return permissions[staffRole] || [];
  };

  return { hasPageAccess, hasRouteAccess, getAllowedPages, loaded, PAGE_ROUTE_MAP };
}
