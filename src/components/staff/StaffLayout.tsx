import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { StaffSidebar } from './StaffSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { StaffCodeLock } from './StaffCodeLock';
import { useAuth } from '@/contexts/AuthContext';
import { StaffCodeProvider } from '@/contexts/StaffCodeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';

interface StaffLayoutProps {
  children: ReactNode;
}

export function StaffLayout({ children }: StaffLayoutProps) {
  const { user, loading, isStaffOrAdmin } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/staff/login');
      } else if (!isStaffOrAdmin) {
        navigate('/portal');
      }
    }
  }, [user, loading, isStaffOrAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isStaffOrAdmin) {
    return null;
  }

  if (isMobile) {
    return (
      <StaffCodeProvider>
        <StaffCodeLock />
        <div className="min-h-screen bg-background flex flex-col">
          <header className="h-12 border-b border-border flex items-center px-4 bg-card shrink-0">
            <h1 className="font-medium text-sm">Fella & Fetch</h1>
          </header>
          <div className="flex-1 overflow-auto p-3 pb-20">
            {children}
          </div>
          <MobileBottomNav />
        </div>
      </StaffCodeProvider>
    );
  }

  return (
    <StaffCodeProvider>
      <StaffCodeLock />
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full bg-background">
          <StaffSidebar />
          <main className="flex-1 flex flex-col">
            <header className="h-14 border-b border-border flex items-center px-4 bg-card">
              <SidebarTrigger className="mr-4" />
              <h1 className="font-medium text-lg">Fella & Fetch Staff Portal</h1>
            </header>
            <div className="flex-1 overflow-auto p-6">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </StaffCodeProvider>
  );
}
