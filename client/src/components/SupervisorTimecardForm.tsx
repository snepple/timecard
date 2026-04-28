import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Save, AlertTriangle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateTimeSheetPDF } from "@/lib/pdf-generator";
import { Timesheet } from "@shared/schema";

export interface TimesheetWithActivity extends Timesheet {
  updatedAt?: string | Date | null;
  lastActivityInfo?: {
    type: string;
    by: string;
    timestamp: string;
    description: string;
  } | null;
}

const dayShiftSchema = z.object({
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  hours: z.number().min(0.01, "Hours must be greater than 0"),
});

const supervisorTimecardSchema = z.object({
  employeeName: z.string().min(1, "Employee name is required"),
  employeeNumber: z.string().min(1, "Employee number is required"),
  weekEnding: z.string().min(1, "Week ending date is required"),
  
  sundayDate: z.string().optional(),
  sundayShifts: z.array(dayShiftSchema).default([]),
  sundayTotalHours: z.number().optional(),
  
  mondayDate: z.string().optional(),
  mondayShifts: z.array(dayShiftSchema).default([]),
  mondayTotalHours: z.number().optional(),
  
  tuesdayDate: z.string().optional(),
  tuesdayShifts: z.array(dayShiftSchema).default([]),
  tuesdayTotalHours: z.number().optional(),
  
  wednesdayDate: z.string().optional(),
  wednesdayShifts: z.array(dayShiftSchema).default([]),
  wednesdayTotalHours: z.number().optional(),
  
  thursdayDate: z.string().optional(),
  thursdayShifts: z.array(dayShiftSchema).default([]),
  thursdayTotalHours: z.number().optional(),
  
  fridayDate: z.string().optional(),
  fridayShifts: z.array(dayShiftSchema).default([]),
  fridayTotalHours: z.number().optional(),
  
  saturdayDate: z.string().optional(),
  saturdayShifts: z.array(dayShiftSchema).default([]),
  saturdayTotalHours: z.number().optional(),
  
  totalWeeklyHours: z.number().optional(),
  
  rescueCoverageMonday: z.boolean().default(false),
  rescueCoverageTuesday: z.boolean().default(false),
  rescueCoverageWednesday: z.boolean().default(false),
  rescueCoverageThursday: z.boolean().default(false),
  
  supervisorAcknowledgment: z.boolean().refine(val => val === true, {
    message: "You must acknowledge that you are completing this timecard on behalf of the employee"
  }),
});

type SupervisorTimecardFormData = z.infer<typeof supervisorTimecardSchema>;

interface SupervisorTimecardFormProps {
  // Legacy dialog props (used by TimecardSummaryReport)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  employee?: {
    employeeName: string;
    employeeNumber: string;
  };
  weekEnding?: string;
  onSuccess?: () => void;
  
  // New direct props (used by RescueCoverageReport)
  employeeName?: string;
  employeeNumber?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

const dayNames = [
  { key: 'sunday', label: 'Sunday', shortLabel: 'Sun' },
  { key: 'monday', label: 'Monday', shortLabel: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', shortLabel: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', shortLabel: 'Wed' },
  { key: 'thursday', label: 'Thursday', shortLabel: 'Thu' },
  { key: 'friday', label: 'Friday', shortLabel: 'Fri' },
  { key: 'saturday', label: 'Saturday', shortLabel: 'Sat' },
];

