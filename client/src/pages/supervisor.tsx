import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Plus, Edit2, Trash2, Users, Mail, Lock, Settings, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimecardSummaryReport } from "@/components/TimecardSummaryReport";
import EmployeeManagement from "@/components/EmployeeManagement";

interface EmployeeNumber {
  id: string;
  employeeName: string;
  employeeNumber: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SupervisorDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("timecard-summary");
  const [editingEmployee, setEditingEmployee] = useState<EmployeeNumber | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Password management state
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [appPassword, setAppPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  
  // Email settings state
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  
  // Overtime settings state
  const [showOvertimeSettings, setShowOvertimeSettings] = useState(false);
  const [overtimeThreshold, setOvertimeThreshold] = useState(42);

  // Fetch employee numbers
  const employeeNumbersQuery = useQuery<EmployeeNumber[]>({
    queryKey: ["/api/employee-numbers"],
  });

  // Fetch current passwords
  const passwordsQuery = useQuery<{app_password: string; admin_password: string}>({
    queryKey: ["/api/settings/passwords"],
    enabled: showPasswordSettings,
  });

  // Fetch current email settings
  const emailSettingsQuery = useQuery<{recipient_email: string; email_template: string}>({
    queryKey: ["/api/settings/email"],
    enabled: showEmailSettings,
  });
  
  // Fetch current overtime settings
  const overtimeSettingsQuery = useQuery<{overtime_threshold: number}>({
    queryKey: ["/api/settings/overtime"],
    enabled: showOvertimeSettings,
  });

  // Sync employees from schedule mutation
  const syncEmployeesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/employee-numbers/sync");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-numbers"] });
      toast({
        title: "Employees synced",
        description: "Employee names have been synced from the schedule.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync employees. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create employee number mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: { employeeName: string; employeeNumber: string; email?: string }) => {
      return apiRequest("POST", "/api/employee-numbers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-numbers"] });
      setEmployeeName("");
      setEmployeeNumber("");
      setEmployeeEmail("");
      toast({
        title: "Employee number added",
        description: "The employee number has been successfully saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add employee number. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update employee number mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { employeeName: string; employeeNumber: string; email?: string } }) => {
      return apiRequest("PUT", `/api/employee-numbers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-numbers"] });
      setEditingEmployee(null);
      setEmployeeName("");
      setEmployeeNumber("");
      setEmployeeEmail("");
      setEditDialogOpen(false);
      toast({
        title: "Employee number updated",
        description: "The employee number has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update employee number. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete employee number mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/employee-numbers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-numbers"] });
      toast({
        title: "Employee number deleted",
        description: "The employee number has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete employee number. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Employee management handlers
  const handleAddEmployee = () => {
    if (!employeeName.trim() || !employeeNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both employee name and number.",
        variant: "destructive",
      });
      return;
    }
    createEmployeeMutation.mutate({ 
      employeeName, 
      employeeNumber, 
      email: employeeEmail.trim() || undefined 
    });
  };

  const handleEditEmployee = (employee: EmployeeNumber) => {
    setEditingEmployee(employee);
    setEmployeeName(employee.employeeName);
    setEmployeeNumber(employee.employeeNumber);
    setEmployeeEmail(employee.email || "");
    setEditDialogOpen(true);
  };

  const handleUpdateEmployee = () => {
    if (!editingEmployee || !employeeName.trim() || !employeeNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both employee name and number.",
        variant: "destructive",
      });
      return;
    }
    updateEmployeeMutation.mutate({
      id: editingEmployee.id,
      data: { 
        employeeName, 
        employeeNumber, 
        email: employeeEmail.trim() || undefined 
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setEmployeeName("");
    setEmployeeNumber("");
    setEmployeeEmail("");
    setEditDialogOpen(false);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm("Are you sure you want to delete this employee number? This action cannot be undone.")) {
      deleteEmployeeMutation.mutate(id);
    }
  };

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
      });
      setShowPasswordSettings(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update passwords. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update email settings mutation
  const updateEmailSettingsMutation = useMutation({
    mutationFn: async (data: { recipient_email?: string; email_template?: string }) => {
      return apiRequest("PUT", "/api/settings/email", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/email"] });
      toast({
        title: "Email settings updated",
        description: "Email configuration has been updated successfully.",
      });
      setShowEmailSettings(false);
      // Reset form fields
      setRecipientEmail("");
      setEmailTemplate("");
    },
    onError: (error) => {
      console.error("Email settings update error:", error);
      toast({
        title: "Error",
        description: "Failed to update email settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update overtime settings mutation
  const updateOvertimeSettingsMutation = useMutation({
    mutationFn: async (data: { overtime_threshold?: number }) => {
      return apiRequest("PUT", "/api/settings/overtime", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/overtime"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/timecard-summary"] });
      toast({
        title: "Overtime settings updated",
        description: "Overtime threshold has been updated successfully.",
      });
      setShowOvertimeSettings(false);
    },
    onError: (error) => {
      console.error("Overtime settings update error:", error);
      toast({
        title: "Error",
        description: "Failed to update overtime settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePasswordUpdate = () => {
    if (!appPassword.trim() || !adminPassword.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both passwords.",
        variant: "destructive",
      });
      return;
    }

    // Validate app password is numbers only
    if (!/^\d+$/.test(appPassword)) {
      toast({
        title: "Validation Error",
        description: "App password must contain only numbers.",
        variant: "destructive",
      });
      return;
    }

    updatePasswordsMutation.mutate({
      app_password: appPassword,
      admin_password: adminPassword,
    });
  };

  const handleEmailSettingsUpdate = () => {
    if (!recipientEmail.trim() || !emailTemplate.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both the recipient email and email template.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    updateEmailSettingsMutation.mutate({
      recipient_email: recipientEmail,
      email_template: emailTemplate,
    });
  };

  // Load passwords when dialog opens
  useEffect(() => {
    if (showPasswordSettings && passwordsQuery.data) {
      setAppPassword(passwordsQuery.data.app_password);
      setAdminPassword(passwordsQuery.data.admin_password);
    }
  }, [showPasswordSettings, passwordsQuery.data]);

  // Load email settings when dialog opens
  useEffect(() => {
    if (showEmailSettings && emailSettingsQuery.data) {
      setRecipientEmail(emailSettingsQuery.data.recipient_email);
      setEmailTemplate(emailSettingsQuery.data.email_template);
    }
  }, [showEmailSettings, emailSettingsQuery.data]);

  // Load overtime settings when dialog opens
  useEffect(() => {
    if (showOvertimeSettings && overtimeSettingsQuery.data) {
      setOvertimeThreshold(overtimeSettingsQuery.data.overtime_threshold);
    }
  }, [showOvertimeSettings, overtimeSettingsQuery.data]);

  const handleOvertimeUpdate = () => {
    if (overtimeThreshold < 1 || overtimeThreshold > 80) {
      toast({
        title: "Validation Error",
        description: "Overtime threshold must be between 1 and 80 hours.",
        variant: "destructive",
      });
      return;
    }

    updateOvertimeSettingsMutation.mutate({
      overtime_threshold: overtimeThreshold,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-secondary flex items-center" data-testid="heading-supervisor-dashboard">
                <AlertCircle className="text-primary mr-3 h-8 w-8" />
                Admin
              </h1>
              <p className="text-gray-600 mt-2">Administrative tools and reports for supervisors</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEmailSettings(true)}
                className="flex items-center"
                data-testid="button-email-settings"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPasswordSettings(true)}
                className="flex items-center"
                data-testid="button-security-settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                Security Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs for different admin sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timecard-summary" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Timecard Summary</span>
            </TabsTrigger>
            <TabsTrigger value="employee-management" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Employee Management</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Timecard Summary Tab */}
          <TabsContent value="timecard-summary" className="mt-6">
            <TimecardSummaryReport />
          </TabsContent>

          {/* Employee Management Tab */}
          <TabsContent value="employee-management" className="mt-6">
            <EmployeeManagement />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              {/* Overtime Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="text-primary mr-2 h-5 w-5" />
                    Overtime Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="overtime-threshold">Weekly Overtime Threshold (hours)</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          id="overtime-threshold"
                          type="number"
                          min="1"
                          max="80"
                          value={overtimeThreshold}
                          onChange={(e) => setOvertimeThreshold(parseInt(e.target.value) || 42)}
                          className="w-32"
                          onFocus={() => setShowOvertimeSettings(true)}
                        />
                        <Button
                          onClick={handleOvertimeUpdate}
                          disabled={updateOvertimeSettingsMutation.isPending}
                        >
                          {updateOvertimeSettingsMutation.isPending ? "Updating..." : "Update"}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Hours worked beyond this threshold in a week are considered overtime.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Current setting: {overtimeSettingsQuery.data?.overtime_threshold || 42} hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Password Settings Dialog */}
        <Dialog open={showPasswordSettings} onOpenChange={setShowPasswordSettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Security Settings
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {passwordsQuery.isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading current settings...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="app-password" className="text-sm font-medium">
                        App Password (Numbers only)
                      </Label>
                      <Input
                        id="app-password"
                        type="password"
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        placeholder="Enter app password"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="admin-password" className="text-sm font-medium">
                        Admin Password
                      </Label>
                      <Input
                        id="admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter admin password"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowPasswordSettings(false);
                        setAppPassword("");
                        setAdminPassword("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handlePasswordUpdate}
                      disabled={updatePasswordsMutation.isPending}
                    >
                      {updatePasswordsMutation.isPending ? 'Updating...' : 'Update Passwords'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Settings Dialog */}
        <Dialog open={showEmailSettings} onOpenChange={setShowEmailSettings}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Settings
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {emailSettingsQuery.isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading current settings...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="recipient-email" className="text-sm font-medium">
                        Recipient Email Address
                      </Label>
                      <Input
                        id="recipient-email"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="supervisor@oaklandfire.gov"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email address where timesheet submissions will be sent
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <Label htmlFor="email-template" className="text-sm font-medium">
                        Email Template
                      </Label>
                      <textarea
                        id="email-template"
                        value={emailTemplate}
                        onChange={(e) => setEmailTemplate(e.target.value)}
                        placeholder="Enter email template..."
                        rows={12}
                        className="w-full mt-1 p-3 border border-gray-300 rounded-md resize-vertical font-mono text-sm"
                        data-testid="textarea-email-template"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use placeholders: {'{employeeName}'} and {'{weekEnding}'} will be replaced with actual values
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Mail className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-800">Template Information</p>
                        <p className="text-blue-700 mt-1">
                          The email template should include a Subject line at the top. Use placeholders {'{employeeName}'} and {'{weekEnding}'} to customize the content for each submission.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowEmailSettings(false);
                        setRecipientEmail("");
                        setEmailTemplate("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleEmailSettingsUpdate}
                      disabled={updateEmailSettingsMutation.isPending}
                      data-testid="button-update-email-settings"
                    >
                      {updateEmailSettingsMutation.isPending ? 'Updating...' : 'Update Email Settings'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
