import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, Users, Dog, ClipboardList, Clock,
  BarChart3, Settings, LogOut, HeartPulse, UserCog, Sparkles,
  ShoppingBag, Layers, BedDouble, Scissors, MessageCircle,
  MessageSquare, Repeat, Megaphone, Lock, KeyRound
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffCode } from '@/contexts/StaffCodeContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const mainNavItems = [
  { key: 'dashboard', title: 'Dashboard', url: '/staff', icon: LayoutDashboard },
  { key: 'messages', title: 'Messages', url: '/staff/messages', icon: MessageCircle, showUnread: true },
  { key: 'calendar', title: 'Calendar', url: '/staff/calendar', icon: Calendar },
  { key: 'lodging', title: 'Lodging', url: '/staff/lodging', icon: BedDouble },
  { key: 'grooming', title: 'Grooming', url: '/staff/grooming', icon: Scissors },
  { key: 'clients', title: 'Clients', url: '/staff/clients', icon: Users },
  { key: 'pets', title: 'Pets', url: '/staff/pets', icon: Dog },
];

const operationsItems = [
  { key: 'pet-care', title: 'Pet Care', url: '/staff/pet-care', icon: HeartPulse },
  { key: 'report-cards', title: 'Report Cards', url: '/staff/report-cards', icon: ClipboardList },
  { key: 'subscriptions', title: 'Subscriptions', url: '/staff/subscriptions', icon: Repeat },
  { key: 'trait-templates', title: 'Trait Templates', url: '/staff/trait-templates', icon: Sparkles },
  { key: 'time-clock', title: 'Time Clock', url: '/staff/time-clock', icon: Clock },
  { key: 'analytics', title: 'Analytics', url: '/staff/analytics', icon: BarChart3 },
];

const adminItems = [
  { key: 'staff-management', title: 'Staff Codes', url: '/staff/staff-management', icon: KeyRound },
  { key: 'marketing', title: 'Marketing', url: '/staff/marketing', icon: Megaphone },
  { key: 'communications', title: 'SMS & Comms', url: '/staff/communications', icon: MessageSquare },
  { key: 'users', title: 'User Management', url: '/staff/users', icon: UserCog },
  { key: 'suites', title: 'Suite Management', url: '/staff/suites', icon: BedDouble },
  { key: 'groomers', title: 'Groomer Management', url: '/staff/groomers', icon: Scissors },
  { key: 'service-types', title: 'Service Types', url: '/staff/service-types', icon: Layers },
  { key: 'shopify-settings', title: 'Shopify Settings', url: '/staff/shopify-settings', icon: ShoppingBag },
  { key: 'settings', title: 'Settings', url: '/staff/settings', icon: Settings },
];

export function StaffSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, isAdmin } = useAuth();
  const { currentStaff, isCodeAdmin, lock } = useStaffCode();
  const { unreadCount } = useUnreadMessages();
  const { hasPageAccess } = useRolePermissions();

  const isActive = (path: string) => {
    if (path === '/staff') return location.pathname === '/staff';
    return location.pathname.startsWith(path);
  };

  const visibleMainItems = mainNavItems.filter(item => hasPageAccess(item.key));
  const visibleOpsItems = operationsItems.filter(item => hasPageAccess(item.key));
  const visibleAdminItems = adminItems.filter(item => hasPageAccess(item.key));

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-64'} collapsible="icon">
      <SidebarContent className="overflow-y-auto">
        {/* Logo Section */}
        <div className={`p-4 border-b border-sidebar-border ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground flex-shrink-0">
              <Dog className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-semibold text-sm">Fella & Fetch</h2>
                <p className="text-xs text-muted-foreground">Staff Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        {visibleMainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end={item.url === '/staff'}>
                        <div className="relative">
                          <item.icon className="h-4 w-4" />
                          {item.showUnread && unreadCount > 0 && collapsed && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                          )}
                        </div>
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            {item.showUnread && unreadCount > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </Badge>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Operations */}
        {visibleOpsItems.length > 0 && (
          <>
            <Separator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel>Operations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleOpsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Admin */}
        {isAdmin && isCodeAdmin && visibleAdminItems.length > 0 && (
          <>
            <Separator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleAdminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && currentStaff && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium truncate">{currentStaff.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{currentStaff.role}</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button variant="ghost" className={`w-full justify-start ${collapsed ? 'px-2' : ''}`} onClick={lock}>
            <Lock className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Lock</span>}
          </Button>
          <Button variant="ghost" className={`w-full justify-start ${collapsed ? 'px-2' : ''}`} onClick={signOut}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
