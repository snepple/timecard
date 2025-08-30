import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/time-picker";
import { WeekPicker } from "@/components/ui/week-picker";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { calculateHours, populateWeekDates } from "@/lib/time-calculations";
import { generateTimeSheetPDF } from "@/lib/pdf-generator";
import { apiRequest } from "@/lib/queryClient";
import SignaturePad from "@/components/ui/signature-pad";
import { getCurrentWeekEndingDate, isSaturday, getNextSaturday, getPreviousSaturday } from "@/lib/date-utils";

// Check if timecard editing is allowed (before Saturday 11:59 PM ET of current week)
const isTimecardEditingAllowed = (weekEnding: string): boolean => {
  const weekEndDate = new Date(weekEnding);
  const now = new Date();
  
  // Convert to Eastern Time
  const easternNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const easternWeekEnd = new Date(weekEndDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  // Check if we're still in the same week and before Saturday 11:59 PM ET
  const saturdayDeadline = new Date(easternWeekEnd);
  saturdayDeadline.setHours(23, 59, 59, 999);
  
  return easternNow <= saturdayDeadline;
};
import { Flame, User, IdCard, Calendar, Save, Mail, Printer, HelpCircle, Users, RefreshCw, Send, CheckCircle, Clock, XCircle, AlertCircle, Check, RotateCcw, LogOut, Plus, Trash2, Download } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const dayShiftSchema = z.object({
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"), 
  hours: z.number().min(0, "Hours must be positive"),
});

const timesheetSchema = z.object({
  memberName: z.string().min(1, "Member name is required"),
  memberNumber: z.string().min(1, "Member number is required"),
  selectedMember: z.string().optional(),
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
  
  signatureData: z.string().min(1, "Digital signature is required before submitting"),
  acknowledgmentChecked: z.boolean().refine(val => val === true, {
    message: "You must acknowledge that you have reviewed all times and totals for accuracy"
  }),
  
  // Employee edit fields
  isEditingPreviousSubmission: z.boolean().default(false),
  editComments: z.string().optional().refine((val, ctx) => {
    const isEditing = ctx.parent.isEditingPreviousSubmission;
    if (isEditing && (!val || val.trim().length === 0)) {
      return false;
    }
    return true;
  }, {
    message: "Please explain what changes you made to your timesheet"
  }),
  originalSubmissionDate: z.string().optional(),
  
  status: z.string().optional(),
  id: z.string().optional(),
});

type TimesheetFormData = z.infer<typeof timesheetSchema>;
type DayShift = z.infer<typeof dayShiftSchema>;

const DAYS_OF_WEEK = [
  { key: "sunday", label: "Sunday" },
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
] as const;

// Generate time options in 15-minute intervals
function generateTimeOptions(): string[] {
  const times: string[] = [];
  
  // Start from 07:00 and go to 06:45 next day (07:00-07:00 range)
  // First part: 07:00 to 23:45
  for (let hour = 7; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      times.push(timeStr);
    }
  }
  
  // Second part: 00:00 to 06:45, then 07:00 (next day)
  for (let hour = 0; hour < 7; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      times.push(timeStr);
    }
  }
  
  // Add 07:00 as the final option (end of the 24-hour cycle) - no duplicate
  times.push('07:00');
  
  return times;
}

const TIME_OPTIONS = generateTimeOptions();

// Helper function to check for overlapping shifts within the 07:00-07:00 range
function checkForOverlappingShifts(shifts: DayShift[], currentIndex: number): boolean {
  const currentShift = shifts[currentIndex];
  if (!currentShift.startTime || !currentShift.endTime) return false;

  // Convert times to minutes since 07:00 for easy comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    // If hour is 0-6, it's next day (after midnight within our 07:00-07:00 range)
    const adjustedHours = hours < 7 ? hours + 24 : hours;
    return (adjustedHours - 7) * 60 + minutes;
  };

  const currentStart = timeToMinutes(currentShift.startTime);
  const currentEnd = timeToMinutes(currentShift.endTime);

  // Check against all other complete shifts
  for (let i = 0; i < shifts.length; i++) {
    if (i === currentIndex) continue;
    
    const otherShift = shifts[i];
    if (!otherShift.startTime || !otherShift.endTime) continue;

    const otherStart = timeToMinutes(otherShift.startTime);
    const otherEnd = timeToMinutes(otherShift.endTime);

    // Check for overlap: shifts overlap if one starts before the other ends
    const hasOverlap = (currentStart < otherEnd && currentEnd > otherStart);
    if (hasOverlap) return true;
  }

  return false;
}

// Helper function to combine back-to-back shifts
function combineBackToBackShifts(shifts: Shift[]): Shift[] {
  if (shifts.length <= 1) return shifts;
  
  const combined: Shift[] = [];
  let currentShift = { ...shifts[0] };
  
  for (let i = 1; i < shifts.length; i++) {
    const nextShift = shifts[i];
    const currentEndTime = new Date(currentShift.endTime);
    const nextStartTime = new Date(nextShift.startTime);
    
    // Check if shifts are back-to-back (within 1 hour of each other)
    const timeDiff = Math.abs(nextStartTime.getTime() - currentEndTime.getTime());
    const isBackToBack = timeDiff <= 60 * 60 * 1000; // 1 hour in milliseconds
    
    if (isBackToBack) {
      // Combine with current shift
      currentShift.endTime = nextShift.endTime;
      currentShift.duration = currentShift.duration + nextShift.duration;
    } else {
      // Save current shift and start new one
      combined.push(currentShift);
      currentShift = { ...nextShift };
    }
  }
  
  // Add the final shift
  combined.push(currentShift);
  return combined;
}

interface Member {
  firstName: string;
  lastName: string;
  fullName: string;
  memberNumber: string;
}

interface Shift {
  memberNumber: string;
  memberName: string;
  startTime: string;
  endTime: string;
  position: string;
  duration: number;
  date: string;
  description?: string;
}

interface ScheduleData {
  members: Member[];
  shifts: Shift[];
  lastUpdated: string;
}

interface TimesheetPageProps {
  logout?: () => void;
}

