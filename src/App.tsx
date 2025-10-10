import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MasterLogin from "./pages/MasterLogin";
import MasterOverview from "./pages/master/Overview";
import MasterDashboard from "./pages/master/MasterDashboard";
import MasterQA from "./pages/master/QA";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import { MasterAccountProvider } from "@/hooks/useMasterAccount";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RequireMaster } from "@/components/auth/RequireRole";
import { MasterLayout } from "@/components/master/MasterLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
// Import simulation helper for development
import "@/dev/simAlerts";
import "@/dev/simFlow";
import "@/dev/testMqtt";
import "@/dev/testAlertEngine";
import "@/dev/seedRules";
import "@/dev/sim";
import "@/dev/testMasterAggregations";
import "@/dev/testMasterDashboard";
import "@/dev/testAggregations";
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
                <Route
                  path="/master"
                  element={
                    <AuthGuard>
                      <RequireMaster>
                        <MasterDashboard />
                      </RequireMaster>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/master/qa"
                  element={
                    <AuthGuard>
                      <RequireMaster>
                        <MasterLayout title="QA Testing" subtitle="Test checklist for master dashboard functionality">
                          <MasterQA />
                        </MasterLayout>
                      </RequireMaster>
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
