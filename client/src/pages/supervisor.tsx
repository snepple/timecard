import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Plus, Edit2, Trash2, Users, Mail, Lock, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update email settings. Please try again.",
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
  React.useEffect(() => {
    if (showPasswordSettings && passwordsQuery.data) {
      setAppPassword(passwordsQuery.data.app_password);
      setAdminPassword(passwordsQuery.data.admin_password);
    }
  }, [showPasswordSettings, passwordsQuery.data]);

  // Load email settings when dialog opens
  React.useEffect(() => {
    if (showEmailSettings && emailSettingsQuery.data) {
      setRecipientEmail(emailSettingsQuery.data.recipient_email);
      setEmailTemplate(emailSettingsQuery.data.email_template);
    }
  }, [showEmailSettings, emailSettingsQuery.data]);

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
              <p className="text-gray-600 mt-2">Manage employee numbers and sync from WhenToWork schedule</p>
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

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="text-primary mr-2 h-5 w-5" />
                Employee Numbers ({employeeNumbersQuery.data?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Add Employee Form */}
                <div className="border-b pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Add New Employee Number</h3>
                    <Button
                      onClick={() => syncEmployeesMutation.mutate()}
                      disabled={syncEmployeesMutation.isPending}
                      variant="outline"
                      className="flex items-center"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Sync from Schedule
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="employeeName">Employee Name</Label>
                      <Input
                        id="employeeName"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="employeeNumber">Employee Number</Label>
                      <Input
                        id="employeeNumber"
                        value={employeeNumber}
                        onChange={(e) => setEmployeeNumber(e.target.value)}
                        placeholder="Enter employee number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="employeeEmailAdd">Email Address (Optional)</Label>
                      <Input
                        id="employeeEmailAdd"
                        type="email"
                        value={employeeEmail}
                        onChange={(e) => setEmployeeEmail(e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddEmployee} disabled={createEmployeeMutation.isPending}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Employee
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Employee List */}
                {employeeNumbersQuery.isLoading ? (
                  <div className="text-center py-8">Loading employee numbers...</div>
                ) : !employeeNumbersQuery.data?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    No employee numbers found. Add one above or sync from schedule to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employeeNumbersQuery.data.map((employee) => (
                      <div
                        key={employee.id}
                        className="p-4 border rounded-lg flex justify-between items-center"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold">{employee.employeeName}</h4>
                          <p className="text-sm text-gray-600">
                            Employee #{employee.employeeNumber || "Not assigned"}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Mail className="w-3 h-3 mr-1" />
                            {employee.email ? (
                              <span className="text-blue-600">{employee.email}</span>
                            ) : (
                              <span className="text-gray-400">No email set</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Added: {new Date(employee.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Dialog open={editDialogOpen && editingEmployee?.id === employee.id} onOpenChange={setEditDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditEmployee(employee)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Edit Employee</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div>
                                  <Label htmlFor="edit-employeeName">Employee Name</Label>
                                  <Input
                                    id="edit-employeeName"
                                    value={employeeName}
                                    onChange={(e) => setEmployeeName(e.target.value)}
                                    placeholder="Enter full name"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-employeeNumber">Employee Number</Label>
                                  <Input
                                    id="edit-employeeNumber"
                                    value={employeeNumber}
                                    onChange={(e) => setEmployeeNumber(e.target.value)}
                                    placeholder="Enter employee number"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-employeeEmail">Email Address</Label>
                                  <Input
                                    id="edit-employeeEmail"
                                    type="email"
                                    value={employeeEmail}
                                    onChange={(e) => setEmployeeEmail(e.target.value)}
                                    placeholder="Enter email address"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={handleCancelEdit}>
                                  Cancel
                                </Button>
                                <Button onClick={handleUpdateEmployee} disabled={updateEmployeeMutation.isPending}>
                                  Update Employee
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee.id)}
                            disabled={deleteEmployeeMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Password Settings Dialog */}
        <Dialog open={showPasswordSettings} onOpenChange={setShowPasswordSettings}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Security Settings
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {passwordsQuery.isLoading ? (
                <div className="text-center py-8">Loading current settings...</div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="app-password" className="text-sm font-medium">
                        App Access Code (Numbers Only)
                      </Label>
                      <Input
                        id="app-password"
                        type="text"
                        value={appPassword}
                        onChange={(e) => {
                          // Only allow numbers
                          const numericValue = e.target.value.replace(/\D/g, '');
                          setAppPassword(numericValue);
                        }}
                        placeholder="Enter numeric access code"
                        className="mt-1"
                        maxLength={20}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This code is required to access the main timesheet application
                      </p>
                    </div>
                    
                    <Separator />
                    
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
                        maxLength={50}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This password is required to access the admin area
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">Security Notice</p>
                        <p className="text-amber-700 mt-1">
                          Changing these passwords will require all users to re-authenticate. 
                          Make sure to communicate new passwords to authorized personnel.
                        </p>
                      </div>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Settings
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {emailSettingsQuery.isLoading ? (
                <div className="text-center py-8">Loading current settings...</div>
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
                        data-testid="input-recipient-email"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email address where completed timesheets will be sent
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