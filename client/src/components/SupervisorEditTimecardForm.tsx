import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { TimesheetFormData } from "@shared/schema";
import { Loader2, Calendar, Clock, Plus, Trash2 } from "lucide-react";

const supervisorEditSchema = z.object({
  employeeName: z.string().min(1, "Employee name is required"),
  employeeNumber: z.string().min(1, "Employee number is required"),
  weekEnding: z.string().min(1, "Week ending is required"),
  
  sundayDate: z.string().optional(),
  sundayShifts: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    hours: z.number()
  })).default([]),
  sundayTotalHours: z.coerce.number().min(0).max(24),
  
  mondayDate: z.string().optional(),
  mondayShifts: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    hours: z.number()
  })).default([]),
  mondayTotalHours: z.coerce.number().min(0).max(24),
  
  tuesdayDate: z.string().optional(),
  tuesdayShifts: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    hours: z.number()
  })).default([]),
  tuesdayTotalHours: z.coerce.number().min(0).max(24),
  
  wednesdayDate: z.string().optional(),
  wednesdayShifts: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    hours: z.number()
  })).default([]),
  wednesdayTotalHours: z.coerce.number().min(0).max(24),
  
  thursdayDate: z.string().optional(),
  thursdayShifts: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    hours: z.number()
  })).default([]),
  thursdayTotalHours: z.coerce.number().min(0).max(24),
  
  fridayDate: z.string().optional(),
  fridayShifts: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    hours: z.number()
  })).default([]),
  fridayTotalHours: z.coerce.number().min(0).max(24),
  
  saturdayDate: z.string().optional(),
  saturdayShifts: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    hours: z.number()
  })).default([]),
  saturdayTotalHours: z.coerce.number().min(0).max(24),
  
  rescueCoverageMonday: z.boolean().default(false),
  rescueCoverageTuesday: z.boolean().default(false),
  rescueCoverageWednesday: z.boolean().default(false),
  rescueCoverageThursday: z.boolean().default(false),
  
  supervisorName: z.string().min(1, "Supervisor name is required"),
  editReason: z.string().min(1, "Reason for edit is required"),
});

type SupervisorEditFormData = z.infer<typeof supervisorEditSchema>;

interface SupervisorEditTimecardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    employeeName: string;
    employeeNumber: string;
    timesheetId?: string;
  };
  weekEnding: string;
  onSuccess?: () => void;
}

