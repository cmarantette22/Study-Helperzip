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

const queryClient = new QueryClient();

function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const user = auth.user;

  if (!user) return null;

  if (user.role === "admin") return <>{children}</>;

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
          <Button onClick={() => navigate("/subscription")}>Manage Subscription</Button>
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
          <Button onClick={() => navigate("/subscription")}>View Plans</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

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
