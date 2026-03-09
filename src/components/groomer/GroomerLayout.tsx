import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { GroomerSidebar } from './GroomerSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface GroomerLayoutProps {
  children: ReactNode;
}

export function GroomerLayout({ children }: GroomerLayoutProps) {
  const { user, loading, isGroomer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/groomer/login');
      } else if (!isGroomer) {
        navigate('/');
      }
    }
  }, [user, loading, isGroomer, navigate]);

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

  if (!user || !isGroomer) return null;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <GroomerSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 bg-card">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-medium text-lg">Groomer Portal</h1>
          </header>
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
