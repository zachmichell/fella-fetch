import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Scissors,
  Users,
  HeartPulse,
  ClipboardList,
  Repeat,
  Sparkles,
  Clock,
  BarChart3,
  KeyRound,
  Megaphone,
  MessageSquare,
  UserCog,
  Layers,
  ShoppingBag,
  Settings,
  Lock,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffCode } from '@/contexts/StaffCodeContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface MobileMoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mainItems = [
  { title: 'Messages', url: '/staff/messages', icon: MessageSquare },
  { title: 'Clients', url: '/staff/clients', icon: Users },
  { title: 'Pets', url: '/staff/pets', icon: Dog },
];

const operationsItems = [
  { title: 'Pet Care', url: '/staff/pet-care', icon: HeartPulse },
  { title: 'Report Cards', url: '/staff/report-cards', icon: ClipboardList },
  { title: 'Subscriptions', url: '/staff/subscriptions', icon: Repeat },
  { title: 'Trait Templates', url: '/staff/trait-templates', icon: Sparkles },
  { title: 'Time Clock', url: '/staff/time-clock', icon: Clock },
];

const adminOnlyOperationsItems = [
  { title: 'Analytics', url: '/staff/analytics', icon: BarChart3 },
];

const adminItems = [
  { title: 'Staff Codes', url: '/staff/staff-management', icon: KeyRound },
  { title: 'Marketing', url: '/staff/marketing', icon: Megaphone },
  { title: 'SMS & Comms', url: '/staff/communications', icon: MessageSquare },
  { title: 'User Management', url: '/staff/users', icon: UserCog },
  { title: 'Suite Management', url: '/staff/suites', icon: BedDouble },
  { title: 'Groomer Management', url: '/staff/groomers', icon: Scissors },
  { title: 'Service Types', url: '/staff/service-types', icon: Layers },
  { title: 'Shopify Settings', url: '/staff/shopify-settings', icon: ShoppingBag },
  { title: 'Settings', url: '/staff/settings', icon: Settings },
];

export function MobileMoreMenu({ open, onOpenChange }: MobileMoreMenuProps) {
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { currentStaff, isCodeAdmin, isSupervisorOrAbove, lock } = useStaffCode();

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
          {/* Main extras */}
          <div className="space-y-0.5">
            {mainItems.map((item) => (
              <MenuItem key={item.title} item={item} />
            ))}
          </div>

          {/* Operations */}
          {isSupervisorOrAbove && (
            <>
              <Separator className="my-3" />
              <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operations</p>
              <div className="space-y-0.5">
                {operationsItems.map((item) => (
                  <MenuItem key={item.title} item={item} />
                ))}
                {isCodeAdmin && adminOnlyOperationsItems.map((item) => (
                  <MenuItem key={item.title} item={item} />
                ))}
              </div>
            </>
          )}

          {/* Admin */}
          {isAdmin && isCodeAdmin && (
            <>
              <Separator className="my-3" />
              <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
              <div className="space-y-0.5">
                {adminItems.map((item) => (
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
