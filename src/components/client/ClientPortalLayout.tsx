import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClientSidebar } from './ClientSidebar';
import Header from '@/components/layout/Header';
import { Loader2, Menu } from 'lucide-react';

interface ClientPortalLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function ClientPortalLayout({ children, title, description }: ClientPortalLayoutProps) {
  const navigate = useNavigate();
  const {
    loading: authLoading,
    isAuthenticated,
    shopifyCustomer,
    clientData: contextClientData,
  } = useClientAuth();


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  // Use Shopify customer name if no client record exists
  const displayName = contextClientData?.first_name || shopifyCustomer?.firstName || 'Customer';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SidebarProvider>
        <div className="flex min-h-screen w-full pt-20">
          <ClientSidebar />
          <main className="flex-1 p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Header with sidebar trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="lg:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors">
                    <Menu className="h-5 w-5" />
                  </SidebarTrigger>
                  <div>
                    <h1 className="text-2xl font-display font-semibold tracking-tight">
                      {title || `Welcome, ${displayName}!`}
                    </h1>
                    {description && (
                      <p className="text-muted-foreground mt-1">{description}</p>
                    )}
                  </div>
                </div>
              </div>

              {children}
            </motion.div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}

export default ClientPortalLayout;
