import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Pencil, Trash2, Mail, Search, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { EmployeeNumber, InsertEmployeeNumber } from '@shared/schema';

interface EmployeeFormData {
  employeeName: string;
  employeeNumber: string;
  email: string;
}

export default function EmployeeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeNumber | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<EmployeeFormData>({
    employeeName: '',
    employeeNumber: '',
    email: ''
  });

  // Fetch employees
  const employeesQuery = useQuery({
    queryKey: ['/api/employee-numbers'],
    queryFn: async () => {
      const response = await fetch('/api/employee-numbers');
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json() as Promise<EmployeeNumber[]>;
    }
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: InsertEmployeeNumber) => {
      const response = await fetch('/api/employee-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create employee');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee-numbers'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: 'Employee added',
        description: 'Employee has been successfully added to the system.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding employee',
        description: error instanceof Error ? error.message : 'Failed to add employee',
        variant: 'destructive',
      });
    }
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertEmployeeNumber }) => {
      const response = await fetch(`/api/employee-numbers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update employee');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee-numbers'] });
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
      toast({
        title: 'Employee updated',
        description: 'Employee information has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating employee',
        description: error instanceof Error ? error.message : 'Failed to update employee',
        variant: 'destructive',
      });
    }
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/employee-numbers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete employee');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee-numbers'] });
      toast({
        title: 'Employee deleted',
        description: 'Employee has been successfully removed from the system.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting employee',
        description: error instanceof Error ? error.message : 'Failed to delete employee',
        variant: 'destructive',
      });
    }
  });

  // Utility functions
  const resetForm = () => {
    setFormData({
      employeeName: '',
      employeeNumber: '',
      email: ''
    });
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (employee: EmployeeNumber) => {
    setEditingEmployee(employee);
    setFormData({
      employeeName: employee.employeeName,
      employeeNumber: employee.employeeNumber,
      email: employee.email || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.employeeName.trim() || !formData.employeeNumber.trim()) {
      toast({
        title: 'Validation error',
        description: 'Employee name and number are required.',
        variant: 'destructive',
      });
      return;
    }

    const submitData: InsertEmployeeNumber = {
      employeeName: formData.employeeName.trim(),
      employeeNumber: formData.employeeNumber.trim(),
      email: formData.email.trim() || null
    };

    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, data: submitData });
    } else {
      createEmployeeMutation.mutate(submitData);
    }
  };

  const handleDelete = (employee: EmployeeNumber) => {
    deleteEmployeeMutation.mutate(employee.id);
  };

  // Filter employees based on search term
  const filteredEmployees = employeesQuery.data?.filter(employee =>
    employee.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const isPending = createEmployeeMutation.isPending || updateEmployeeMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="text-primary mr-2 h-5 w-5" />
            Employee Management
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAddDialog} className="flex items-center" data-testid="button-add-employee">
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="employeeName">Employee Name *</Label>
                  <Input
                    id="employeeName"
                    value={formData.employeeName}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                    placeholder="Enter employee full name"
                    required
                    data-testid="input-employee-name"
                  />
                </div>
                <div>
                  <Label htmlFor="employeeNumber">Employee Number *</Label>
                  <Input
                    id="employeeNumber"
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeNumber: e.target.value }))}
                    placeholder="Enter employee number"
                    required
                    data-testid="input-employee-number"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address (optional)"
                    data-testid="input-employee-email"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    data-testid="button-cancel-add"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isPending}
                    data-testid="button-submit-add"
                  >
                    {isPending ? 'Adding...' : 'Add Employee'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search employees by name, number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-employees"
            />
          </div>
        </div>

        {/* Loading state */}
        {employeesQuery.isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading employees...</p>
          </div>
        )}

        {/* Error state */}
        {employeesQuery.isError && (
          <div className="text-center py-8">
            <p className="text-red-500">Failed to load employees</p>
            <Button
              variant="outline"
              onClick={() => employeesQuery.refetch()}
              className="mt-2"
              data-testid="button-retry-fetch"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {employeesQuery.data && filteredEmployees.length === 0 && (
          <div className="text-center py-8">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {searchTerm ? (
              <>
                <p className="text-lg font-medium text-muted-foreground">No employees found</p>
                <p className="text-sm text-muted-foreground">
                  No employees match your search criteria "{searchTerm}"
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-muted-foreground">No employees added yet</p>
                <p className="text-sm text-muted-foreground">
                  Get started by adding your first employee to the system.
                </p>
              </>
            )}
          </div>
        )}

        {/* Employees table */}
        {employeesQuery.data && filteredEmployees.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Employee Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                    <TableCell className="font-medium" data-testid={`text-employee-name-${employee.id}`}>
                      {employee.employeeName}
                    </TableCell>
                    <TableCell data-testid={`text-employee-number-${employee.id}`}>
                      {employee.employeeNumber}
                    </TableCell>
                    <TableCell data-testid={`text-employee-email-${employee.id}`}>
                      {employee.email ? (
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1 text-gray-400" />
                          {employee.email}
                        </div>
                      ) : (
                        <span className="text-gray-400">No email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Edit Dialog */}
                        <Dialog open={isEditDialogOpen && editingEmployee?.id === employee.id} onOpenChange={(open) => {
                          setIsEditDialogOpen(open);
                          if (!open) {
                            setEditingEmployee(null);
                            resetForm();
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditDialog(employee)}
                              data-testid={`button-edit-${employee.id}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Employee</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="editEmployeeName">Employee Name *</Label>
                                <Input
                                  id="editEmployeeName"
                                  value={formData.employeeName}
                                  onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                                  placeholder="Enter employee full name"
                                  required
                                  data-testid="input-edit-employee-name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="editEmployeeNumber">Employee Number *</Label>
                                <Input
                                  id="editEmployeeNumber"
                                  value={formData.employeeNumber}
                                  onChange={(e) => setFormData(prev => ({ ...prev, employeeNumber: e.target.value }))}
                                  placeholder="Enter employee number"
                                  required
                                  data-testid="input-edit-employee-number"
                                />
                              </div>
                              <div>
                                <Label htmlFor="editEmail">Email Address</Label>
                                <Input
                                  id="editEmail"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                  placeholder="Enter email address (optional)"
                                  data-testid="input-edit-employee-email"
                                />
                              </div>
                              <div className="flex justify-end space-x-2 pt-4">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => setIsEditDialogOpen(false)}
                                  data-testid="button-cancel-edit"
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  type="submit" 
                                  disabled={isPending}
                                  data-testid="button-submit-edit"
                                >
                                  {isPending ? 'Updating...' : 'Update Employee'}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>

                        {/* Delete confirmation */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-${employee.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{employee.employeeName}" (#{employee.employeeNumber})?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(employee)}
                                className="bg-red-600 hover:bg-red-700"
                                data-testid="button-confirm-delete"
                              >
                                Delete Employee
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary info */}
        {employeesQuery.data && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredEmployees.length} of {employeesQuery.data.length} employees
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}