export function SupervisorEditTimecardForm({ 
  open, 
  onOpenChange, 
  employee, 
  weekEnding, 
  onSuccess 
}: SupervisorEditTimecardFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch existing timesheet data
  const { data: existingTimesheet, isLoading: isLoadingTimesheet } = useQuery({
    queryKey: ['/api/timesheets', employee.timesheetId],
    queryFn: () => fetch(`/api/timesheets/${employee.timesheetId}`).then(res => res.json()),
    enabled: open && !!employee.timesheetId,
  });

  const form = useForm<SupervisorEditFormData>({
    resolver: zodResolver(supervisorEditSchema),
    defaultValues: {
      employeeName: employee.employeeName,
      employeeNumber: employee.employeeNumber,
      weekEnding: weekEnding,
      sundayTotalHours: 0,
      mondayTotalHours: 0,
      tuesdayTotalHours: 0,
      wednesdayTotalHours: 0,
      thursdayTotalHours: 0,
      fridayTotalHours: 0,
      saturdayTotalHours: 0,
      rescueCoverageMonday: false,
      rescueCoverageTuesday: false,
      rescueCoverageWednesday: false,
      rescueCoverageThursday: false,
      supervisorName: "Fire Chief",
      editReason: "",
    },
  });

  // Parse shifts data helper
  const parseShifts = (shiftsJson: string | null) => {
    if (!shiftsJson) return [];
    try {
      return JSON.parse(shiftsJson);
    } catch {
      return [];
    }
  };

  // Update form with existing timesheet data when loaded
  useEffect(() => {
    if (existingTimesheet) {
      form.reset({
        employeeName: existingTimesheet.employeeName,
        employeeNumber: existingTimesheet.employeeNumber,
        weekEnding: existingTimesheet.weekEnding,
        
        sundayDate: existingTimesheet.sundayDate || '',
        sundayShifts: parseShifts(existingTimesheet.sundayShifts),
        sundayTotalHours: parseFloat(existingTimesheet.sundayTotalHours || '0'),
        
        mondayDate: existingTimesheet.mondayDate || '',
        mondayShifts: parseShifts(existingTimesheet.mondayShifts),
        mondayTotalHours: parseFloat(existingTimesheet.mondayTotalHours || '0'),
        
        tuesdayDate: existingTimesheet.tuesdayDate || '',
        tuesdayShifts: parseShifts(existingTimesheet.tuesdayShifts),
        tuesdayTotalHours: parseFloat(existingTimesheet.tuesdayTotalHours || '0'),
        
        wednesdayDate: existingTimesheet.wednesdayDate || '',
        wednesdayShifts: parseShifts(existingTimesheet.wednesdayShifts),
        wednesdayTotalHours: parseFloat(existingTimesheet.wednesdayTotalHours || '0'),
        
        thursdayDate: existingTimesheet.thursdayDate || '',
        thursdayShifts: parseShifts(existingTimesheet.thursdayShifts),
        thursdayTotalHours: parseFloat(existingTimesheet.thursdayTotalHours || '0'),
        
        fridayDate: existingTimesheet.fridayDate || '',
        fridayShifts: parseShifts(existingTimesheet.fridayShifts),
        fridayTotalHours: parseFloat(existingTimesheet.fridayTotalHours || '0'),
        
        saturdayDate: existingTimesheet.saturdayDate || '',
        saturdayShifts: parseShifts(existingTimesheet.saturdayShifts),
        saturdayTotalHours: parseFloat(existingTimesheet.saturdayTotalHours || '0'),
        
        rescueCoverageMonday: existingTimesheet.rescueCoverageMonday || false,
        rescueCoverageTuesday: existingTimesheet.rescueCoverageTuesday || false,
        rescueCoverageWednesday: existingTimesheet.rescueCoverageWednesday || false,
        rescueCoverageThursday: existingTimesheet.rescueCoverageThursday || false,
        
        supervisorName: "Fire Chief",
        editReason: "",
      });
    }
  }, [existingTimesheet, form]);

  const editMutation = useMutation({
    mutationFn: async (data: SupervisorEditFormData) => {
      // Convert form data to timesheet format
      const timesheetData = {
        ...data,
        sundayShifts: JSON.stringify(data.sundayShifts),
        mondayShifts: JSON.stringify(data.mondayShifts),
        tuesdayShifts: JSON.stringify(data.tuesdayShifts),
        wednesdayShifts: JSON.stringify(data.wednesdayShifts),
        thursdayShifts: JSON.stringify(data.thursdayShifts),
        fridayShifts: JSON.stringify(data.fridayShifts),
        saturdayShifts: JSON.stringify(data.saturdayShifts),
        totalWeeklyHours: data.sundayTotalHours + data.mondayTotalHours + data.tuesdayTotalHours + 
                         data.wednesdayTotalHours + data.thursdayTotalHours + data.fridayTotalHours + data.saturdayTotalHours,
      };

      const response = await fetch(`/api/timesheets/${employee.timesheetId}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timesheetData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to edit timecard: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Timecard edited successfully",
        description: "The employee will be notified of the changes via email.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/timecard-summary'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error editing timecard",
        description: error.message || "Failed to edit timecard",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: SupervisorEditFormData) => {
    editMutation.mutate(data);
  };

  // Helper function to calculate hours from time inputs
  const calculateHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    
    return Math.round(hours * 100) / 100; // Round to 2 decimal places
  };

  // Helper function to update total hours for a day
  const updateDayTotalHours = (day: string, shifts: any[]) => {
    const totalHours = shifts.reduce((sum, shift) => sum + (shift.hours || 0), 0);
    form.setValue(`${day}TotalHours` as any, totalHours);
  };

  // Helper function to add a shift to a day
  const addShift = (day: string) => {
    const currentShifts = form.getValues(`${day}Shifts` as any) || [];
    const newShift = { startTime: "", endTime: "", hours: 0 };
    const updatedShifts = [...currentShifts, newShift];
    form.setValue(`${day}Shifts` as any, updatedShifts);
  };

  // Helper function to remove a shift from a day
  const removeShift = (day: string, index: number) => {
    const currentShifts = form.getValues(`${day}Shifts` as any) || [];
    const updatedShifts = currentShifts.filter((_: any, i: number) => i !== index);
    form.setValue(`${day}Shifts` as any, updatedShifts);
    updateDayTotalHours(day, updatedShifts);
  };

  // Helper function to update shift times and recalculate hours
  const updateShiftTime = (day: string, shiftIndex: number, field: 'startTime' | 'endTime', value: string) => {
    const currentShifts = form.getValues(`${day}Shifts` as any) || [];
    const updatedShifts = [...currentShifts];
    updatedShifts[shiftIndex] = { ...updatedShifts[shiftIndex], [field]: value };
    
    // Recalculate hours for this shift
    const shift = updatedShifts[shiftIndex];
    if (shift.startTime && shift.endTime) {
      shift.hours = calculateHours(shift.startTime, shift.endTime);
    }
    
    form.setValue(`${day}Shifts` as any, updatedShifts);
    updateDayTotalHours(day, updatedShifts);
  };

  if (isLoadingTimesheet) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading timecard data...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Timecard - {employee.employeeName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Employee Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="employeeName">Employee Name</Label>
                <Input
                  id="employeeName"
                  {...form.register("employeeName")}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="employeeNumber">Employee Number</Label>
                <Input
                  id="employeeNumber"
                  {...form.register("employeeNumber")}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="weekEnding">Week Ending</Label>
                <Input
                  id="weekEnding"
                  {...form.register("weekEnding")}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Daily Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Daily Hours & Shifts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
                const dayShifts = form.watch(`${day}Shifts` as any) || [];
                const totalHours = form.watch(`${day}TotalHours` as any) || 0;
                
                return (
                  <div key={day} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="capitalize font-medium text-base">
                          {day}
                        </Label>
                        <div className="text-sm text-gray-600">
                          Total: {totalHours} hours
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addShift(day)}
                        className="text-xs"
                        data-testid={`button-add-shift-${day}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Shift
                      </Button>
                    </div>
                    
                    {/* Show shifts */}
                    {dayShifts.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-md">
                        No shifts added. Click "Add Shift" to get started.
                      </div>
                    ) : (
                      dayShifts.map((shift: any, index: number) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center py-2 bg-gray-50 rounded mb-2 p-3">
                          <div className="col-span-4">
                            <Label className="text-xs text-gray-600">Start Time</Label>
                            <Input
                              type="time"
                              value={shift.startTime || ''}
                              onChange={(e) => updateShiftTime(day, index, 'startTime', e.target.value)}
                              className="text-sm"
                              data-testid={`input-start-time-${day}-${index}`}
                            />
                          </div>
                          <div className="col-span-4">
                            <Label className="text-xs text-gray-600">End Time</Label>
                            <Input
                              type="time"
                              value={shift.endTime || ''}
                              onChange={(e) => updateShiftTime(day, index, 'endTime', e.target.value)}
                              className="text-sm"
                              data-testid={`input-end-time-${day}-${index}`}
                            />
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs text-gray-600">Hours</Label>
                            <div className="text-sm font-medium text-center py-2">
                              {shift.hours || 0}
                            </div>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeShift(day, index)}
                              className="text-red-600 hover:text-red-700 p-1"
                              data-testid={`button-remove-shift-${day}-${index}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Hidden input for form validation */}
                    <Input
                      type="hidden"
                      {...form.register(`${day}TotalHours` as any)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Rescue Coverage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rescue Coverage</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rescueCoverage${day}`}
                    checked={form.watch(`rescueCoverage${day}` as any)}
                    onCheckedChange={(checked) => 
                      form.setValue(`rescueCoverage${day}` as any, checked as boolean)
                    }
                  />
                  <Label htmlFor={`rescueCoverage${day}`} className="text-sm">
                    {day}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Edit Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Edit Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supervisorName">Supervisor Name</Label>
                <Input
                  id="supervisorName"
                  {...form.register("supervisorName")}
                  placeholder="Fire Chief"
                />
                {form.formState.errors.supervisorName && (
                  <p className="text-sm text-red-600">{form.formState.errors.supervisorName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="editReason">Reason for Edit</Label>
                <Input
                  id="editReason"
                  {...form.register("editReason")}
                  placeholder="Reason for editing this timecard..."
                />
                {form.formState.errors.editReason && (
                  <p className="text-sm text-red-600">{form.formState.errors.editReason.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Hours Display */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <span className="text-lg font-semibold">
                  Total Weekly Hours: {
                    (parseFloat(form.watch('sundayTotalHours') as string) || 0) + 
                    (parseFloat(form.watch('mondayTotalHours') as string) || 0) + 
                    (parseFloat(form.watch('tuesdayTotalHours') as string) || 0) + 
                    (parseFloat(form.watch('wednesdayTotalHours') as string) || 0) + 
                    (parseFloat(form.watch('thursdayTotalHours') as string) || 0) + 
                    (parseFloat(form.watch('fridayTotalHours') as string) || 0) + 
                    (parseFloat(form.watch('saturdayTotalHours') as string) || 0)
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={editMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editMutation.isPending}
              className="min-w-[120px]"
            >
              {editMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}