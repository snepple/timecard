import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import TimesheetPage from "@/pages/timesheet";
import SupervisorDashboard from "@/pages/supervisor";

function Router() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content */}
      <div className="flex-1">
        <Switch>
          <Route path="/" component={TimesheetPage} />
          <Route path="/supervisor" component={SupervisorDashboard} />
          <Route component={NotFound} />
        </Switch>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Link
            href="/supervisor"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded-md transition-colors"
            data-testid="nav-admin"
          >
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
