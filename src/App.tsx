import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MasterLogin from "./pages/MasterLogin";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import { MasterAccountProvider } from "@/hooks/useMasterAccount";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
// Import simulation helper for development
import "@/dev/simAlerts";
import "@/dev/simFlow";
import "@/dev/testMqtt";
import "@/dev/testAlertEngine";
import "@/dev/seedRules";
import "@/dev/sim";
import { connectMqtt } from "@/services/mqtt";

const queryClient = new QueryClient();

// Initialize MQTT connection
connectMqtt();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <MasterAccountProvider>
            <BrowserRouter future={{ v7_startTransition: true }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/master-login" element={<MasterLogin />} />
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <Index />
                    </AuthGuard>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </MasterAccountProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
