
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/sonner";
import Index from "./pages/Index";
import Subscription from "./pages/Subscription";
import Renewal from "./pages/Renewal";
import DeliveryPage from "./pages/DeliveryPage";
import NotFound from "./pages/NotFound";
import AdminLoginPage from "./pages/AdminLogin";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminPlans } from "./pages/AdminPlans";
import { AdminPanels } from "./pages/AdminPanels";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminDiscounts } from "./pages/AdminDiscounts";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/renewal" element={<Renewal />} />
              <Route path="/delivery/:id" element={<DeliveryPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/panels" element={<AdminPanels />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/discounts" element={<AdminDiscounts />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
