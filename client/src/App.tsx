import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import GlobalKanban from "@/pages/GlobalKanban";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Login from "@/pages/Login";
import { RevenueInsight, ClientsInsight, StoriesInsight, CompletionInsight } from "@/pages/Insights";
import Settings from "@/pages/Settings";
import Internal from "@/pages/Internal";
import Leads from "@/pages/Leads";
import Announcements from "@/pages/Announcements";
import SalaryIncentives from "@/pages/SalaryIncentives";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect } from "react";

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
      <Component {...rest} />
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
