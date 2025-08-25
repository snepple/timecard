import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Plus, Edit2, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmployeeNumber {
  id: string;
  employeeName: string;
  employeeNumber: string;
  createdAt: string;
  updatedAt: string;
}

export default function SupervisorDashboard() {
  const { toast } = useToast();
  const [editingEmployee, setEditingEmployee] = useState<EmployeeNumber | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");

  // Fetch employee numbers
  const employeeNumbersQuery = useQuery<EmployeeNumber[]>({
    queryKey: ["/api/employee-numbers"],
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary flex items-center" data-testid="heading-supervisor-dashboard">
            <AlertCircle className="text-primary mr-3 h-8 w-8" />
            Admin
          </h1>
          <p className="text-gray-600 mt-2">Manage employee numbers and sync from WhenToWork schedule</p>
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
                    No employee numbers found. Add one above or sync from schedule to get started.
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
                          <p className="text-sm text-gray-600">
                            Employee #{employee.employeeNumber || "Not assigned"}
                          </p>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}