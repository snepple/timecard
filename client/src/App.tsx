import React, { useState } from "react";
import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import TimesheetPage from "@/pages/timesheet";
import SupervisorDashboard from "@/pages/supervisor";
import LoginScreen from "@/components/LoginScreen";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";

function AuthenticatedRouter() {
  const { isAppAuthenticated, isAdminAuthenticated, logout } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Show app login if not authenticated
  if (!isAppAuthenticated) {
    return (
      <LoginScreen 
        type="app" 
        onSuccess={() => {
          // App authenticated, continue to main app
        }} 
      />
    );
  }

  // Show admin login dialog if accessing supervisor area without admin auth
  const SupervisorRoute = () => {
    if (!isAdminAuthenticated) {
      return (
        <LoginScreen 
          type="admin" 
          onSuccess={() => {
            setShowAdminLogin(false);
          }} 
        />
      );
    }
    return <SupervisorDashboard />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with logout */}
      <header className="bg-white border-b border-gray-200 py-2">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-gray-700">
              Oakland Fire-Rescue Timesheet System
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-gray-600 hover:text-gray-900"
            data-testid="logout-button"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1">
        <Switch>
          <Route path="/" component={TimesheetPage} />
          <Route path="/supervisor" component={SupervisorRoute} />
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
            <Shield className="h-4 w-4 mr-2" />
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
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AuthenticatedRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
