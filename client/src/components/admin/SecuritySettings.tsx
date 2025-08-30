import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lock, Save, Shield, Edit } from "lucide-react";

export function SecuritySettings() {
  const { toast } = useToast();
  const [appPassword, setAppPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  
  // Modal state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordType, setPasswordType] = useState<'app' | 'admin'>('app');
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        title: "Password updated",
        description: `${passwordType === 'app' ? 'App' : 'Admin'} password has been successfully updated.`,
        duration: 2000,
      });
      // Reset form fields and close dialog
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
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

  const openPasswordDialog = (type: 'app' | 'admin') => {
    setPasswordType(type);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordDialog(true);
  };

  const closePasswordDialog = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordDialog(false);
  };

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

    // Validate new password is provided
    if (!newPassword.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a new password.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Password confirmation does not match.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Validate app password is numbers only if updating app password
    if (passwordType === 'app' && !/^\d+$/.test(newPassword)) {
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

    if (passwordType === 'app') {
      updateData.app_password = newPassword;
    } else {
      updateData.admin_password = newPassword;
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
        {/* App Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              App Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Current App Password</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded border text-sm font-mono">
                {appPassword ? "••••••••" : "Not set"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Numbers only</p>
            </div>
            <Button
              onClick={() => openPasswordDialog('app')}
              className="w-full flex items-center justify-center"
              data-testid="button-update-app-password"
            >
              <Edit className="h-4 w-4 mr-2" />
              Update App Password
            </Button>
          </CardContent>
        </Card>

        {/* Admin Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              Admin Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Current Admin Password</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded border text-sm font-mono">
                {adminPassword ? "••••••••" : "Not set"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Letters, numbers, and symbols allowed</p>
            </div>
            <Button
              onClick={() => openPasswordDialog('admin')}
              className="w-full flex items-center justify-center"
              data-testid="button-update-admin-password"
            >
              <Edit className="h-4 w-4 mr-2" />
              Update Admin Password
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Password Update Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={closePasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Update {passwordType === 'app' ? 'App' : 'Admin'} Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label htmlFor="new-password" className="text-sm font-medium">
                New {passwordType === 'app' ? 'App' : 'Admin'} Password
                {passwordType === 'app' && ' (Numbers only)'}
              </Label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`Enter new ${passwordType} password`}
                className="mt-1"
                data-testid="input-new-password"
              />
            </div>
            
            <div>
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm {passwordType === 'app' ? 'App' : 'Admin'} Password
              </Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={`Confirm new ${passwordType} password`}
                className="mt-1"
                data-testid="input-confirm-password"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={closePasswordDialog}
                disabled={updatePasswordsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordUpdate}
                disabled={updatePasswordsMutation.isPending}
                className="flex items-center"
                data-testid="button-save-password"
              >
                <Save className="h-4 w-4 mr-2" />
                {updatePasswordsMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
