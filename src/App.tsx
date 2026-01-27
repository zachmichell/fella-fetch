import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ServicesOverview from "./pages/ServicesOverview";
import ServicePage from "./pages/ServicePage";
import BookingPage from "./pages/BookingPage";
import PricingPage from "./pages/PricingPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import NotFound from "./pages/NotFound";
// Client pages
import ClientLogin from "./pages/client/ClientLogin";
import ClientPortal from "./pages/client/ClientPortal";
// Staff pages
import StaffLogin from "./pages/staff/StaffLogin";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffCalendar from "./pages/staff/StaffCalendar";
import StaffClients from "./pages/staff/StaffClients";
import StaffPets from "./pages/staff/StaffPets";
import StaffReportCards from "./pages/staff/StaffReportCards";
import StaffTimeClock from "./pages/staff/StaffTimeClock";
import StaffAnalytics from "./pages/staff/StaffAnalytics";
import StaffUsers from "./pages/staff/StaffUsers";
import StaffTraitTemplates from "./pages/staff/StaffTraitTemplates";
import StaffShopifySettings from "./pages/staff/StaffShopifySettings";
import StaffServiceTypes from "./pages/staff/StaffServiceTypes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<ServicesOverview />} />
            <Route path="/services/:serviceType" element={<ServicePage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about" element={<AboutPage />} />
            {/* Client Portal Routes */}
            <Route path="/login" element={<ClientLogin />} />
            <Route path="/portal" element={<ClientPortal />} />
            {/* Staff Portal Routes */}
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff" element={<StaffDashboard />} />
            <Route path="/staff/calendar" element={<StaffCalendar />} />
            <Route path="/staff/clients" element={<StaffClients />} />
            <Route path="/staff/pets" element={<StaffPets />} />
            <Route path="/staff/report-cards" element={<StaffReportCards />} />
            <Route path="/staff/time-clock" element={<StaffTimeClock />} />
            <Route path="/staff/analytics" element={<StaffAnalytics />} />
            <Route path="/staff/users" element={<StaffUsers />} />
            <Route path="/staff/trait-templates" element={<StaffTraitTemplates />} />
            <Route path="/staff/service-types" element={<StaffServiceTypes />} />
            <Route path="/staff/shopify-settings" element={<StaffShopifySettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
