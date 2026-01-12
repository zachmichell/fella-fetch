import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { StaffSidebar } from './StaffSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface StaffLayoutProps {
  children: ReactNode;
}

export function StaffLayout({ children }: StaffLayoutProps) {
  const { user, loading, isStaffOrAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/staff/login');
      } else if (!isStaffOrAdmin) {
        // User is logged in but doesn't have staff/admin role
        // They can still see the dashboard but with limited access
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

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StaffSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 bg-card">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-medium text-lg">Fella & Fetch Staff Portal</h1>
          </header>
          <div className="flex-1 overflow-auto p-6">
            {!isStaffOrAdmin && (
              <div className="mb-6 p-4 rounded-lg bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>Limited Access:</strong> Your account doesn't have staff permissions yet. 
                  Please contact an administrator to grant you access.
                </p>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
