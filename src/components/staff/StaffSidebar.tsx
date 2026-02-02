import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Dog, 
  ClipboardList, 
  Clock, 
  BarChart3, 
  Settings,
  LogOut,
  HeartPulse,
  UserCog,
  Sparkles,
  ShoppingBag,
  Layers,
  BedDouble,
  Scissors,
  MessageCircle
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const mainNavItems = [
  { title: 'Dashboard', url: '/staff', icon: LayoutDashboard },
  { title: 'Messages', url: '/staff/messages', icon: MessageCircle },
  { title: 'Calendar', url: '/staff/calendar', icon: Calendar },
  { title: 'Lodging', url: '/staff/lodging', icon: BedDouble },
  { title: 'Grooming', url: '/staff/grooming', icon: Scissors },
  { title: 'Clients', url: '/staff/clients', icon: Users },
  { title: 'Pets', url: '/staff/pets', icon: Dog },
];

const operationsItems = [
  { title: 'Pet Care', url: '/staff/pet-care', icon: HeartPulse },
  { title: 'Report Cards', url: '/staff/report-cards', icon: ClipboardList },
  { title: 'Trait Templates', url: '/staff/trait-templates', icon: Sparkles },
  { title: 'Time Clock', url: '/staff/time-clock', icon: Clock },
  { title: 'Analytics', url: '/staff/analytics', icon: BarChart3 },
];

const adminItems = [
  { title: 'User Management', url: '/staff/users', icon: UserCog },
  { title: 'Suite Management', url: '/staff/suites', icon: BedDouble },
  { title: 'Groomer Management', url: '/staff/groomers', icon: Scissors },
  { title: 'Service Types', url: '/staff/service-types', icon: Layers },
  { title: 'Shopify Settings', url: '/staff/shopify-settings', icon: ShoppingBag },
  { title: 'Settings', url: '/staff/settings', icon: Settings },
];

export function StaffSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, isAdmin, user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/staff') {
      return location.pathname === '/staff';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar 
      className={collapsed ? 'w-14' : 'w-64'}
      collapsible="icon"
    >
      <SidebarContent>
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
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === '/staff'}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-2" />

        {/* Operations */}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => (
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

        {/* Admin Only */}
        {isAdmin && (
          <>
            <Separator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
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
        {!collapsed && user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {isAdmin ? 'Administrator' : 'Staff'}
            </p>
          </div>
        )}
        <Button 
          variant="ghost" 
          className={`w-full justify-start ${collapsed ? 'px-2' : ''}`}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
