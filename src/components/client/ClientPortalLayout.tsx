import { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClientSidebar } from './ClientSidebar';
import Header from '@/components/layout/Header';
import { Calendar, LogOut, Loader2, User, Menu } from 'lucide-react';

interface ClientPortalLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function ClientPortalLayout({ children, title, description }: ClientPortalLayoutProps) {
  const navigate = useNavigate();
  const {
    signOut,
    loading: authLoading,
    isAuthenticated,
    shopifyCustomer,
    clientData: contextClientData,
  } = useClientAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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

  // No client record
  if (!contextClientData && !authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-28 pb-12">
          <div className="container-app">
            <Card className="max-w-lg mx-auto">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>No Client Profile Found</CardTitle>
                <CardDescription>
                  Your account isn't linked to a client profile yet. Please contact us to set up your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/contact">
                  <Button className="w-full">Contact Us</Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

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
                  <SidebarTrigger className="lg:hidden">
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
                <div className="flex gap-3">
                  <Link to="/book">
                    <Button className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Book Appointment
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={handleSignOut} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
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