export function SupervisorTimecardForm({ 
  open, 
  onOpenChange, 
  employee, 
  weekEnding, 
  onSuccess,
  employeeName,
  employeeNumber,
  onSave,
  onCancel
}: SupervisorTimecardFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [existingTimecard, setExistingTimecard] = useState<TimesheetWithActivity | null>(null);
  const [dataSource, setDataSource] = useState<'new' | 'existing' | 'schedule'>('new');
  
  // Determine actual employee info and week ending from either prop pattern
  const actualEmployeeName = employeeName || employee?.employeeName || '';
  const actualEmployeeNumber = employeeNumber || employee?.employeeNumber || '';
  const actualWeekEnding = weekEnding || (() => {
    // Calculate current week ending (Saturday) if not provided
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek) % 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);

    // Use manual YYYY-MM-DD formatting to avoid timezone issues
    const year = saturday.getFullYear();
    const month = String(saturday.getMonth() + 1).padStart(2, '0');
    const day = String(saturday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const form = useForm<SupervisorTimecardFormData>({
    resolver: zodResolver(supervisorTimecardSchema),
    defaultValues: {
      employeeName: actualEmployeeName,
      employeeNumber: actualEmployeeNumber,
      weekEnding: actualWeekEnding,
      sundayShifts: [],
      mondayShifts: [],
      tuesdayShifts: [],
      wednesdayShifts: [],
      thursdayShifts: [],
      fridayShifts: [],
      saturdayShifts: [],
      rescueCoverageMonday: false,
      rescueCoverageTuesday: false,
      rescueCoverageWednesday: false,
      rescueCoverageThursday: false,
      supervisorAcknowledgment: false,
    },
  });

  const { watch, setValue, getValues, reset } = form;

  // Watch all shifts to calculate totals
  const watchedShifts = watch([
    'sundayShifts', 'mondayShifts', 'tuesdayShifts', 'wednesdayShifts',
    'thursdayShifts', 'fridayShifts', 'saturdayShifts'
  ]);

  // Calculate day totals and week total
  useEffect(() => {
    const dayTotals: Record<string, number> = {};
    let weekTotal = 0;

    dayNames.forEach((day, index) => {
      const shifts = watchedShifts[index] || [];
      const dayTotal = shifts.reduce((sum, shift) => sum + (shift.hours || 0), 0);
      dayTotals[`${day.key}TotalHours`] = dayTotal;
      weekTotal += dayTotal;
    });

    // Update individual day totals
    Object.entries(dayTotals).forEach(([key, value]) => {
      setValue(key as keyof SupervisorTimecardFormData, value);
    });

    // Update week total
    setValue('totalWeeklyHours', weekTotal);
  }, [watchedShifts, setValue]);

  // Load existing timecard data
  useEffect(() => {
    const loadExistingTimecard = async () => {
      if (!actualEmployeeNumber || !actualWeekEnding) return;
      
      try {
        const response = await fetch(`/api/timesheets/${actualEmployeeNumber}/${actualWeekEnding}`);
        if (response.ok) {
          const timecard = await response.json();
          setExistingTimecard(timecard);
          setDataSource('existing');
          
          // Populate form with existing data
          reset({
            employeeName: timecard.employeeName,
            employeeNumber: timecard.employeeNumber,
            weekEnding: timecard.weekEnding,
            
            sundayDate: timecard.sundayDate,
            sundayShifts: timecard.sundayShifts ? JSON.parse(timecard.sundayShifts) : [],
            sundayTotalHours: parseFloat(timecard.sundayTotalHours || '0'),
            
            mondayDate: timecard.mondayDate,
            mondayShifts: timecard.mondayShifts ? JSON.parse(timecard.mondayShifts) : [],
            mondayTotalHours: parseFloat(timecard.mondayTotalHours || '0'),
            
            tuesdayDate: timecard.tuesdayDate,
            tuesdayShifts: timecard.tuesdayShifts ? JSON.parse(timecard.tuesdayShifts) : [],
            tuesdayTotalHours: parseFloat(timecard.tuesdayTotalHours || '0'),
            
            wednesdayDate: timecard.wednesdayDate,
            wednesdayShifts: timecard.wednesdayShifts ? JSON.parse(timecard.wednesdayShifts) : [],
            wednesdayTotalHours: parseFloat(timecard.wednesdayTotalHours || '0'),
            
            thursdayDate: timecard.thursdayDate,
            thursdayShifts: timecard.thursdayShifts ? JSON.parse(timecard.thursdayShifts) : [],
            thursdayTotalHours: parseFloat(timecard.thursdayTotalHours || '0'),
            
            fridayDate: timecard.fridayDate,
            fridayShifts: timecard.fridayShifts ? JSON.parse(timecard.fridayShifts) : [],
            fridayTotalHours: parseFloat(timecard.fridayTotalHours || '0'),
            
            saturdayDate: timecard.saturdayDate,
            saturdayShifts: timecard.saturdayShifts ? JSON.parse(timecard.saturdayShifts) : [],
            saturdayTotalHours: parseFloat(timecard.saturdayTotalHours || '0'),
            
            totalWeeklyHours: parseFloat(timecard.totalWeeklyHours || '0'),
            
            rescueCoverageMonday: timecard.rescueCoverageMonday || false,
            rescueCoverageTuesday: timecard.rescueCoverageTuesday || false,
            rescueCoverageWednesday: timecard.rescueCoverageWednesday || false,
            rescueCoverageThursday: timecard.rescueCoverageThursday || false,
            
            supervisorAcknowledgment: false // Always require re-acknowledgment
          });
        } else {
          setDataSource('new');
        }
      } catch (error) {
        console.error('Error loading existing timecard:', error);
        setDataSource('new');
      }
    };
    
    loadExistingTimecard();
  }, [actualEmployeeNumber, actualWeekEnding, reset]);

  // Generate week dates for display
  const getWeekDates = () => {
    const endDate = new Date(actualWeekEnding);
    const dates: string[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - i);
      // Use manual YYYY-MM-DD formatting to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    
    return dates;
  };

  const weekDates = getWeekDates();

  // Set date values
  useEffect(() => {
    dayNames.forEach((day, index) => {
      setValue(`${day.key}Date` as keyof SupervisorTimecardFormData, weekDates[index]);
    });
  }, [weekDates, setValue]);

  // Add shift function
  const addShift = (dayKey: string) => {
    const currentShifts = getValues(`${dayKey}Shifts` as keyof SupervisorTimecardFormData) as any[] || [];
    const newShift = { startTime: "", endTime: "", hours: 0 };
    setValue(`${dayKey}Shifts` as keyof SupervisorTimecardFormData, [...currentShifts, newShift]);
  };

  // Remove shift function
  const removeShift = (dayKey: string, index: number) => {
    const currentShifts = getValues(`${dayKey}Shifts` as keyof SupervisorTimecardFormData) as any[] || [];
    const updatedShifts = currentShifts.filter((_, i) => i !== index);
    setValue(`${dayKey}Shifts` as keyof SupervisorTimecardFormData, updatedShifts);
  };

  // Update shift function
  const updateShift = (dayKey: string, index: number, field: string, value: any) => {
    const currentShifts = getValues(`${dayKey}Shifts` as keyof SupervisorTimecardFormData) as any[] || [];
    const updatedShifts = [...currentShifts];
    
    if (field === 'hours') {
      updatedShifts[index][field] = parseFloat(value) || 0;
    } else {
      updatedShifts[index][field] = value;
    }
    
    setValue(`${dayKey}Shifts` as keyof SupervisorTimecardFormData, updatedShifts);
  };

  // Submit timecard mutation
  const submitTimecardMutation = useMutation({
    mutationFn: async (data: SupervisorTimecardFormData) => {
      // Convert form data to API format
      const timecardData = {
        employeeName: data.employeeName,
        employeeNumber: data.employeeNumber,
        weekEnding: data.weekEnding,
        
        sundayDate: data.sundayDate,
        sundayShifts: JSON.stringify(data.sundayShifts),
        sundayTotalHours: data.sundayTotalHours?.toString(),
        
        mondayDate: data.mondayDate,
        mondayShifts: JSON.stringify(data.mondayShifts),
        mondayTotalHours: data.mondayTotalHours?.toString(),
        
        tuesdayDate: data.tuesdayDate,
        tuesdayShifts: JSON.stringify(data.tuesdayShifts),
        tuesdayTotalHours: data.tuesdayTotalHours?.toString(),
        
        wednesdayDate: data.wednesdayDate,
        wednesdayShifts: JSON.stringify(data.wednesdayShifts),
        wednesdayTotalHours: data.wednesdayTotalHours?.toString(),
        
        thursdayDate: data.thursdayDate,
        thursdayShifts: JSON.stringify(data.thursdayShifts),
        thursdayTotalHours: data.thursdayTotalHours?.toString(),
        
        fridayDate: data.fridayDate,
        fridayShifts: JSON.stringify(data.fridayShifts),
        fridayTotalHours: data.fridayTotalHours?.toString(),
        
        saturdayDate: data.saturdayDate,
        saturdayShifts: JSON.stringify(data.saturdayShifts),
        saturdayTotalHours: data.saturdayTotalHours?.toString(),
        
        totalWeeklyHours: data.totalWeeklyHours?.toString(),
        
        rescueCoverageMonday: data.rescueCoverageMonday,
        rescueCoverageTuesday: data.rescueCoverageTuesday,
        rescueCoverageWednesday: data.rescueCoverageWednesday,
        rescueCoverageThursday: data.rescueCoverageThursday,
        
        signatureData: null, // No signature for supervisor-completed timecards
        status: 'submitted',
        completedBy: 'supervisor', // Mark as supervisor-completed
      };

      return apiRequest("POST", "/api/timesheets", timecardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/timecard-summary'] });
      toast({
        title: "Timecard submitted",
        description: `Timecard completed on behalf of ${actualEmployeeName}`,
        duration: 2000,
      });
      reset();
      onOpenChange?.(false);
      onSave?.();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit timecard",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const onSubmit = async (data: SupervisorTimecardFormData) => {
    setIsLoading(true);
    try {
      await submitTimecardMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDayCard = (day: typeof dayNames[0], index: number) => {
    const dayShifts = watch(`${day.key}Shifts` as keyof SupervisorTimecardFormData) as any[] || [];
    const dayTotal = watch(`${day.key}TotalHours` as keyof SupervisorTimecardFormData) as number || 0;
    const rescueCoverageKey = `rescueCoverage${day.label}` as keyof SupervisorTimecardFormData;

    return (
      <Card key={day.key} className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex justify-between items-center">
            <span>{day.shortLabel} {weekDates[index] ? new Date(weekDates[index]).toLocaleDateString() : ''}</span>
            <span className="font-normal text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
              {dayTotal.toFixed(2)}h
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dayShifts.map((shift, shiftIndex) => (
            <div key={shiftIndex} className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-600">Shift {shiftIndex + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeShift(day.key, shiftIndex)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor={`${day.key}-${shiftIndex}-start`} className="text-xs">Start</Label>
                  <Input
                    id={`${day.key}-${shiftIndex}-start`}
                    type="time"
                    value={shift.startTime}
                    onChange={(e) => updateShift(day.key, shiftIndex, 'startTime', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor={`${day.key}-${shiftIndex}-end`} className="text-xs">End</Label>
                  <Input
                    id={`${day.key}-${shiftIndex}-end`}
                    type="time"
                    value={shift.endTime}
                    onChange={(e) => updateShift(day.key, shiftIndex, 'endTime', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor={`${day.key}-${shiftIndex}-hours`} className="text-xs">Hours</Label>
                  <Input
                    id={`${day.key}-${shiftIndex}-hours`}
                    type="number"
                    step="0.25"
                    value={shift.hours}
                    onChange={(e) => updateShift(day.key, shiftIndex, 'hours', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addShift(day.key)}
            className="w-full h-8 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Shift
          </Button>

          {/* Rescue coverage for weekdays only */}
          {['monday', 'tuesday', 'wednesday', 'thursday'].includes(day.key) && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id={`rescue-${day.key}`}
                checked={!!watch(rescueCoverageKey)}
                onCheckedChange={(checked) => setValue(rescueCoverageKey, checked as boolean)}
                className="h-4 w-4"
              />
              <Label htmlFor={`rescue-${day.key}`} className="text-xs text-gray-600">
                Rescue Coverage
              </Label>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const totalHours = watch('totalWeeklyHours') || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Complete Timecard on Behalf of {actualEmployeeName}</span>
          </DialogTitle>
          <DialogDescription>
            {dataSource === 'existing' && existingTimecard && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded mb-3">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">
                  Previously submitted timecard found - Status: {existingTimecard.status} | 
                  Last modified: {new Date(existingTimecard.updatedAt || existingTimecard.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
            As a supervisor, you are completing this timecard for an employee who did not submit their own. 
            Please enter the hours to the best of your knowledge based on schedule and actual time worked.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee Info */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Employee:</strong> {actualEmployeeName} (#{actualEmployeeNumber}) 
              <br />
              <strong>Week Ending:</strong> {new Date(actualWeekEnding).toLocaleDateString()}
            </AlertDescription>
          </Alert>

          {/* Daily Time Entry */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dayNames.map((day, index) => renderDayCard(day, index))}
          </div>

          {/* Week Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Week Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Total Weekly Hours:</span>
                <span className="text-2xl font-bold text-blue-600">{totalHours.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Supervisor Acknowledgment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-orange-600">Supervisor Acknowledgment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="supervisor-acknowledgment"
                  checked={watch('supervisorAcknowledgment')}
                  onCheckedChange={(checked) => setValue('supervisorAcknowledgment', checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="supervisor-acknowledgment" className="text-sm leading-relaxed">
                  I acknowledge that I am completing this timecard on behalf of{' '}
                  <strong>{actualEmployeeName}</strong> due to their failure to submit a timecard. 
                  I certify that the hours entered above represent the time worked to the best of my knowledge 
                  based on schedule information and actual time worked. This timecard is being completed by 
                  the Fire Chief/Supervisor in accordance with department policy.
                </Label>
              </div>
              {form.formState.errors.supervisorAcknowledgment && (
                <p className="text-sm text-red-500 mt-2">
                  {form.formState.errors.supervisorAcknowledgment.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submit Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange?.(false); onCancel?.(); }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !watch('supervisorAcknowledgment')}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Submitting..." : "Submit Timecard"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}