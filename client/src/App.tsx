import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect, lazy, Suspense } from "react";

// Each page is its own chunk so the first screen only downloads what it shows
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const GlobalKanban = lazy(() => import("@/pages/GlobalKanban"));
const Clients = lazy(() => import("@/pages/Clients"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const Settings = lazy(() => import("@/pages/Settings"));
const Internal = lazy(() => import("@/pages/Internal"));
const Leads = lazy(() => import("@/pages/Leads"));
const Announcements = lazy(() => import("@/pages/Announcements"));
const SalaryIncentives = lazy(() => import("@/pages/SalaryIncentives"));
const AuditLog = lazy(() => import("@/pages/AuditLog"));
const TeamPerformance = lazy(() => import("@/pages/TeamPerformance"));
const EmployeeServices = lazy(() => import("@/pages/EmployeeServices"));
const RecurringTasks = lazy(() => import("@/pages/RecurringTasks"));
const RevenueInsight = lazy(() => import("@/pages/Insights").then((m) => ({ default: m.RevenueInsight })));
const ClientsInsight = lazy(() => import("@/pages/Insights").then((m) => ({ default: m.ClientsInsight })));
const StoriesInsight = lazy(() => import("@/pages/Insights").then((m) => ({ default: m.StoriesInsight })));
const CompletionInsight = lazy(() => import("@/pages/Insights").then((m) => ({ default: m.CompletionInsight })));

// Wrapper to protect routes
function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null; // Or a loading spinner

  if (!user) return null;

  return (
    <Layout>
      <Suspense fallback={<div className="h-[50vh] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
        <Component {...rest} />
      </Suspense>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Login} />
      
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/global-kanban">
        <ProtectedRoute component={GlobalKanban} />
      </Route>
      <Route path="/clients">
        <ProtectedRoute component={Clients} />
      </Route>
      <Route path="/clients/:id">
        <ProtectedRoute component={ClientDetail} />
      </Route>
      <Route path="/insights/revenue">
        <ProtectedRoute component={RevenueInsight} />
      </Route>
      <Route path="/insights/clients">
        <ProtectedRoute component={ClientsInsight} />
      </Route>
      <Route path="/insights/stories">
        <ProtectedRoute component={StoriesInsight} />
      </Route>
      <Route path="/insights/completion">
        <ProtectedRoute component={CompletionInsight} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/internal">
        <ProtectedRoute component={Internal} />
      </Route>
      <Route path="/leads">
        <ProtectedRoute component={Leads} />
      </Route>
      <Route path="/announcements">
        <ProtectedRoute component={Announcements} />
      </Route>
      <Route path="/salary">
        <ProtectedRoute component={SalaryIncentives} />
      </Route>
      <Route path="/audit-log">
        <ProtectedRoute component={AuditLog} />
      </Route>
      <Route path="/team">
        <ProtectedRoute component={TeamPerformance} />
      </Route>
      <Route path="/services">
        <ProtectedRoute component={EmployeeServices} />
      </Route>
      <Route path="/recurring">
        <ProtectedRoute component={RecurringTasks} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
