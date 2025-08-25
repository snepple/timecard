import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, User, Calendar, AlertCircle, Plus, Edit2, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Timesheet {
  id: string;
  employeeName: string;
  employeeNumber: string;
  weekEnding: string;
  totalWeeklyHours: number;
  status: string;
  submittedAt: string;
  supervisorComments?: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface EmployeeNumber {
  id: string;
  employeeName: string;
  employeeNumber: string;
  createdAt: string;
  updatedAt: string;
}

export default function SupervisorDashboard() {
  const { toast } = useToast();
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [comments, setComments] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "all" | "employees">("pending");
  const [editingEmployee, setEditingEmployee] = useState<EmployeeNumber | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");

  // Fetch pending timesheets
  const pendingQuery = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets/pending"],
    enabled: activeTab === "pending",
  });

  // Fetch all submitted/approved timesheets  
  const allQuery = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets/status/submitted", "/api/timesheets/status/approved"],
    queryFn: async () => {
      const [submitted, approved] = await Promise.all([
        fetch("/api/timesheets/status/submitted").then(r => r.json()),
        fetch("/api/timesheets/status/approved").then(r => r.json())
      ]);
      return [...submitted, ...approved].sort((a, b) => 
        new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime()
      );
    },
    enabled: activeTab === "all",
  });

  // Fetch employee numbers
  const employeeNumbersQuery = useQuery<EmployeeNumber[]>({
    queryKey: ["/api/employee-numbers"],
    enabled: activeTab === "employees",
  });

  // Fetch schedule for syncing
  const scheduleQuery = useQuery<{ employees: Array<{ firstName: string; lastName: string }> }>({
    queryKey: ["/api/schedule"],
    enabled: activeTab === "employees",
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
    mutationFn: async (data: { employeeName: string; employeeNumber: string }) => {
      return apiRequest("POST", "/api/employee-numbers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-numbers"] });
      setEmployeeName("");
      setEmployeeNumber("");
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
    mutationFn: async ({ id, data }: { id: string; data: { employeeName: string; employeeNumber: string } }) => {
      return apiRequest("PUT", `/api/employee-numbers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-numbers"] });
      setEditingEmployee(null);
      setEmployeeName("");
      setEmployeeNumber("");
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

  const approveMutation = useMutation({
    mutationFn: async ({ id, supervisorName, comments }: { id: string; supervisorName: string; comments?: string }) => {
      return apiRequest("POST", `/api/timesheets/${id}/approve`, { supervisorName, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/status/submitted"] });
      setSelectedTimesheet(null);
      setComments("");
      toast({
        title: "Timesheet approved",
        description: "The timesheet has been successfully approved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve timesheet. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, supervisorName, comments }: { id: string; supervisorName: string; comments: string }) => {
      return apiRequest("POST", `/api/timesheets/${id}/reject`, { supervisorName, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/status/submitted"] });
      setSelectedTimesheet(null);
      setComments("");
      toast({
        title: "Timesheet rejected",
        description: "The timesheet has been rejected with comments.",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to reject timesheet. Please try again.",
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
    createEmployeeMutation.mutate({ employeeName, employeeNumber });
  };

  const handleEditEmployee = (employee: EmployeeNumber) => {
    setEditingEmployee(employee);
    setEmployeeName(employee.employeeName);
    setEmployeeNumber(employee.employeeNumber);
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
      data: { employeeName, employeeNumber }
    });
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setEmployeeName("");
    setEmployeeNumber("");
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm("Are you sure you want to delete this employee number? This action cannot be undone.")) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const handleApprove = () => {
    if (!selectedTimesheet) return;
    approveMutation.mutate({
      id: selectedTimesheet.id,
      supervisorName: "Supervisor", // TODO: Get from auth context
      comments: comments.trim() || undefined,
    });
  };

  const handleReject = () => {
    if (!selectedTimesheet || !comments.trim()) {
      toast({
        title: "Comments required",
        description: "Please provide comments when rejecting a timesheet.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({
      id: selectedTimesheet.id,
      supervisorName: "Supervisor", // TODO: Get from auth context
      comments: comments.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentTimesheets = activeTab === "pending" ? pendingQuery.data : allQuery.data;
  const isLoading = activeTab === "pending" ? pendingQuery.isLoading : allQuery.isLoading;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary flex items-center" data-testid="heading-supervisor-dashboard">
            <AlertCircle className="text-primary mr-3 h-8 w-8" />
            Supervisor Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Review and approve employee timesheets</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "pending"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              data-testid="tab-pending"
            >
              Pending Approval ({pendingQuery.data?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              data-testid="tab-all"
            >
              All Timesheets
            </button>
            <button
              onClick={() => setActiveTab("employees")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "employees"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              data-testid="tab-employees"
            >
              Employee Numbers ({employeeNumbersQuery.data?.length || 0})
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timesheet List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="text-primary mr-2 h-5 w-5" />
                  {activeTab === "pending" ? "Pending Timesheets" : "All Timesheets"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTab === "employees" ? (
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <div className="flex items-end">
                          {editingEmployee ? (
                            <div className="flex space-x-2">
                              <Button onClick={handleUpdateEmployee} disabled={updateEmployeeMutation.isPending}>
                                Update
                              </Button>
                              <Button variant="outline" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button onClick={handleAddEmployee} disabled={createEmployeeMutation.isPending}>
                              <Plus className="w-4 h-4 mr-2" />
                              Add Employee
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Employee List */}
                    {employeeNumbersQuery.isLoading ? (
                      <div className="text-center py-8">Loading employee numbers...</div>
                    ) : !employeeNumbersQuery.data?.length ? (
                      <div className="text-center py-8 text-gray-500">
                        No employee numbers found. Add one above to get started.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {employeeNumbersQuery.data.map((employee) => (
                          <div
                            key={employee.id}
                            className="p-4 border rounded-lg flex justify-between items-center"
                          >
                            <div>
                              <h4 className="font-semibold">{employee.employeeName}</h4>
                              <p className="text-sm text-gray-600">Employee #{employee.employeeNumber}</p>
                              <p className="text-xs text-gray-500">
                                Added: {new Date(employee.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditEmployee(employee)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
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
                ) : isLoading ? (
                  <div className="text-center py-8">Loading timesheets...</div>
                ) : !currentTimesheets?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    {activeTab === "pending" ? "No pending timesheets" : "No timesheets found"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentTimesheets.map((timesheet) => (
                      <div
                        key={timesheet.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTimesheet?.id === timesheet.id
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedTimesheet(timesheet)}
                        data-testid={`timesheet-${timesheet.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-secondary">
                              {timesheet.employeeName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Employee #{timesheet.employeeNumber}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <Calendar className="w-3 h-3 mr-1" />
                              Week ending {new Date(timesheet.weekEnding).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              Total hours: {timesheet.totalWeeklyHours}
                            </p>
                            {timesheet.submittedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Submitted: {formatDate(timesheet.submittedAt)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {getStatusBadge(timesheet.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="text-primary mr-2 h-5 w-5" />
                  Review Timesheet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedTimesheet ? (
                  <div className="text-center py-8 text-gray-500">
                    Select a timesheet to review
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-secondary">
                        {selectedTimesheet.employeeName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Week ending {new Date(selectedTimesheet.weekEnding).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total hours: {selectedTimesheet.totalWeeklyHours}
                      </p>
                      <div className="mt-2">
                        {getStatusBadge(selectedTimesheet.status)}
                      </div>
                    </div>

                    {selectedTimesheet.supervisorComments && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Previous Comments
                        </label>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {selectedTimesheet.supervisorComments}
                        </p>
                      </div>
                    )}

                    {selectedTimesheet.status === "submitted" && (
                      <>
                        <div>
                          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
                            Supervisor Comments
                          </label>
                          <Textarea
                            id="comments"
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Add comments (optional for approval, required for rejection)"
                            rows={4}
                            data-testid="input-supervisor-comments"
                          />
                        </div>

                        <div className="space-y-2">
                          <Button
                            onClick={handleApprove}
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={approveMutation.isPending}
                            data-testid="button-approve"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {approveMutation.isPending ? "Approving..." : "Approve Timesheet"}
                          </Button>
                          <Button
                            onClick={handleReject}
                            variant="outline"
                            className="w-full border-red-300 text-red-700 hover:bg-red-50"
                            disabled={rejectMutation.isPending}
                            data-testid="button-reject"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {rejectMutation.isPending ? "Rejecting..." : "Reject Timesheet"}
                          </Button>
                        </div>
                      </>
                    )}

                    {selectedTimesheet.status === "approved" && (
                      <div className="text-center py-4">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <p className="text-green-600 font-medium">Approved</p>
                        {selectedTimesheet.approvedBy && (
                          <p className="text-sm text-gray-600">
                            by {selectedTimesheet.approvedBy}
                          </p>
                        )}
                        {selectedTimesheet.approvedAt && (
                          <p className="text-xs text-gray-500">
                            {formatDate(selectedTimesheet.approvedAt)}
                          </p>
                        )}
                      </div>
                    )}

                    {selectedTimesheet.status === "rejected" && (
                      <div className="text-center py-4">
                        <XCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
                        <p className="text-red-600 font-medium">Rejected</p>
                        {selectedTimesheet.approvedBy && (
                          <p className="text-sm text-gray-600">
                            by {selectedTimesheet.approvedBy}
                          </p>
                        )}
                        {selectedTimesheet.approvedAt && (
                          <p className="text-xs text-gray-500">
                            {formatDate(selectedTimesheet.approvedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}