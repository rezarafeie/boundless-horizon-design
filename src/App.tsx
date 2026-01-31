
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import Index from "./pages/Index";
import Subscription from "./pages/Subscription";
import Renewal from "./pages/Renewal";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminPlans from "./pages/AdminPlans";
import AdminPanels from "./pages/AdminPanels";
import AdminDiscounts from "./pages/AdminDiscounts";
import AdminTests from "./pages/AdminTests";
import AdminReports from "./pages/AdminReports";
import AdminTelegramBot from "./pages/AdminTelegramBot";
import AdminWebhook from "./pages/AdminWebhook";
import AdminServices from "./pages/AdminServices";
import AdminApproveOrder from "./pages/AdminApproveOrder";
import AdminRejectOrder from "./pages/AdminRejectOrder";
import AdminManualVpn from "./pages/AdminManualVpn";
import OrderDetail from "./pages/OrderDetail";
import DeliveryPage from "./pages/DeliveryPage";
import SubscriptionDelivery from "./pages/SubscriptionDelivery";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";
import MobileApp from "./pages/MobileApp";
import MobileSubscriptions from "./pages/MobileSubscriptions";
import InstallApp from "./pages/InstallApp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ConnectionStatus />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/renewal" element={<Renewal />} />
              {/* Mobile App Routes */}
              <Route path="/app" element={<MobileApp />} />
              <Route path="/app/subscriptions" element={<MobileSubscriptions />} />
              <Route path="/install" element={<InstallApp />} />
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/panels" element={<AdminPanels />} />
              <Route path="/admin/discounts" element={<AdminDiscounts />} />
              <Route path="/admin/tests" element={<AdminTests />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/telegrambot" element={<AdminTelegramBot />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/webhook" element={<AdminWebhook />} />
              <Route path="/admin/manual-vpn" element={<AdminManualVpn />} />
              <Route path="/admin/approve-order/:id" element={<AdminApproveOrder />} />
              <Route path="/admin/reject-order/:id" element={<AdminRejectOrder />} />
              <Route path="/order/:id" element={<OrderDetail />} />
              <Route path="/delivery" element={<DeliveryPage />} />
              <Route path="/subscription-delivery" element={<SubscriptionDelivery />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
