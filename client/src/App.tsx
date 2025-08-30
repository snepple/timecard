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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <main className="flex-1 pb-safe">
        <Switch>
          <Route path="/" component={() => <TimesheetPage logout={logout} />} />
          <Route path="/supervisor" component={SupervisorRoute} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      {/* Footer */}
      <footer className="bg-secondary/20 py-2 px-4">
        <div className="flex justify-end">
          <Link
            href="/supervisor"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 text-sm inline-flex items-center rounded-md font-medium transition-colors"
            data-testid="nav-admin"
          >
            <Shield className="h-4 w-4 mr-1" />
            Admin Login
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
