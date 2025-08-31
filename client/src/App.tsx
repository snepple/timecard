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
import AdminDashboard from "@/pages/AdminDashboard";
import LoginScreen from "@/components/LoginScreen";
import TimecardSummaryPage from "@/pages/admin/TimecardSummary";
import RescueCoveragePage from "@/pages/admin/RescueCoverage";
import ActivityLogsPage from "@/pages/admin/ActivityLogs";
import MemberManagementPage from "@/pages/admin/MemberManagement";
import EmailSettingsPage from "@/pages/admin/EmailSettings";
import ScheduleManagementPage from "@/pages/admin/ScheduleManagement";
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

  const AdminRoute = () => {
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
    return <AdminDashboard />;
  };

  const createAdminRoute = (Component: React.ComponentType) => () => {
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
    return <Component />;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <main className="flex-1 pb-safe overflow-hidden">
        <Switch>
          <Route path="/" component={() => <TimesheetPage logout={logout} />} />
          <Route path="/supervisor" component={SupervisorRoute} />
          <Route path="/admin" component={AdminRoute} />
          <Route path="/admin/timecard-summary" component={createAdminRoute(TimecardSummaryPage)} />
          <Route path="/admin/rescue-coverage" component={createAdminRoute(RescueCoveragePage)} />
          <Route path="/admin/activity-logs" component={createAdminRoute(ActivityLogsPage)} />
          <Route path="/admin/member-management" component={createAdminRoute(MemberManagementPage)} />
          <Route path="/admin/email-settings" component={createAdminRoute(EmailSettingsPage)} />
          <Route path="/admin/schedule" component={createAdminRoute(ScheduleManagementPage)} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      {/* Footer */}
      <footer className="bg-secondary/20 py-2 px-4">
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
