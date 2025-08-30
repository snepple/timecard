import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lock, Save, Shield } from "lucide-react";

export function SecuritySettings() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [newAppPassword, setNewAppPassword] = useState("");
  const [confirmAppPassword, setConfirmAppPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");

  // Fetch current passwords
  const passwordsQuery = useQuery<{app_password: string; admin_password: string}>({
    queryKey: ["/api/settings/passwords"],
  });

  // Password management mutations
  const updatePasswordsMutation = useMutation({
    mutationFn: async (data: { app_password?: string; admin_password?: string }) => {
      return apiRequest("PUT", "/api/settings/passwords", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/passwords"] });
      toast({
        title: "Passwords updated",
        description: "Security settings have been successfully updated.",
        duration: 2000,
      });
      // Reset form fields
      setCurrentPassword("");
      setNewAppPassword("");
      setConfirmAppPassword("");
      setNewAdminPassword("");
      setConfirmAdminPassword("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update passwords. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  // Load passwords when data is available
  useEffect(() => {
    if (passwordsQuery.data) {
      setAppPassword(passwordsQuery.data.app_password);
      setAdminPassword(passwordsQuery.data.admin_password);
    }
  }, [passwordsQuery.data]);

  const handlePasswordUpdate = () => {
    // Validate current password is provided
    if (!currentPassword.trim()) {
      toast({
        title: "Validation Error",
        description: "Current admin password is required for verification.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Validate at least one new password is provided
    if (!newAppPassword.trim() && !newAdminPassword.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide at least one new password to update.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Validate app password confirmation if provided
    if (newAppPassword.trim() && newAppPassword !== confirmAppPassword) {
      toast({
        title: "Validation Error",
        description: "App password confirmation does not match.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Validate admin password confirmation if provided
    if (newAdminPassword.trim() && newAdminPassword !== confirmAdminPassword) {
      toast({
        title: "Validation Error",
        description: "Admin password confirmation does not match.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Validate app password is numbers only if provided
    if (newAppPassword.trim() && !/^\d+$/.test(newAppPassword)) {
      toast({
        title: "Validation Error",
        description: "App password must contain only numbers.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    const updateData: any = {
      current_password: currentPassword,
    };

    if (newAppPassword.trim()) {
      updateData.app_password = newAppPassword;
    }

    if (newAdminPassword.trim()) {
      updateData.admin_password = newAdminPassword;
    }

    updatePasswordsMutation.mutate(updateData);
  };

  if (passwordsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading security settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Lock className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Security Settings</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Passwords Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Current Passwords
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Current App Password</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded border text-sm font-mono">
                {appPassword ? "••••••••" : "Not set"}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Current Admin Password</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded border text-sm font-mono">
                {adminPassword ? "••••••••" : "Not set"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Update Form */}
        <Card>
          <CardHeader>
            <CardTitle>Update Passwords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="text-sm font-medium text-red-600">
                Current Admin Password (Required) *
              </Label>
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current admin password to verify"
                className="mt-1"
                data-testid="input-current-password"
              />
            </div>
            
            <div>
              <Label htmlFor="new-app-password" className="text-sm font-medium">
                New App Password (Numbers only)
              </Label>
              <PasswordInput
                id="new-app-password"
                value={newAppPassword}
                onChange={(e) => setNewAppPassword(e.target.value)}
                placeholder="Enter new app password"
                className="mt-1"
                data-testid="input-new-app-password"
              />
            </div>
            
            <div>
              <Label htmlFor="confirm-app-password" className="text-sm font-medium">
                Confirm App Password
              </Label>
              <PasswordInput
                id="confirm-app-password"
                value={confirmAppPassword}
                onChange={(e) => setConfirmAppPassword(e.target.value)}
                placeholder="Confirm new app password"
                className="mt-1"
                data-testid="input-confirm-app-password"
              />
            </div>
            
            <div>
              <Label htmlFor="new-admin-password" className="text-sm font-medium">
                New Admin Password
              </Label>
              <PasswordInput
                id="new-admin-password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Enter new admin password"
                className="mt-1"
                data-testid="input-new-admin-password"
              />
            </div>
            
            <div>
              <Label htmlFor="confirm-admin-password" className="text-sm font-medium">
                Confirm Admin Password
              </Label>
              <PasswordInput
                id="confirm-admin-password"
                value={confirmAdminPassword}
                onChange={(e) => setConfirmAdminPassword(e.target.value)}
                placeholder="Confirm new admin password"
                className="mt-1"
                data-testid="input-confirm-admin-password"
              />
            </div>

            <Button
              onClick={handlePasswordUpdate}
              disabled={updatePasswordsMutation.isPending}
              className="w-full flex items-center justify-center"
              data-testid="button-update-passwords"
            >
              <Save className="h-4 w-4 mr-2" />
              {updatePasswordsMutation.isPending ? "Updating..." : "Update Passwords"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
