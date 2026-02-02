import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { User, Dog, ShoppingBag, History, CalendarDays, FileText, MessageCircle } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useClientUnreadMessages } from '@/hooks/useClientUnreadMessages';

const menuItems = [
  { title: 'Dashboard', url: '/portal', icon: CalendarDays },
  { title: 'Messages', url: '/portal/messages', icon: MessageCircle, showUnread: true },
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
  const { clientData } = useClientAuth();
  const { unreadCount } = useClientUnreadMessages(clientData?.id);

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
                      <div className="relative">
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.showUnread && unreadCount > 0 && collapsed && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                        )}
                      </div>
                      {!collapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {item.showUnread && unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                              {unreadCount > 9 ? '9+' : unreadCount}
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
      </SidebarContent>
    </Sidebar>
  );
}

export default ClientSidebar;
