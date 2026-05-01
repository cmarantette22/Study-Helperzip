import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProjectDetail from "@/pages/project-detail";
import QuestionDetail from "@/pages/question-detail";
import OutlineSectionDetail from "@/pages/outline-section-detail";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ChangePassword from "@/pages/change-password";
import AdminUsers from "@/pages/admin-users";
import ManageAccount from "@/pages/manage-account";
import Subscription from "@/pages/subscription";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const queryClient = new QueryClient();

function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const user = auth.user;
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    if (!user || user.role === "admin" || user.subscriptionStatus === "active") {
      // Already active or no sync needed — just clean up the URL
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    setSyncing(true);
    fetch(`${BASE}/api/stripe/checkout-complete`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setSyncError(data.error);
        } else {
          auth.refetchUser();
        }
      })
      .catch(() => setSyncError("Could not confirm your subscription. Please refresh."))
      .finally(() => {
        setSyncing(false);
        window.history.replaceState({}, "", window.location.pathname);
      });
  }, []);

  if (!user) return null;
  if (user.role === "admin") return <>{children}</>;

  if (syncing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Confirming your subscription…</h2>
          <p className="text-slate-600">Just a moment while we activate your account.</p>
        </div>
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Payment received — activation pending</h2>
          <p className="text-slate-600 mb-6">{syncError}</p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    );
  }

  const status = user.subscriptionStatus;

  if (status === "paused") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Subscription Paused</h2>
          <p className="text-slate-600 mb-6">
            Your subscription is paused. Resume it to access your study materials.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/subscription")}>Manage Subscription</Button>
            <Button variant="ghost" className="text-slate-500 text-sm" onClick={() => auth.logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!status || status === "none" || status === "canceled") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Subscription Required</h2>
          <p className="text-slate-600 mb-6">
            A subscription is required to access Study Buddy. Choose a plan to get started.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/subscription")}>View Plans</Button>
            <Button variant="ghost" className="text-slate-500 text-sm" onClick={() => auth.logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function LogoutPage() {
  const { logout } = useAuth();
  useEffect(() => {
    logout().finally(() => {
      window.location.replace(import.meta.env.BASE_URL || "/");
    });
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  // /logout always works regardless of auth state
  if (window.location.pathname.endsWith("/logout")) {
    return <LogoutPage />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/signup" component={Signup} />
        <Route component={Login} />
      </Switch>
    );
  }

  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  return (
    <Switch>
      <Route path="/logout" component={LogoutPage} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/manage-account" component={ManageAccount} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route>
        <SubscriptionGate>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/project/:id" component={ProjectDetail} />
            <Route path="/project/:id/outline/:sectionId" component={OutlineSectionDetail} />
            <Route path="/question/:id" component={QuestionDetail} />
            <Route component={NotFound} />
          </Switch>
        </SubscriptionGate>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
