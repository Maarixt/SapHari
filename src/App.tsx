import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MasterLogin from "./pages/MasterLogin";
import MasterDashboard from "./pages/master/MasterDashboard";
import MQTTSetup from "./pages/docs/MQTTSetup";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import { MasterAccountProvider } from "@/hooks/useMasterAccount";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RequireMaster } from "@/components/auth/RequireRole";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { connectMqtt } from "@/services/mqtt";
import { NotificationPermissionBanner } from "@/components/alerts/NotificationPermissionBanner";
import AlertRulesModal from "@/components/alerts/AlertRulesModal";

// App pages
import { AppLayout } from "@/components/layout/AppLayout";
import DevicesPage from "@/pages/app/DevicesPage";
import AutomationsPage from "@/pages/app/AutomationsPage";
import AlertsPage from "@/pages/app/AlertsPage";
import MembersPage from "@/pages/app/MembersPage";
import InvitesPage from "@/pages/app/InvitesPage";
import SettingsPage from "@/pages/app/SettingsPage";

const queryClient = new QueryClient();

// Initialize MQTT connection
connectMqtt();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AlertRulesModal />
        <NotificationPermissionBanner />
        <AuthProvider>
          <MasterAccountProvider>
            <BrowserRouter future={{ v7_startTransition: true }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/master-login" element={<MasterLogin />} />
                
                {/* Redirect root to /app/devices */}
                <Route path="/" element={<Navigate to="/app/devices" replace />} />
                
                {/* App routes with sidebar layout */}
                <Route
                  path="/app"
                  element={
                    <AuthGuard>
                      <AppLayout />
                    </AuthGuard>
                  }
                >
                  <Route index element={<Navigate to="devices" replace />} />
                  <Route path="devices" element={<DevicesPage />} />
                  <Route path="automations" element={<AutomationsPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                  <Route path="org/members" element={<MembersPage />} />
                  <Route path="org/invites" element={<InvitesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

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
                  path="/docs/mqtt"
                  element={
                    <AuthGuard>
                      <MQTTSetup />
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
