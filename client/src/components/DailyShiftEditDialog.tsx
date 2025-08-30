import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DayShift {
  startTime: string;
  endTime: string;
  hours: number;
}

const dailyShiftSchema = z.object({
  shifts: z.array(z.object({
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    hours: z.number().min(0),
  })),
});

type DailyShiftFormData = z.infer<typeof dailyShiftSchema>;

interface DailyShiftEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  employeeNumber: string;
  timesheetId: string;
  dayName: string;
  weekEnding: string;
  currentShifts?: string[];
}

export function DailyShiftEditDialog({
  open,
  onOpenChange,
  employeeName,
  employeeNumber,
  timesheetId,
  dayName,
  weekEnding,
  currentShifts = []
}: DailyShiftEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse current shifts into form format
  const parseShifts = (shiftStrings: string[]): DayShift[] => {
    if (!shiftStrings || shiftStrings.length === 0) {
      return [{ startTime: "", endTime: "", hours: 0 }];
    }
    
    return shiftStrings.map(shiftString => {
      // Parse "7:00 AM - 3:00 PM (8.0 hours)" format
      const match = shiftString.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)\s*\((.+?)\s*hours?\)/i);
      if (match) {
        const [, startTime, endTime, hoursStr] = match;
        // Convert to 24-hour format for input
        const start24 = convertTo24Hour(startTime.trim());
        const end24 = convertTo24Hour(endTime.trim());
        const hours = parseFloat(hoursStr) || 0;
        return { startTime: start24, endTime: end24, hours };
      }
      return { startTime: "", endTime: "", hours: 0 };
    });
  };

  // Convert 12-hour to 24-hour format
  const convertTo24Hour = (time12: string): string => {
    const match = time12.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
    if (!match) return "";
    
    let [, hours, minutes, period] = match;
    let hour24 = parseInt(hours);
    
    if (period.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  };

  const form = useForm<DailyShiftFormData>({
    resolver: zodResolver(dailyShiftSchema),
    defaultValues: {
      shifts: parseShifts(currentShifts)
    }
  });

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      form.reset({
        shifts: parseShifts(currentShifts)
      });
    }
  }, [open, currentShifts, form]);

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

  // Update shift times and recalculate hours
  const updateShiftTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const currentShifts = form.getValues('shifts');
    const updatedShifts = [...currentShifts];
    updatedShifts[index] = { ...updatedShifts[index], [field]: value };
    
    // Recalculate hours for this shift
    const shift = updatedShifts[index];
    if (shift.startTime && shift.endTime) {
      shift.hours = calculateHours(shift.startTime, shift.endTime);
    }
    
    form.setValue('shifts', updatedShifts);
  };

  const addShift = () => {
    const currentShifts = form.getValues('shifts');
    form.setValue('shifts', [...currentShifts, { startTime: "", endTime: "", hours: 0 }]);
  };

  const removeShift = (index: number) => {
    const currentShifts = form.getValues('shifts');
    if (currentShifts.length > 1) {
      form.setValue('shifts', currentShifts.filter((_, i) => i !== index));
    }
  };

  const editMutation = useMutation({
    mutationFn: async (data: DailyShiftFormData) => {
      return apiRequest(`/api/timesheets/${timesheetId}/edit-day`, {
        method: 'PUT',
        body: JSON.stringify({
          dayName,
          shifts: data.shifts,
          weekEnding,
          employeeName,
          employeeNumber
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${dayName} shifts updated successfully! A new PDF has been generated.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/timecard-summary'] });
      queryClient.invalidateQueries({ queryKey: [`/api/timesheets/${timesheetId}/activity-log`] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shifts",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: DailyShiftFormData) => {
    // Filter out empty shifts
    const validShifts = data.shifts.filter(shift => shift.startTime && shift.endTime);
    editMutation.mutate({ shifts: validShifts });
  };

  const totalHours = form.watch('shifts').reduce((sum, shift) => sum + (shift.hours || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {dayName.charAt(0).toUpperCase() + dayName.slice(1)} Shifts</DialogTitle>
          <DialogDescription>
            {employeeName} - Week ending {new Date(weekEnding).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Shifts for {dayName.charAt(0).toUpperCase() + dayName.slice(1)}</h3>
                <p className="text-sm text-gray-600">Total: {totalHours} hours</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addShift}
                className="flex items-center space-x-1"
                data-testid="button-add-shift"
              >
                <Plus className="h-4 w-4" />
                <span>Add Shift</span>
              </Button>
            </div>

            {form.watch('shifts').map((shift, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center py-3 bg-gray-50 rounded-lg p-3">
                <div className="col-span-4">
                  <Label className="text-xs text-gray-600">Start Time</Label>
                  <Input
                    type="time"
                    value={shift.startTime || ''}
                    onChange={(e) => updateShiftTime(index, 'startTime', e.target.value)}
                    className="text-sm"
                    data-testid={`input-start-time-${index}`}
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs text-gray-600">End Time</Label>
                  <Input
                    type="time"
                    value={shift.endTime || ''}
                    onChange={(e) => updateShiftTime(index, 'endTime', e.target.value)}
                    className="text-sm"
                    data-testid={`input-end-time-${index}`}
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs text-gray-600">Hours</Label>
                  <div className="text-sm font-medium text-center py-2 bg-white rounded border">
                    {shift.hours || 0}
                  </div>
                </div>
                <div className="col-span-1 flex justify-center">
                  {form.watch('shifts').length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeShift(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                      data-testid={`button-remove-shift-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {form.formState.errors.shifts && (
              <p className="text-sm text-red-600">
                {form.formState.errors.shifts.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={editMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editMutation.isPending}
              data-testid="button-save"
            >
              {editMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Generate PDF"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}