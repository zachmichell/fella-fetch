import { useLocation, useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { User, Dog, ShoppingBag, History, CalendarDays, FileText, MessageCircle, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useClientAuth } from '@/contexts/ClientAuthContext';

const menuItems = [
  { title: 'Dashboard', url: '/portal', icon: CalendarDays },
  { title: 'Messages', url: '/portal/messages', icon: MessageCircle },
  { title: 'Profile', url: '/portal/profile', icon: User },
  { title: 'Pets', url: '/portal/pets', icon: Dog },
  { title: 'Agreements', url: '/portal/agreements', icon: FileText },
  { title: 'Purchase History', url: '/portal/purchases', icon: ShoppingBag },
  { title: 'Past Appointments', url: '/portal/history', icon: History },
];

export function ClientSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClientAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === '/portal'}
                      className="flex items-center gap-3"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={`w-full justify-start gap-3 text-muted-foreground hover:text-foreground ${collapsed ? 'px-2' : ''}`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export default ClientSidebar;
