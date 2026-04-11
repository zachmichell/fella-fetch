import { useNavigate } from 'react-router-dom';
import {
  Dog, Users, HeartPulse, ClipboardList, Repeat, Sparkles, Clock,
  BarChart3, KeyRound, Megaphone, MessageSquare, UserCog, BedDouble,
  Scissors, Layers, ShoppingBag, Settings, Lock, LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffCode } from '@/contexts/StaffCodeContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface MobileMoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mainItems = [
  { key: 'messages', title: 'Messages', url: '/staff/messages', icon: MessageSquare },
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

export function MobileMoreMenu({ open, onOpenChange }: MobileMoreMenuProps) {
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { currentStaff, isCodeAdmin, lock } = useStaffCode();
  const { hasPageAccess } = useRolePermissions();

  const goTo = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  const MenuItem = ({ item }: { item: { title: string; url: string; icon: any } }) => (
    <button
      onClick={() => goTo(item.url)}
      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 active:bg-muted rounded-lg transition-colors"
    >
      <item.icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm font-medium">{item.title}</span>
    </button>
  );

  const visibleMainItems = mainItems.filter(i => hasPageAccess(i.key));
  const visibleOpsItems = operationsItems.filter(i => hasPageAccess(i.key));
  const visibleAdminItems = adminItems.filter(i => hasPageAccess(i.key));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl pb-20">
        <SheetHeader className="pb-2">
          <SheetTitle>
            {currentStaff ? (
              <div>
                <p className="text-base">{currentStaff.name}</p>
                <p className="text-xs text-muted-foreground capitalize font-normal">{currentStaff.role}</p>
              </div>
            ) : 'Menu'}
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto flex-1 -mx-2">
          {visibleMainItems.length > 0 && (
            <div className="space-y-0.5">
              {visibleMainItems.map((item) => (
                <MenuItem key={item.title} item={item} />
              ))}
            </div>
          )}

          {visibleOpsItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operations</p>
              <div className="space-y-0.5">
                {visibleOpsItems.map((item) => (
                  <MenuItem key={item.title} item={item} />
                ))}
              </div>
            </>
          )}

          {isAdmin && isCodeAdmin && visibleAdminItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
              <div className="space-y-0.5">
                {visibleAdminItems.map((item) => (
                  <MenuItem key={item.title} item={item} />
                ))}
              </div>
            </>
          )}

          <Separator className="my-3" />
          <div className="space-y-0.5">
            <button
              onClick={() => { lock(); onOpenChange(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 active:bg-muted rounded-lg transition-colors"
            >
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Lock</span>
            </button>
            <button
              onClick={() => { signOut(); onOpenChange(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 active:bg-muted rounded-lg transition-colors text-destructive"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
