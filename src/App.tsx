import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
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
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientProfile from "./pages/client/ClientProfile";
import ClientPets from "./pages/client/ClientPets";
import ClientPurchases from "./pages/client/ClientPurchases";
import ClientHistory from "./pages/client/ClientHistory";
// Staff pages
import StaffLogin from "./pages/staff/StaffLogin";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffCalendar from "./pages/staff/StaffCalendar";
import StaffLodgingCalendar from "./pages/staff/StaffLodgingCalendar";
import StaffGroomingCalendar from "./pages/staff/StaffGroomingCalendar";
import StaffClients from "./pages/staff/StaffClients";
import StaffPets from "./pages/staff/StaffPets";
import StaffReportCards from "./pages/staff/StaffReportCards";
import StaffTimeClock from "./pages/staff/StaffTimeClock";
import StaffAnalytics from "./pages/staff/StaffAnalytics";
import StaffUsers from "./pages/staff/StaffUsers";
import StaffTraitTemplates from "./pages/staff/StaffTraitTemplates";
import StaffShopifySettings from "./pages/staff/StaffShopifySettings";
import StaffServiceTypes from "./pages/staff/StaffServiceTypes";
import StaffSettings from "./pages/staff/StaffSettings";
import StaffSuites from "./pages/staff/StaffSuites";
import StaffGroomers from "./pages/staff/StaffGroomers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ClientAuthProvider>
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
              <Route path="/portal" element={<ClientDashboard />} />
              <Route path="/portal/profile" element={<ClientProfile />} />
              <Route path="/portal/pets" element={<ClientPets />} />
              <Route path="/portal/purchases" element={<ClientPurchases />} />
              <Route path="/portal/history" element={<ClientHistory />} />
              {/* Staff Portal Routes */}
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/staff" element={<StaffDashboard />} />
              <Route path="/staff/calendar" element={<StaffCalendar />} />
              <Route path="/staff/lodging" element={<StaffLodgingCalendar />} />
              <Route path="/staff/grooming" element={<StaffGroomingCalendar />} />
              <Route path="/staff/clients" element={<StaffClients />} />
              <Route path="/staff/pets" element={<StaffPets />} />
              <Route path="/staff/report-cards" element={<StaffReportCards />} />
              <Route path="/staff/time-clock" element={<StaffTimeClock />} />
              <Route path="/staff/analytics" element={<StaffAnalytics />} />
              <Route path="/staff/users" element={<StaffUsers />} />
              <Route path="/staff/trait-templates" element={<StaffTraitTemplates />} />
              <Route path="/staff/service-types" element={<StaffServiceTypes />} />
              <Route path="/staff/shopify-settings" element={<StaffShopifySettings />} />
              <Route path="/staff/suites" element={<StaffSuites />} />
              <Route path="/staff/groomers" element={<StaffGroomers />} />
              <Route path="/staff/settings" element={<StaffSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ClientAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
