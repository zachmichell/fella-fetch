import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  BedDouble,
  Scissors,
  MoreHorizontal
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useState } from 'react';
import { MobileMoreMenu } from './MobileMoreMenu';

const bottomNavItems = [
  { title: 'Dashboard', url: '/staff', icon: LayoutDashboard },
  { title: 'Calendar', url: '/staff/calendar', icon: Calendar },
  { title: 'Lodging', url: '/staff/lodging', icon: BedDouble },
  { title: 'Grooming', url: '/staff/grooming', icon: Scissors },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/staff') return location.pathname === '/staff';
    return location.pathname.startsWith(path);
  };

  // Check if current route is one of the "more" routes
  const moreRoutes = [
    '/staff/messages', '/staff/clients', '/staff/pets', '/staff/pet-care',
    '/staff/report-cards', '/staff/subscriptions', '/staff/trait-templates',
    '/staff/time-clock', '/staff/analytics', '/staff/staff-management',
    '/staff/marketing', '/staff/communications', '/staff/users', '/staff/suites',
    '/staff/groomers', '/staff/service-types', '/staff/shopify-settings', '/staff/settings'
  ];
  const isMoreActive = moreRoutes.some(r => location.pathname.startsWith(r));

  return (
    <>
      <MobileMoreMenu open={moreOpen} onOpenChange={setMoreOpen} />
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => {
            const active = isActive(item.url);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              >
                <div className="relative">
                  <item.icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  {item.showUnread && unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-3 h-4 min-w-4 px-1 text-[10px]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </div>
                <span className={`text-[10px] ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {item.title}
                </span>
              </NavLink>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
          >
            <MoreHorizontal className={`h-5 w-5 ${isMoreActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-[10px] ${isMoreActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