export default function TimesheetPage({ logout }: TimesheetPageProps = {}) {
  const { toast } = useToast();
  const [signatureData, setSignatureData] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState<string>("");
  const [currentTimesheet, setCurrentTimesheet] = useState<any>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showEmployeeIdPrompt, setShowEmployeeIdPrompt] = useState(false);
  const [tempEmployeeData, setTempEmployeeData] = useState<{ id: string; name: string } | null>(null);
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [currentEmployeeEmail, setCurrentEmployeeEmail] = useState("");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewPdfData, setPreviewPdfData] = useState<string | null>(null);
  const [showSubmissionPreview, setShowSubmissionPreview] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number | null>(null);

  // Auto-submit countdown timer for submission preview
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showSubmissionPreview && autoSubmitCountdown === null) {
      // Start countdown when preview opens
      setAutoSubmitCountdown(30);
    }
    
    if (autoSubmitCountdown !== null && autoSubmitCountdown > 0) {
      timer = setTimeout(() => {
        setAutoSubmitCountdown(autoSubmitCountdown - 1);
      }, 1000);
    } else if (autoSubmitCountdown === 0) {
      // Time's up, auto-submit
      handleSaveAndSubmit();
      setAutoSubmitCountdown(null);
    }
    
    // Reset countdown when dialog closes
    if (!showSubmissionPreview && autoSubmitCountdown !== null) {
      setAutoSubmitCountdown(null);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showSubmissionPreview, autoSubmitCountdown]);

  // Fetch schedule data (employees and shifts)
  const scheduleQuery = useQuery<ScheduleData>({
    queryKey: ['/api/schedule'],
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch employee numbers from database
  const employeeNumbersQuery = useQuery<Array<{ id: string; employeeName: string; employeeNumber: string; active: boolean }>>({
    queryKey: ['/api/employee-numbers'],
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Update or create employee number mutation
  const updateEmployeeNumberMutation = useMutation({
    mutationFn: async ({ id, employeeNumber }: { id: string; employeeNumber: string }) => {
      if (id) {
        // Update existing employee
        return apiRequest("PUT", `/api/employee-numbers/${id}`, { employeeName: tempEmployeeData?.name, employeeNumber });
      } else {
        // Create new employee
        return apiRequest("POST", "/api/employee-numbers", { employeeName: tempEmployeeData?.name, employeeNumber });
      }
    },
    onSuccess: () => {
      // Force refresh the employee numbers data
      employeeNumbersQuery.refetch().then(() => {
        // After data is refreshed, update the form field
        if (tempEmployeeData) {
          const updatedEmployee = employeeNumbersQuery.data?.find(emp => emp.id === tempEmployeeData.id);
          if (updatedEmployee && updatedEmployee.employeeNumber) {
            setValue("employeeNumber", updatedEmployee.employeeNumber);
          }
        }
      });
      setShowEmployeeIdPrompt(false);
      setEmployeeIdInput("");
      setTempEmployeeData(null);
      toast({
        title: "Employee ID saved",
        description: "Your employee ID has been saved for future timesheets.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save employee ID. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      sundayShifts: [],
      mondayShifts: [],
      tuesdayShifts: [],
      wednesdayShifts: [],
      thursdayShifts: [],
      fridayShifts: [],
      saturdayShifts: [],
      memberName: "",
      memberNumber: "",
      weekEnding: getCurrentWeekEndingDate(), // Default to current week
      selectedMember: "",
      rescueCoverageMonday: false,
      rescueCoverageTuesday: false,
      rescueCoverageWednesday: false,
      rescueCoverageThursday: false,
      acknowledgmentChecked: false,
      isEditingPreviousSubmission: false,
      editComments: "",
      originalSubmissionDate: "",
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedValues = watch();

  // Check for existing timesheet for current week
  const existingTimesheetQuery = useQuery({
    queryKey: ['/api/timesheets/employee', watchedValues.memberNumber, watchedValues.weekEnding],
    enabled: !!watchedValues.memberNumber && !!watchedValues.weekEnding,
    retry: false,
  });

  // TODO: Implement form population when existing timesheet is found
  // useEffect(() => {
  //   if (existingTimesheetQuery.data && existingTimesheetQuery.data.status === 'submitted') {
  //     // Populate form logic will go here
  //   }
  // }, [existingTimesheetQuery.data]);

  // Auto-calculate daily hours when shifts change
  useEffect(() => {
    DAYS_OF_WEEK.forEach(({ key }) => {
      const shifts = watchedValues[`${key}Shifts` as keyof TimesheetFormData] as DayShift[];
      if (shifts && shifts.length > 0) {
        const totalHours = shifts.reduce((sum, shift) => sum + shift.hours, 0);
        setValue(`${key}TotalHours` as keyof TimesheetFormData, parseFloat(totalHours.toFixed(2)));
      } else {
        setValue(`${key}TotalHours` as keyof TimesheetFormData, 0);
      }
    });
  }, [watchedValues, setValue]);

  // Auto-calculate total weekly hours
  useEffect(() => {
    const total = DAYS_OF_WEEK.reduce((sum, { key }) => {
      const dayHours = watchedValues[`${key}TotalHours` as keyof TimesheetFormData] as number || 0;
      return sum + dayHours;
    }, 0);
    
    setValue("totalWeeklyHours", parseFloat(total.toFixed(2)));
  }, [watchedValues, setValue]);

  // Auto-populate week dates when week ending date changes
  useEffect(() => {
    const weekEnding = watchedValues.weekEnding;
    if (weekEnding) {
      const dates = populateWeekDates(weekEnding);
      DAYS_OF_WEEK.forEach(({ key }, index) => {
        setValue(`${key}Date` as keyof TimesheetFormData, dates[index]);
      });
    }
  }, [watchedValues.weekEnding, setValue]);



  // Auto-populate timecard when employee is selected
  const autoPopulateFromSchedule = async (employeeNumber: string, weekEnding: string) => {
    console.log('🚀 AUTO-POPULATE STARTING for employee', employeeNumber, 'week ending', weekEnding);
    
    if (!employeeNumber || !weekEnding) return;
    
    // Show loading state during auto-populate
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/schedule/employee/${employeeNumber}/week/${weekEnding}`);
      if (!response.ok) return;
      
      const shifts: Shift[] = await response.json();
      console.log('📅 Found shifts for week:', shifts.length, shifts);
      
      // Clear existing shifts
      DAYS_OF_WEEK.forEach(({ key }) => {
        setValue(`${key}Shifts` as keyof TimesheetFormData, []);
        setValue(`${key}TotalHours` as keyof TimesheetFormData, 0);
      });
      
      // Clear rescue coverage first
      setValue("rescueCoverageMonday", false);
      setValue("rescueCoverageTuesday", false);
      setValue("rescueCoverageWednesday", false);
      setValue("rescueCoverageThursday", false);
      
      // Group shifts by calendar date and combine multiple shifts per day
      const shiftsByDate = new Map<string, Shift[]>();
      
      shifts.forEach((shift) => {
        const shiftDate = shift.date; // Use date string directly
        if (!shiftsByDate.has(shiftDate)) {
          shiftsByDate.set(shiftDate, []);
        }
        shiftsByDate.get(shiftDate)!.push(shift);
      });
      
      // Process each date group
      shiftsByDate.forEach((dayShifts, dateStr) => {
        let hasNightDuty = false;
        let regularShifts: Shift[] = [];
        
        // Sort shifts by start time for this date
        dayShifts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        // Separate night duty from regular shifts
        let nightDutyShifts: Shift[] = [];
        dayShifts.forEach((shift) => {
          // Check for night duty using PositionName field from ICS description
          const description = (shift.description || '');
          
          // Look for the exact ICS format: PositionName:Night Duty (case insensitive)
          const isNightDuty = /PositionName:\s*Night\s*Duty/i.test(description);
          
          if (isNightDuty) {
            hasNightDuty = true;
            nightDutyShifts.push(shift);
            console.log('✅ NIGHT DUTY DETECTED for', dateStr, '- Found in description');
            // Skip night duty shifts for time calculations - they only affect rescue coverage
            return;
          }
          
          regularShifts.push(shift);
        });
        
        // Handle Night Duty shifts for rescue coverage (separate from regular shift processing)
        if (hasNightDuty && nightDutyShifts.length > 0) {
          nightDutyShifts.forEach(nightShift => {
            console.log('Processing Night Duty shift:', {
              date: dateStr,
              position: nightShift.position,
              startTime: nightShift.startTime
            });
            
            const nightStartTime = new Date(nightShift.startTime);
            const nightStartTimeET = new Date(nightStartTime.toLocaleString("en-US", {timeZone: "America/New_York"}));
            const nightStartHour = nightStartTimeET.getHours();
            
            // Get the calendar date this night duty shift starts on
            const nightShiftCalendarDate = new Date(dateStr + 'T12:00:00');
            let nightTimesheetDay = nightShiftCalendarDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            // If night duty starts before 7am, it belongs to the previous timesheet day
            if (nightStartHour < 7) {
              nightTimesheetDay = (nightTimesheetDay - 1 + 7) % 7; // Wrap around for Sunday
            }
            
            const nightDayKey = DAYS_OF_WEEK[nightTimesheetDay]?.key;
            
            console.log('Night Duty mapping:', {
              originalDate: dateStr,
              startHour: nightStartHour,
              dayOfWeek: nightTimesheetDay,
              dayKey: nightDayKey,
              willSetRescueCoverage: ['monday', 'tuesday', 'wednesday', 'thursday'].includes(nightDayKey || '')
            });
            
            // Mark rescue coverage for weeknights only (Monday-Thursday)
            if (nightDayKey === 'monday') {
              console.log('Setting rescue coverage for Monday');
              setValue("rescueCoverageMonday", true);
            }
            else if (nightDayKey === 'tuesday') {
              console.log('Setting rescue coverage for Tuesday');
              setValue("rescueCoverageTuesday", true);
            }
            else if (nightDayKey === 'wednesday') {
              console.log('Setting rescue coverage for Wednesday');
              setValue("rescueCoverageWednesday", true);
            }
            else if (nightDayKey === 'thursday') {
              console.log('Setting rescue coverage for Thursday');
              setValue("rescueCoverageThursday", true);
            }
            else {
              console.log('Night Duty shift on non-weeknight, no rescue coverage set');
            }
          });
        }
        
        // Process regular shifts only if there are any
        if (regularShifts.length === 0) return;
        
        // Determine which timesheet day this belongs to based on the first regular shift's start time
        const firstShift = regularShifts[0];
        const startTime = new Date(firstShift.startTime);
        
        // Convert to Eastern time for proper 7am calculation
        const startTimeET = new Date(startTime.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const startHour = startTimeET.getHours();
        
        // Get the calendar date this shift starts on
        const shiftCalendarDate = new Date(dateStr + 'T12:00:00');
        let timesheetDay = shiftCalendarDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // If shift starts before 7am, it belongs to the previous timesheet day
        if (startHour < 7) {
          timesheetDay = (timesheetDay - 1 + 7) % 7; // Wrap around for Sunday
        }
        
        const dayKey = DAYS_OF_WEEK[timesheetDay]?.key;
        
        if (dayKey) {
          
          // Process regular shifts - check if they should be combined or kept separate
          if (regularShifts.length > 0) {
            const processedShifts = combineBackToBackShifts(regularShifts);
            
            const dayShifts = processedShifts.map(shift => ({
              startTime: new Date(shift.startTime).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/New_York'
              }),
              endTime: new Date(shift.endTime).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/New_York'
              }),
              hours: shift.duration
            }));
            
            // Get existing shifts for this day and add new ones
            const currentShifts = getValues(`${dayKey}Shifts` as keyof TimesheetFormData) as DayShift[];
            const allShifts = [...currentShifts, ...dayShifts];
            setValue(`${dayKey}Shifts` as keyof TimesheetFormData, allShifts);
          }
        }
      });
      
      toast({
        title: "Schedule loaded", 
        description: `Populated timecard from ${shifts.length} scheduled shifts.`,
        duration: 2000, // Auto-dismiss after 2 seconds
      });
    } catch (error) {
      console.error("Error auto-populating from schedule:", error);
    } finally {
      // Hide loading state
      setIsLoading(false);
    }
  };

  // Handle employee selection
  const handleEmployeeSelect = async (employeeNumber: string) => {
    setSelectedEmployeeNumber(employeeNumber);
    setValue("selectedEmployee", employeeNumber);
    
    const employee = scheduleQuery.data?.employees?.find((emp) => emp.employeeNumber === employeeNumber);
    if (employee) {
      setValue("employeeName", employee.fullName);
      
      // Check if this employee exists in the database and has an employee number
      const dbEmployee = employeeNumbersQuery.data?.find(emp => emp.employeeName === employee.fullName);
      
      if (dbEmployee && dbEmployee.employeeNumber && dbEmployee.employeeNumber.trim() !== "") {
        // Employee has an ID in database, use it
        setValue("employeeNumber", dbEmployee.employeeNumber);
        
        // Check if email exists for this employee
        try {
          const emailResponse = await fetch(`/api/employee-numbers/${dbEmployee.employeeNumber}/email`);
          if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            if (emailData.email) {
              setCurrentEmployeeEmail(emailData.email);
            }
          }
        } catch (error) {
          console.log("Could not fetch email for employee");
        }
      } else if (dbEmployee && (!dbEmployee.employeeNumber || dbEmployee.employeeNumber.trim() === "")) {
        // Employee exists in database but no employee number - prompt for it
        setTempEmployeeData({ id: dbEmployee.id, name: employee.fullName });
        setShowEmployeeIdPrompt(true);
        setValue("employeeNumber", ""); // Clear until they provide ID
      } else {
        // Employee not in database - prompt for employee ID and add to database
        setTempEmployeeData({ id: "", name: employee.fullName });
        setShowEmployeeIdPrompt(true);
        setValue("employeeNumber", ""); // Clear until they provide ID
      }
      
      // Auto-populate from schedule if week ending is set
      const weekEnding = getValues("weekEnding");
      if (weekEnding) {
        autoPopulateFromSchedule(employeeNumber, weekEnding);
      }
    } else {
      // Clear fields if no employee selected
      setValue("employeeName", "");
      setValue("employeeNumber", "");
      setCurrentEmployeeEmail("");
    }
  };

  // Handle clearing all fields
  // Handle employee ID submission
  const handleEmployeeIdSubmit = () => {
    if (!employeeIdInput.trim()) {
      toast({
        title: "Employee ID required",
        description: "Please enter your employee ID number.",
        variant: "destructive",
      });
      return;
    }

    if (tempEmployeeData) {
      updateEmployeeNumberMutation.mutate({
        id: tempEmployeeData.id,
        employeeNumber: employeeIdInput.trim()
      });
      setValue("employeeNumber", employeeIdInput.trim());
    }
  };

  const handleClearAll = () => {
    // Reset form to default values
    form.reset({
      employeeName: "",
      employeeNumber: "",
      weekEnding: getCurrentWeekEndingDate(),
      selectedEmployee: "",
      rescueCoverageMonday: false,
      rescueCoverageTuesday: false,
      rescueCoverageWednesday: false,
      rescueCoverageThursday: false,
    });
    
    // Clear local state
    setSelectedEmployeeNumber("");
    setSignatureData("");
    setCurrentTimesheet(null);
    setMemberDialogOpen(false);
    setMemberSearchQuery('');
    
    toast({
      title: "Cleared",
      description: "All fields have been cleared. Ready for new timesheet.",
    });
  };

  // Handle week ending change
  const handleWeekEndingChange = (weekEnding: string) => {
    let finalWeekEnding = weekEnding;
    
    // Validate it's a Saturday
    if (!isSaturday(weekEnding)) {
      const nextSaturday = getNextSaturday(weekEnding);
      finalWeekEnding = nextSaturday;
      setValue("weekEnding", nextSaturday);
      toast({
        title: "Date adjusted",
        description: "Week ending date must be a Saturday. Date adjusted to next Saturday.",
        variant: "destructive",
      });
    } else {
      setValue("weekEnding", weekEnding);
    }
    
    // Auto-populate from schedule if employee is selected (use the final week ending date)
    if (selectedEmployeeNumber) {
      autoPopulateFromSchedule(selectedEmployeeNumber, finalWeekEnding);
    }
  };


  // Query to get employee email if it exists
  const employeeEmailQuery = useQuery({
    queryKey: [`/api/employee-numbers/${watchedValues.employeeNumber}/email`],
    enabled: !!watchedValues.employeeNumber,
    retry: false,
  });

  // Update currentEmployeeEmail when email query data changes
  useEffect(() => {
    const fetchedEmail = (employeeEmailQuery.data as { email?: string })?.email;
    if (fetchedEmail) {
      setCurrentEmployeeEmail(fetchedEmail);
    } else {
      setCurrentEmployeeEmail("");
    }
  }, [employeeEmailQuery.data]);

  const emailTimesheetMutation = useMutation({
    mutationFn: async (data: { employeeNumber: string; employeeEmail: string; timesheetData: { employeeName: string; weekEnding: string; pdfBuffer: string } }) => {
      const response = await apiRequest("POST", "/api/timesheet/submit-email", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet submitted successfully via email!",
      });
      setShowEmailDialog(false);
      setEmployeeEmail("");
    },
    onError: (error) => {
      console.error("Email submission error:", error);
      let errorMessage = "Failed to submit timesheet via email. Please try again.";
      
      // Try to extract more specific error message
      if (error instanceof Error) {
        if (error.message.includes("500:") || error.message.includes("Internal")) {
          errorMessage = "Server error - please check email configuration in admin settings.";
        } else if (error.message.includes("400:") || error.message.includes("Validation")) {
          errorMessage = "Invalid data - please check all required fields are filled.";
        } else if (error.message.includes("SMTP") || error.message.includes("email")) {
          errorMessage = "Email service error - please contact administrator.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: "Email Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const submitTimesheetMutation = useMutation({
    mutationFn: async (timesheetId: string) => {
      const response = await apiRequest("POST", `/api/timesheets/${timesheetId}/submit`);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentTimesheet(data);
      toast({
        title: "Success",
        description: "Timesheet submitted for supervisor approval!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit timesheet. Please try again.",
        variant: "destructive",
      });
    },
  });


  const handleSubmitForApproval = () => {
    if (!currentTimesheet?.id) {
      toast({
        title: "Save Required",
        description: "Please save the timesheet first before submitting for approval.",
        variant: "destructive",
      });
      return;
    }

    const formData = getValues();
    
    // Check if acknowledgment is checked
    if (!formData.acknowledgmentChecked) {
      toast({
        title: "Acknowledgment Required",
        description: "Please check the acknowledgment box to confirm you have reviewed all times and totals for accuracy.",
        variant: "destructive",
      });
      return;
    }

    // Check if signature is present
    if (!signatureData || signatureData.trim() === '') {
      toast({
        title: "Signature Required",
        description: "Please provide a digital signature before submitting for approval.",
        variant: "destructive",
      });
      return;
    }

    submitTimesheetMutation.mutate(currentTimesheet.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Draft
          </span>
        );
      case "submitted":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Approval
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };


  // Convert shifts arrays to individual start/end time fields for PDF
  const convertFormDataForPDF = (formData: any) => {
    const pdfData: any = { ...formData };
    
    DAYS_OF_WEEK.forEach(({ key }) => {
      const shifts = formData[`${key}Shifts`] as DayShift[] || [];
      
      if (shifts.length > 0) {
        if (shifts.length === 1) {
          // Single shift - use simple format
          const shift = shifts[0];
          if (shift.startTime && shift.endTime) {
            pdfData[`${key}StartTime`] = shift.startTime;
            pdfData[`${key}EndTime`] = shift.endTime;
          }
        } else {
          // Multiple shifts - format with shift labels
          const validShifts = shifts.filter(shift => shift.startTime && shift.endTime);
          if (validShifts.length > 0) {
            const startTimeText = validShifts.map((shift, index) => 
              `Shift ${index + 1}: ${shift.startTime}`
            ).join('\n');
            
            const endTimeText = validShifts.map((shift, index) => 
              `Shift ${index + 1}: ${shift.endTime}`
            ).join('\n');
            
            pdfData[`${key}StartTime`] = startTimeText;
            pdfData[`${key}EndTime`] = endTimeText;
          }
        }
      }
    });
    
    // Include employee edit information for PDF annotations
    if (formData.isEditingPreviousSubmission) {
      pdfData.isEditingPreviousSubmission = true;
      pdfData.editComments = formData.editComments;
      pdfData.employeeEditedAt = new Date().toISOString(); // Current time for when PDF is generated
      pdfData.originalSubmissionDate = formData.originalSubmissionDate;
    }
    
    return pdfData;
  };

  const handleEmail = async () => {
    const formData = getValues();
    if (!formData.memberName || !formData.memberNumber || !formData.weekEnding) {
      toast({
        title: "Validation Error",
        description: "Please fill in member name, number, and week ending date.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert form data to PDF format and generate PDF for preview
      const pdfFormData = convertFormDataForPDF(formData);
      const pdfDataUrl = await generateTimeSheetPDF({
        ...pdfFormData,
        signatureData,
      });
      
      // Store PDF data for preview (strip the data URL prefix since iframe will add it)
      const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
      setPreviewPdfData(base64Data);
      
      // Check if we have the employee's email stored
      const existingEmail = (employeeEmailQuery.data as { email?: string })?.email;
      if (existingEmail) {
        setEmployeeEmail(existingEmail);
      }
      
      // Show PDF preview dialog
      setShowPdfPreview(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate PDF preview.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedWithEmail = () => {
    // Close preview dialog and check if we need email
    setShowPdfPreview(false);
    
    // Check if we have the employee's email stored (use fresh data from query)
    const existingEmail = (employeeEmailQuery.data as { email?: string })?.email;
    
    if (!existingEmail) {
      // Show email dialog if no email is stored
      setShowEmailDialog(true);
    } else {
      // Set the email and proceed directly with email submission
      setEmployeeEmail(existingEmail);
      handleEmailSubmit();
    }
  };

  const handleEmailSubmit = async () => {
    if (!employeeEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    if (!previewPdfData) {
      toast({
        title: "Error",
        description: "PDF preview data is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const formData = getValues();
    
    try {
      setIsLoading(true);
      
      emailTimesheetMutation.mutate({
        employeeNumber: formData.memberNumber,
        employeeEmail: employeeEmail,
        timesheetData: {
          employeeName: formData.memberName,
          weekEnding: formData.weekEnding,
          pdfBuffer: `data:application/pdf;base64,${previewPdfData}`, // Convert base64 back to data URL
        },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    const formData = getValues();
    if (!formData.employeeName || !formData.employeeNumber || !formData.weekEnding) {
      toast({
        title: "Validation Error",
        description: "Please fill in employee name, number, and week ending date.",
        variant: "destructive",
      });
      return;
    }

    // Check if acknowledgment is checked
    if (!formData.acknowledgmentChecked) {
      toast({
        title: "Acknowledgment Required",
        description: "Please check the acknowledgment box to confirm you have reviewed all times and totals for accuracy.",
        variant: "destructive",
      });
      return;
    }

    // Check if signature is present
    if (!signatureData || signatureData.trim() === '') {
      toast({
        title: "Signature Required",
        description: "Please provide a digital signature before printing.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Convert form data to PDF format and generate PDF
      const pdfFormData = convertFormDataForPDF(formData);
      const pdfBuffer = await generateTimeSheetPDF({
        ...pdfFormData,
        signatureData,
      });
      
      // Open print dialog instead of downloading
      const base64Data = pdfBuffer.replace(/^data:application\/pdf;base64,/, '');
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window and trigger print
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
        // Clean up URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }
      
      toast({
        title: "Success",
        description: "Print dialog opened!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // New combined submission function
  const handleSubmit = async () => {
    const formData = getValues();
    if (!formData.employeeName || !formData.employeeNumber || !formData.weekEnding) {
      toast({
        title: "Validation Error",
        description: "Please fill in employee name, number, and week ending date.",
        variant: "destructive",
      });
      return;
    }

    // Check if acknowledgment is checked
    if (!formData.acknowledgmentChecked) {
      toast({
        title: "Acknowledgment Required",
        description: "Please check the acknowledgment box to confirm you have reviewed all times and totals for accuracy.",
        variant: "destructive",
      });
      return;
    }

    // Check if signature is present
    if (!signatureData || signatureData.trim() === '') {
      toast({
        title: "Signature Required",
        description: "Please provide a digital signature before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert form data to PDF format and generate PDF for preview
      const pdfFormData = convertFormDataForPDF(formData);
      const pdfDataUrl = await generateTimeSheetPDF({
        ...pdfFormData,
        signatureData,
      });
      
      // Store PDF data for preview (strip the data URL prefix since iframe will add it)
      const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
      setPreviewPdfData(base64Data);
      
      // Check if we have the employee's email stored
      const existingEmail = (employeeEmailQuery.data as { email?: string })?.email;
      if (existingEmail) {
        setEmployeeEmail(existingEmail);
      }
      
      // Show submission preview dialog
      setShowSubmissionPreview(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate PDF preview.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle print from submission preview
  const handlePrintFromPreview = async () => {
    if (!previewPdfData) return;
    
    try {
      // Create blob and open print dialog
      const binaryData = atob(previewPdfData);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window and trigger print
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
        // Clean up URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }
      
      toast({
        title: "Success",
        description: "Print dialog opened!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open print dialog.",
        variant: "destructive",
      });
    }
  };

  // Handle download from submission preview
  const handleDownloadFromPreview = async () => {
    if (!previewPdfData) return;
    
    try {
      // Create blob and trigger download
      const binaryData = atob(previewPdfData);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${getValues().memberName || getValues().employeeName}_TimeSheet_${getValues().weekEnding.replace(/\//g, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "PDF downloaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF.",
        variant: "destructive",
      });
    }
  };

  // Stop auto-submit countdown (when user interacts)
  const stopAutoSubmitCountdown = () => {
    setAutoSubmitCountdown(null);
  };

  // Handle save and submit from preview
  const handleSaveAndSubmit = async () => {
    // Stop countdown when manually triggered
    stopAutoSubmitCountdown();
    // Check if we have email, if not show email dialog
    const existingEmail = (employeeEmailQuery.data as { email?: string })?.email;
    
    if (!existingEmail && !employeeEmail) {
      setShowSubmissionPreview(false);
      setShowEmailDialog(true);
      return;
    }

    const finalEmail = existingEmail || employeeEmail;
    const formData = getValues();
    
    try {
      setIsLoading(true);
      
      // Check if this is an employee edit
      if (formData.isEditingPreviousSubmission && existingTimesheetQuery.data?.id) {
        // Use employee edit endpoint
        await apiRequest("POST", `/api/timesheets/${existingTimesheetQuery.data.id}/employee-edit`, {
          ...formData,
          // Map field names for backend compatibility
          employeeName: formData.memberName,
          employeeNumber: formData.memberNumber,
          // Convert arrays to JSON strings for storage
          sundayShifts: JSON.stringify(formData.sundayShifts || []),
          mondayShifts: JSON.stringify(formData.mondayShifts || []),
          tuesdayShifts: JSON.stringify(formData.tuesdayShifts || []),
          wednesdayShifts: JSON.stringify(formData.wednesdayShifts || []),
          thursdayShifts: JSON.stringify(formData.thursdayShifts || []),
          fridayShifts: JSON.stringify(formData.fridayShifts || []),
          saturdayShifts: JSON.stringify(formData.saturdayShifts || []),
        });
        
        toast({
          title: "Timesheet Updated",
          description: "Your edited timesheet has been resubmitted and requires supervisor re-approval.",
        });
      } else {
        // Regular submission - Submit email with timesheet data
        await emailTimesheetMutation.mutateAsync({
          employeeNumber: formData.memberNumber,
          employeeEmail: finalEmail,
          timesheetData: {
            employeeName: formData.memberName,
            weekEnding: formData.weekEnding,
            pdfBuffer: `data:application/pdf;base64,${previewPdfData}`,
          },
        });
        
        toast({
          title: "Success",
          description: "Timesheet submitted successfully!",
        });
      }

      // Close preview dialog
      setShowSubmissionPreview(false);
      
    } catch (error) {
      toast({
        title: "Error",
        description: formData.isEditingPreviousSubmission ? "Failed to submit edited timesheet. Please try again." : "Failed to submit timesheet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* iOS-style Loading Overlay */}
      {(isLoading || emailTimesheetMutation.isPending) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="ios-card p-8 text-center max-w-xs">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="ios-body text-muted-foreground">Processing...</p>
          </div>
        </div>
      )}


      {/* iOS-style Main Content */}
      <main className="px-4 py-6 max-w-4xl mx-auto space-y-4">
        {/* Editing Banner - Show when editing previous submission */}
        {watchedValues.isEditingPreviousSubmission && (
          <div className="mb-4 p-4 bg-orange-100 border border-orange-300 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800">Editing Previous Submission</h3>
                <p className="text-sm text-orange-700">
                  You are editing a previously submitted timesheet. Changes must be submitted before Saturday at 11:59 PM ET 
                  and will require supervisor re-approval.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="ios-mobile-spacing">
          <h1 className="ios-title-1 text-foreground mb-2">Weekly Timesheet</h1>
          
          {logout && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="ios-button text-ios-blue p-2"
                data-testid="logout-button"
              >
                <LogOut className="text-base mr-1" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
        
        <Form {...form}>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* Employee Selection or Selected Member Display */}
            {!selectedEmployeeNumber ? (
              <div className="ios-card">
                <div className="p-6">
                <h2 className="ios-headline mb-4" data-testid="heading-employee-selection">
                  Select Member
                </h2>
                
                {scheduleQuery.isLoading ? (
                  <div className="space-y-4">
                    <div className="flex items-center mb-2">
                      <Users className="text-primary mr-2 h-4 w-4" />
                      <span className="text-sm font-medium">Loading members...</span>
                      <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    </div>
                    <div className="h-12 bg-muted animate-pulse rounded-md"></div>
                  </div>
                ) : (
                  /* Employee Selection Dropdown */
                  <div className="mb-6">
                    <Label htmlFor="employeeSelect" className="flex items-center mb-2">
                      <Users className="text-primary mr-2 h-4 w-4" />
                      Select Your Name
                    </Label>
                <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between ios-input h-14 text-left"
                      disabled={scheduleQuery.isLoading || !scheduleQuery.data?.employees?.length}
                      data-testid="select-employee"
                    >
                      <span className="ios-body">
                        {selectedEmployeeNumber
                          ? scheduleQuery.data?.employees?.find((employee) => employee.employeeNumber === selectedEmployeeNumber)?.fullName
                          : "Choose your name from the list"}
                      </span>
                      <Users className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-md mx-auto max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <Users className="mr-2 h-5 w-5" />
                        Select Your Name
                      </DialogTitle>
                      <DialogDescription>
                        Choose your name from the list below. You can search to find it quickly.
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* Search Input */}
                    <div className="px-1 pb-4">
                      <Input
                        placeholder="Search by name..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="h-12 text-base"
                        autoFocus
                      />
                    </div>
                    
                    {/* Member List */}
                    <div className="flex-1 overflow-y-auto px-1">
                      <div className="space-y-2">
                        {scheduleQuery.data?.employees
                          ?.filter((employee) => {
                            // Filter out inactive employees
                            const dbEmployee = employeeNumbersQuery.data?.find(emp => emp.employeeNumber === employee.employeeNumber);
                            const isActive = !dbEmployee || dbEmployee.active !== false;
                            
                            // Search filter
                            const searchLower = memberSearchQuery.toLowerCase();
                            const matchesSearch = searchLower === '' || 
                              employee.fullName.toLowerCase().includes(searchLower) ||
                              employee.employeeNumber.toLowerCase().includes(searchLower);
                            
                            return isActive && matchesSearch;
                          })
                          ?.sort((a, b) => {
                            const lastNameA = a.lastName || a.fullName.split(' ').pop() || '';
                            const lastNameB = b.lastName || b.fullName.split(' ').pop() || '';
                            return lastNameA.localeCompare(lastNameB);
                          })
                          ?.map((employee) => (
                            <Button
                              key={employee.employeeNumber}
                              variant={selectedEmployeeNumber === employee.employeeNumber ? "default" : "ghost"}
                              className="w-full h-16 flex items-center justify-start p-4 text-left"
                              onClick={() => {
                                handleEmployeeSelect(employee.employeeNumber);
                                setMemberDialogOpen(false);
                                setMemberSearchQuery('');
                              }}
                            >
                              <div className="flex items-center w-full">
                                <div className="flex-1">
                                  <div className="font-medium text-base">
                                    {`${employee.lastName || employee.fullName.split(' ').pop()}, ${employee.firstName || employee.fullName.split(' ').slice(0, -1).join(' ')}`}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Member #{employee.employeeNumber}
                                  </div>
                                </div>
                                {selectedEmployeeNumber === employee.employeeNumber && (
                                  <Check className="ml-2 h-5 w-5 text-primary" />
                                )}
                              </div>
                            </Button>
                          ))}
                        
                        {scheduleQuery.data?.employees
                          ?.filter((employee) => {
                            const dbEmployee = employeeNumbersQuery.data?.find(emp => emp.employeeNumber === employee.employeeNumber);
                            const isActive = !dbEmployee || dbEmployee.active !== false;
                            const searchLower = memberSearchQuery.toLowerCase();
                            const matchesSearch = searchLower === '' || 
                              employee.fullName.toLowerCase().includes(searchLower) ||
                              employee.employeeNumber.toLowerCase().includes(searchLower);
                            return isActive && matchesSearch;
                          }).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            {memberSearchQuery ? 'No members found matching your search.' : 'No active members found.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {scheduleQuery.error && (
                  <p className="text-sm text-destructive mt-1">
                    Failed to load employee schedule.
                  </p>
                )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Selected Member Display - Clickable to change */
            <div 
              className="ios-card bg-primary/5 border-l-4 border-primary cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => {
                setSelectedEmployeeNumber('');
                setCurrentEmployeeEmail('');
                form.setValue('employeeNumber', '');
              }}
              data-testid="selected-employee-card"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <User className="text-primary mr-2 h-5 w-5" />
                    <span className="ios-callout text-foreground">Selected Member</span>
                  </div>
                  <span className="ios-caption text-muted-foreground">Click to change</span>
                </div>
                <div>
                  <p className="ios-body font-medium text-foreground">
                    {scheduleQuery.data?.employees?.find((emp) => emp.employeeNumber === selectedEmployeeNumber)?.fullName}
                  </p>
                  <p className="ios-footnote text-muted-foreground">Member #: {watchedValues.employeeNumber || selectedEmployeeNumber}</p>
                  {employeeEmailQuery.isLoading ? (
                    <div className="flex items-center">
                      <div className="h-3 bg-muted animate-pulse rounded w-32"></div>
                      <RefreshCw className="ml-2 h-3 w-3 animate-spin text-muted-foreground" />
                    </div>
                  ) : currentEmployeeEmail ? (
                    <div className="flex items-center justify-between">
                      <p className="ios-footnote text-muted-foreground">Email: {currentEmployeeEmail}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the card click from triggering
                          setEmployeeEmail(currentEmployeeEmail);
                          setShowEmailDialog(true);
                        }}
                        className="h-auto p-1 text-xs text-primary hover:text-primary/80"
                        data-testid="edit-email-button"
                      >
                        Edit
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

            {/* Week Selection Card - Only show when employee is selected */}
            {selectedEmployeeNumber && (
              <div className="ios-card">
                <div className="p-6">
                  <h2 className="ios-headline mb-4" data-testid="heading-week-selection">
                  Week Selection
                  </h2>
                  <Label htmlFor="weekEnding" className="flex items-center mb-2">
                    <Calendar className="text-primary mr-2 h-4 w-4" />
                    Week Ending (Saturday)
                  </Label>
                  <WeekPicker
                    value={watchedValues.weekEnding}
                    onChange={(value) => {
                      setValue("weekEnding", value);
                      handleWeekEndingChange(value);
                    }}
                    placeholder="Select a week"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Show rest of form only when both employee and week are selected */}
            {selectedEmployeeNumber && watchedValues.weekEnding && (
              <div className="space-y-4">

                  {/* Time Entry Card - iOS style */}
                  <div className="ios-card">
                    <div className="p-6">
                      <h2 className="ios-headline mb-4" data-testid="heading-time-entry">
                        Daily Time Entry
                      </h2>
                      
                      {DAYS_OF_WEEK.map(({ key, label }) => {
                        const dayShifts = watchedValues[`${key}Shifts` as keyof TimesheetFormData] as DayShift[] || [];
                        
                        const addShift = () => {
                          const currentShifts = getValues(`${key}Shifts` as keyof TimesheetFormData) as DayShift[] || [];
                          const newShift = { startTime: "", endTime: "", hours: 0 };
                          setValue(`${key}Shifts` as keyof TimesheetFormData, [...currentShifts, newShift]);
                        };
                        
                        const removeShift = (index: number) => {
                          const currentShifts = getValues(`${key}Shifts` as keyof TimesheetFormData) as DayShift[] || [];
                          const updatedShifts = currentShifts.filter((_, i) => i !== index);
                          setValue(`${key}Shifts` as keyof TimesheetFormData, updatedShifts);
                        };
                        
                        const updateShiftTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
                          const currentShifts = getValues(`${key}Shifts` as keyof TimesheetFormData) as DayShift[] || [];
                          const updatedShifts = [...currentShifts];
                          updatedShifts[index] = { ...updatedShifts[index], [field]: value };
                          
                          // If updating start time, check if current end time would be invalid
                          if (field === 'startTime' && updatedShifts[index].endTime) {
                            const isValidEnd = (endTime: string, startTime: string): boolean => {
                              const timeToMinutes = (time: string): number => {
                                const [hours, minutes] = time.split(':').map(Number);
                                const adjustedHours = hours < 7 ? hours + 24 : hours;
                                return (adjustedHours - 7) * 60 + minutes;
                              };
                              
                              const startMinutes = timeToMinutes(startTime);
                              const endMinutes = timeToMinutes(endTime);
                              
                              return endMinutes > startMinutes && endMinutes <= 24 * 60;
                            };
                            
                            if (!isValidEnd(updatedShifts[index].endTime, value)) {
                              // Clear invalid end time
                              updatedShifts[index].endTime = "";
                              updatedShifts[index].hours = 0;
                              toast({
                                title: "End time cleared",
                                description: "The end time was cleared because it would be invalid with the new start time.",
                              });
                            }
                          }
                          
                          // Calculate hours if both times are set
                          if (updatedShifts[index].startTime && updatedShifts[index].endTime) {
                            updatedShifts[index].hours = calculateHours(
                              updatedShifts[index].startTime, 
                              updatedShifts[index].endTime
                            );
                          }
                          
                          // Validate no overlapping shifts
                          const hasOverlap = checkForOverlappingShifts(updatedShifts, index);
                          if (hasOverlap && updatedShifts[index].startTime && updatedShifts[index].endTime) {
                            toast({
                              title: "Overlapping Shifts",
                              description: "This shift overlaps with another shift on the same day. Please adjust the times.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          setValue(`${key}Shifts` as keyof TimesheetFormData, updatedShifts);
                        };
                        
                        return (
                          <div key={key} className="py-4 border-b border-gray-200 last:border-b-0">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Label className="text-sm font-medium text-secondary">{label}</Label>
                                <Input
                                  type="date"
                                  {...form.register(`${key}Date` as keyof TimesheetFormData)}
                                  readOnly
                                  className="text-sm bg-gray-50 w-auto"
                                  data-testid={`input-${key}-date`}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-secondary">
                                  Total: {typeof watchedValues[`${key}TotalHours` as keyof TimesheetFormData] === 'number' 
                                    ? (watchedValues[`${key}TotalHours` as keyof TimesheetFormData] as number).toFixed(2) 
                                    : "0.00"} hrs
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addShift}
                                  className="text-xs"
                                  data-testid={`button-add-shift-${key}`}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Shift
                                </Button>
                              </div>
                            </div>
                            
                            {/* Show shifts */}
                            {dayShifts.length === 0 ? (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                No shifts added. Click "Add Shift" to get started.
                              </div>
                            ) : (
                              dayShifts.map((shift, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center py-2 bg-gray-50 rounded mb-2 p-3">
                                  <div className="col-span-4">
                                    <Label className="text-xs text-gray-600">Start Time</Label>
                                    <TimePicker
                                      value={shift.startTime || ""}
                                      onChange={(value) => updateShiftTime(index, 'startTime', value)}
                                      placeholder="Select start time"
                                      className="w-full"
                                      type="start"
                                    />
                                  </div>
                                  <div className="col-span-4">
                                    <Label className="text-xs text-gray-600">End Time</Label>
                                    <TimePicker
                                      value={shift.endTime || ""}
                                      onChange={(value) => updateShiftTime(index, 'endTime', value)}
                                      placeholder="Select end time"
                                      className="w-full"
                                      type="end"
                                      startTime={shift.startTime}
                                    />
                                  </div>
                                  <div className="col-span-3 text-center">
                                    <Label className="text-xs text-gray-600">Hours</Label>
                                    <div className="text-sm font-medium pt-1" data-testid={`text-${key}-shift-${index}-hours`}>
                                      {shift.hours?.toFixed(2) || "0.00"}
                                    </div>
                                  </div>
                                  <div className="col-span-1 text-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeShift(index)}
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                      data-testid={`button-remove-shift-${key}-${index}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })}

              {/* Weekly Total */}
              <div className="mt-6 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-secondary">Total Hours for Week:</span>
                  <span 
                    className="text-2xl font-bold text-primary"
                    data-testid="text-total-weekly-hours"
                  >
                    {watchedValues.totalWeeklyHours?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Weeknight Rescue Coverage Card - iOS style */}
          <div className="ios-card">
            <div className="p-6">
              <h2 className="ios-headline mb-4" data-testid="heading-rescue-coverage">
                Weeknight Rescue Coverage
              </h2>
              <p className="text-xs text-gray-600 mb-4 italic">
                Weeknight Rescue Coverage will be paid out in monthly check
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: "rescueCoverageMonday", label: "Monday" },
                  { key: "rescueCoverageTuesday", label: "Tuesday" },
                  { key: "rescueCoverageWednesday", label: "Wednesday" },
                  { key: "rescueCoverageThursday", label: "Thursday" },
                ].map(({ key, label }) => (
                  <div key={key} className="text-center">
                    <Label className="block text-sm font-medium text-secondary mb-2">{label}</Label>
                    <div>
                      <div className="text-xs text-gray-500 mb-2">1800-0600</div>
                      <FormField
                        control={form.control}
                        name={key as keyof TimesheetFormData}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                checked={field.value === true}
                                onCheckedChange={field.onChange}
                                className="!w-6 !h-6 !aspect-square !min-w-6 !min-h-6 !max-w-6 !max-h-6"
                                data-testid={`checkbox-${key}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Edit Comments Card - Show only when editing */}
          {watchedValues.isEditingPreviousSubmission && (
            <div className="ios-card border-orange-200 bg-orange-50">
              <div className="p-6">
                <FormField
                  control={form.control}
                  name="editComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="ios-headline text-orange-700">
                        Edit Comments <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormDescription className="text-sm text-orange-600 mb-4">
                        Please explain what changes you made to your timesheet. This helps your supervisor understand the updates.
                      </FormDescription>
                      <FormControl>
                        <textarea
                          {...field}
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Describe the changes you made to your timesheet..."
                          data-testid="textarea-edit-comments"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Acknowledgment Card - iOS style */}
          <div className="ios-card">
            <div className="p-6">
              <FormField
                control={form.control}
                name="acknowledgmentChecked"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={field.onChange}
                        className="!w-6 !h-6 !aspect-square !min-w-6 !min-h-6 !max-w-6 !max-h-6"
                        data-testid="checkbox-acknowledgment"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium text-secondary">
                        {watchedValues.isEditingPreviousSubmission ? 'Updated Acknowledgment' : 'Acknowledgment'} <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormDescription className="text-sm text-muted-foreground">
                        {watchedValues.isEditingPreviousSubmission ? (
                          <>
                            I acknowledge that I have re-reviewed all times and totals for accuracy after making my edits. 
                            I understand that editing this timesheet will require my supervisor to re-approve it, and 
                            I must submit these changes before Saturday at 11:59 PM ET.
                          </>
                        ) : (
                          <>
                            I acknowledge that I have reviewed all times and totals for accuracy. 
                            Times imported from the schedule should be verified and updated if they 
                            differ from actual worked hours.
                          </>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Member Attestation Card - iOS style */}
          <div className="ios-card">
            <div className="p-6">
              <FormField
                control={form.control}
                name="signatureData"
                render={() => (
                  <FormItem>
                    <FormLabel className="ios-headline">
                      Member Attestation <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormDescription className="text-sm text-muted-foreground mb-4">
                      By signing, I attest that the hours submitted are a complete and accurate record of my time worked.
                    </FormDescription>
                    <FormControl>
                      <SignaturePad
                        onSignatureChange={(signature) => {
                          setSignatureData(signature);
                          form.setValue("signatureData", signature);
                        }}
                        data-testid="signature-pad"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>


          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Button
              type="button"
              variant="outline"
              className="ios-button ios-button-secondary"
              onClick={handleClearAll}
              data-testid="button-clear-all"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear All
            </Button>
            
            {currentTimesheet && currentTimesheet.status === "draft" && (
              <Button
                type="button"
                className="ios-button ios-button-primary"
                onClick={handleSubmitForApproval}
                disabled={submitTimesheetMutation.isPending}
                data-testid="button-submit"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitTimesheetMutation.isPending ? "Submitting..." : watchedValues.isEditingPreviousSubmission ? "Resubmit Edited Timesheet" : "Submit for Approval"}
              </Button>
            )}
            
            <Button
              type="button"
              className="ios-button ios-button-primary bg-accent hover:bg-accent/90"
              onClick={handleSubmit}
              disabled={isLoading || emailTimesheetMutation.isPending}
              data-testid="button-submit"
            >
              <Send className="mr-2 h-4 w-4" />
              {watchedValues.isEditingPreviousSubmission ? "Resubmit Changes" : "Submit"}
            </Button>
          </div>
        </div>
        )}
        </form>
        </Form>
      </main>

      {/* Copyright notice only - admin button moved to App.tsx footer */}
      <div className="text-center py-6 mt-12">
        <p className="ios-footnote text-muted-foreground">© 2024 Oakland Fire-Rescue Department</p>
        <p className="ios-caption2 text-muted-foreground mt-1">Timesheet Application v1.0</p>
      </div>

      {/* Employee ID Prompt Dialog */}
      <AlertDialog open={showEmployeeIdPrompt} onOpenChange={setShowEmployeeIdPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Employee ID Required</AlertDialogTitle>
            <AlertDialogDescription>
              We need your employee ID number to complete your timesheet. This will be saved for future use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="employeeIdInput" className="text-sm font-medium">
              Employee ID Number
            </Label>
            <Input
              id="employeeIdInput"
              value={employeeIdInput}
              onChange={(e) => setEmployeeIdInput(e.target.value)}
              placeholder="Enter your employee ID"
              className="mt-2 ios-input"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowEmployeeIdPrompt(false);
              setEmployeeIdInput("");
              setTempEmployeeData(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleEmployeeIdSubmit} disabled={updateEmployeeNumberMutation.isPending}>
              {updateEmployeeNumberMutation.isPending ? "Saving..." : "Save ID"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Submission Dialog */}
      <AlertDialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Timesheet by Email</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your email address to submit your timesheet. We'll save this for future submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="emailInput" className="text-sm font-medium">
              Your Email Address
            </Label>
            <Input
              id="emailInput"
              type="email"
              value={employeeEmail}
              onChange={(e) => setEmployeeEmail(e.target.value)}
              placeholder="Enter your email address"
              data-testid="input-employee-email"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-email-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                // Close email dialog and trigger save & submit
                setShowEmailDialog(false);
                handleSaveAndSubmit();
              }}
              disabled={emailTimesheetMutation.isPending}
              data-testid="button-email-submit"
            >
              {emailTimesheetMutation.isPending ? "Submitting..." : "Save & Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Dialog */}
      <AlertDialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>PDF Preview - Timesheet</AlertDialogTitle>
            <AlertDialogDescription>
              Review your timesheet below. Click "Send by Email" to proceed with submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewPdfData && (
              <div className="w-full h-96 border rounded-lg">
                <iframe
                  src={`data:application/pdf;base64,${previewPdfData}`}
                  width="100%"
                  height="100%"
                  className="border-0 rounded-lg"
                  title="Timesheet PDF Preview"
                  data-testid="pdf-preview-iframe"
                />
              </div>
            )}
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              onClick={() => {
                setShowPdfPreview(false);
                setPreviewPdfData(null);
              }}
              data-testid="button-preview-cancel"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleProceedWithEmail}
              data-testid="button-preview-proceed"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send by Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submission Preview Dialog */}
      <AlertDialog open={showSubmissionPreview} onOpenChange={setShowSubmissionPreview}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Timesheet Preview - Ready to Submit</AlertDialogTitle>
            <AlertDialogDescription>
              Review your completed timesheet below. You can print the PDF, download it, go back to edit, or save and submit via email.
              {autoSubmitCountdown !== null && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-800">
                      Auto-submitting in <strong>{autoSubmitCountdown}</strong> seconds. Click any button to cancel auto-submit.
                    </span>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewPdfData && (
              <div className="w-full h-96 border rounded-lg">
                <iframe
                  src={`data:application/pdf;base64,${previewPdfData}`}
                  width="100%"
                  height="100%"
                  className="border-0 rounded-lg"
                  title="Timesheet PDF Preview"
                  data-testid="submission-preview-iframe"
                />
              </div>
            )}
          </div>
          <AlertDialogFooter className="gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopAutoSubmitCountdown();
                handlePrintFromPreview();
              }}
              className="ios-button ios-button-secondary"
              data-testid="button-preview-print"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopAutoSubmitCountdown();
                handleDownloadFromPreview();
              }}
              className="ios-button ios-button-secondary"
              data-testid="button-preview-download"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <AlertDialogCancel 
              onClick={() => {
                stopAutoSubmitCountdown();
                setShowSubmissionPreview(false);
                setPreviewPdfData(null);
              }}
              data-testid="button-preview-cancel-edit"
            >
              Cancel & Edit
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveAndSubmit}
              disabled={isLoading || emailTimesheetMutation.isPending}
              className="ios-button ios-button-primary bg-accent hover:bg-accent/90"
              data-testid="button-save-submit"
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading || emailTimesheetMutation.isPending ? "Submitting..." : "Save & Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
