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
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { calculateHours, populateWeekDates } from "@/lib/time-calculations";
import { generateTimeSheetPDF } from "@/lib/pdf-generator";
import { apiRequest } from "@/lib/queryClient";
import SignaturePad from "@/components/ui/signature-pad";
import { getCurrentWeekEndingDate, isSaturday, getNextSaturday, getPreviousSaturday } from "@/lib/date-utils";
import { Flame, User, IdCard, Calendar, Save, Mail, Printer, HelpCircle, Users, RefreshCw, Send, CheckCircle, Clock, XCircle, AlertCircle, Check, ChevronsUpDown, RotateCcw, LogOut } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const timesheetSchema = z.object({
  employeeName: z.string().min(1, "Employee name is required"),
  employeeNumber: z.string().min(1, "Employee number is required"),
  selectedEmployee: z.string().optional(),
  weekEnding: z.string().min(1, "Week ending date is required"),
  
  sundayDate: z.string().optional(),
  sundayStartTime: z.string().optional(),
  sundayEndTime: z.string().optional(),
  sundayTotalHours: z.number().optional(),
  
  mondayDate: z.string().optional(),
  mondayStartTime: z.string().optional(),
  mondayEndTime: z.string().optional(),
  mondayTotalHours: z.number().optional(),
  
  tuesdayDate: z.string().optional(),
  tuesdayStartTime: z.string().optional(),
  tuesdayEndTime: z.string().optional(),
  tuesdayTotalHours: z.number().optional(),
  
  wednesdayDate: z.string().optional(),
  wednesdayStartTime: z.string().optional(),
  wednesdayEndTime: z.string().optional(),
  wednesdayTotalHours: z.number().optional(),
  
  thursdayDate: z.string().optional(),
  thursdayStartTime: z.string().optional(),
  thursdayEndTime: z.string().optional(),
  thursdayTotalHours: z.number().optional(),
  
  fridayDate: z.string().optional(),
  fridayStartTime: z.string().optional(),
  fridayEndTime: z.string().optional(),
  fridayTotalHours: z.number().optional(),
  
  saturdayDate: z.string().optional(),
  saturdayStartTime: z.string().optional(),
  saturdayEndTime: z.string().optional(),
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
  status: z.string().optional(),
  id: z.string().optional(),
});

type TimesheetFormData = z.infer<typeof timesheetSchema>;

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
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      times.push(timeStr);
    }
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();

interface Employee {
  firstName: string;
  lastName: string;
  fullName: string;
  employeeNumber: string;
}

interface Shift {
  employeeNumber: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  position: string;
  duration: number;
  date: string;
}

interface ScheduleData {
  employees: Employee[];
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
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [showEmployeeIdPrompt, setShowEmployeeIdPrompt] = useState(false);
  const [tempEmployeeData, setTempEmployeeData] = useState<{ id: string; name: string } | null>(null);
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [currentEmployeeEmail, setCurrentEmployeeEmail] = useState("");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewPdfData, setPreviewPdfData] = useState<string | null>(null);

  // Fetch schedule data (employees and shifts)
  const scheduleQuery = useQuery<ScheduleData>({
    queryKey: ['/api/schedule'],
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch employee numbers from database
  const employeeNumbersQuery = useQuery<Array<{ id: string; employeeName: string; employeeNumber: string }>>({
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
      employeeName: "",
      employeeNumber: "",
      weekEnding: getCurrentWeekEndingDate(), // Default to current week
      selectedEmployee: "",
      rescueCoverageMonday: false,
      rescueCoverageTuesday: false,
      rescueCoverageWednesday: false,
      rescueCoverageThursday: false,
      acknowledgmentChecked: false,
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedValues = watch();

  // Auto-calculate daily hours when start/end times change
  useEffect(() => {
    DAYS_OF_WEEK.forEach(({ key }) => {
      const startTime = watchedValues[`${key}StartTime` as keyof TimesheetFormData] as string;
      const endTime = watchedValues[`${key}EndTime` as keyof TimesheetFormData] as string;
      
      if (startTime && endTime) {
        const hours = calculateHours(startTime, endTime);
        setValue(`${key}TotalHours` as keyof TimesheetFormData, hours);
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
    if (!employeeNumber || !weekEnding) return;
    
    try {
      const response = await fetch(`/api/schedule/employee/${employeeNumber}/week/${weekEnding}`);
      if (!response.ok) return;
      
      const shifts: Shift[] = await response.json();
      
      // Clear existing time entries
      DAYS_OF_WEEK.forEach(({ key }) => {
        setValue(`${key}StartTime` as keyof TimesheetFormData, "");
        setValue(`${key}EndTime` as keyof TimesheetFormData, "");
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
        // Combine all shifts for this calendar date
        let combinedStartTime: Date | null = null;
        let combinedEndTime: Date | null = null;
        let totalDuration = 0;
        let hasNightDuty = false;
        
        // Sort shifts by start time for this date
        dayShifts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        dayShifts.forEach((shift) => {
          const startTime = new Date(shift.startTime);
          const endTime = new Date(shift.endTime);
          
          // Check for night duty/rescue coverage - ONLY by explicit "Night Duty" label
          const isNightDuty = shift.position && shift.position.toLowerCase().includes('night duty');
          
          if (isNightDuty) {
            hasNightDuty = true;
          }
          
          // Combine shifts - find earliest start and latest end
          if (!combinedStartTime || startTime < combinedStartTime) {
            combinedStartTime = startTime;
          }
          if (!combinedEndTime || endTime > combinedEndTime) {
            combinedEndTime = endTime;
          }
          
          totalDuration += shift.duration;
        });
        
        if (!combinedStartTime || !combinedEndTime) return;
        
        // Determine which timesheet day this belongs to based on 7am boundaries
        // Convert to Eastern time for proper 7am calculation
        const startTimeET = new Date((combinedStartTime as Date).toLocaleString("en-US", {timeZone: "America/New_York"}));
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
          if (hasNightDuty) {
            // Mark rescue coverage for weeknights only (Monday-Thursday)
            if (dayKey === 'monday') setValue("rescueCoverageMonday", true);
            else if (dayKey === 'tuesday') setValue("rescueCoverageTuesday", true);
            else if (dayKey === 'wednesday') setValue("rescueCoverageWednesday", true);
            else if (dayKey === 'thursday') setValue("rescueCoverageThursday", true);
          }
          
          // Always populate time entries for combined shifts
          const startTimeStr = (combinedStartTime as Date).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/New_York'
          });
          const endTimeStr = (combinedEndTime as Date).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/New_York'
          });
          
          // Check if there's already a shift for this timesheet day (from previous combined shifts)
          const currentStartTime = getValues(`${dayKey}StartTime` as keyof TimesheetFormData) as string;
          const currentEndTime = getValues(`${dayKey}EndTime` as keyof TimesheetFormData) as string;
          const currentHours = getValues(`${dayKey}TotalHours` as keyof TimesheetFormData) as number || 0;
          
          if (currentStartTime && currentEndTime) {
            // Combine with existing shift for this timesheet day
            const existingStart = new Date(`1970-01-01T${currentStartTime}:00`);
            const existingEnd = new Date(`1970-01-01T${currentEndTime}:00`);
            const newStart = new Date(`1970-01-01T${startTimeStr}:00`);
            const newEnd = new Date(`1970-01-01T${endTimeStr}:00`);
            
            const finalStartTime = existingStart < newStart ? existingStart : newStart;
            const finalEndTime = existingEnd > newEnd ? existingEnd : newEnd;
            
            const finalStartStr = finalStartTime.toTimeString().substring(0, 5);
            const finalEndStr = finalEndTime.toTimeString().substring(0, 5);
            
            setValue(`${dayKey}StartTime` as keyof TimesheetFormData, finalStartStr);
            setValue(`${dayKey}EndTime` as keyof TimesheetFormData, finalEndStr);
            setValue(`${dayKey}TotalHours` as keyof TimesheetFormData, currentHours + totalDuration);
          } else {
            // First shift for this timesheet day
            setValue(`${dayKey}StartTime` as keyof TimesheetFormData, startTimeStr);
            setValue(`${dayKey}EndTime` as keyof TimesheetFormData, endTimeStr);
            setValue(`${dayKey}TotalHours` as keyof TimesheetFormData, totalDuration);
          }
        }
      });
      
      toast({
        title: "Schedule loaded",
        description: `Populated timecard from ${shifts.length} scheduled shifts (combined by timesheet day).`,
      });
    } catch (error) {
      console.error("Error auto-populating from schedule:", error);
    }
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeNumber: string) => {
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
    setEmployeeSearchOpen(false);
    
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


  const handleEmail = async () => {
    const formData = getValues();
    if (!formData.employeeName || !formData.employeeNumber || !formData.weekEnding) {
      toast({
        title: "Validation Error",
        description: "Please fill in employee name, number, and week ending date.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Generate PDF first for preview
      const pdfDataUrl = await generateTimeSheetPDF({
        ...formData,
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
        employeeNumber: formData.employeeNumber,
        employeeEmail: employeeEmail,
        timesheetData: {
          employeeName: formData.employeeName,
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
      const pdfBuffer = await generateTimeSheetPDF({
        ...formData,
        signatureData,
      });
      
      // Create blob and trigger download (strip data URL prefix first)
      const base64Data = pdfBuffer.replace(/^data:application\/pdf;base64,/, '');
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formData.employeeName}_TimeSheet_${formData.weekEnding.replace(/\//g, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "PDF generated and ready to print!",
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


  return (
    <div className="min-h-screen bg-background">
      {/* Loading Overlay */}
      {(isLoading || emailTimesheetMutation.isPending) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-700">Processing...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Flame className="text-2xl" data-testid="logo-flame" />
              <div>
                <h1 className="text-xl font-bold" data-testid="header-title">Oakland Fire-Rescue</h1>
                <p className="text-blue-100 text-sm" data-testid="header-subtitle">Weekly Time Sheet</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-blue-700 rounded-full text-white"
                data-testid="button-help"
              >
                <HelpCircle className="text-xl" />
              </Button>
              {logout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="p-2 hover:bg-blue-700 rounded-full text-white"
                  data-testid="logout-button"
                >
                  <LogOut className="text-xl" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Form {...form}>
          <form className="space-y-6">
          {/* Employee Information Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4" data-testid="heading-employee-info">
                Employee Information
              </h2>
              
              {/* Employee Selection Dropdown */}
              <div className="mb-6">
                <Label htmlFor="employeeSelect" className="flex items-center mb-2">
                  <Users className="text-primary mr-2 h-4 w-4" />
                  Select Your Name
                  {scheduleQuery.isLoading && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
                </Label>
                <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeeSearchOpen}
                      className="w-full justify-between"
                      disabled={scheduleQuery.isLoading || !scheduleQuery.data?.employees?.length}
                      data-testid="select-employee"
                    >
                      {selectedEmployeeNumber
                        ? scheduleQuery.data?.employees?.find((employee) => employee.employeeNumber === selectedEmployeeNumber)?.fullName
                        : "Choose your name from the list"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search employees..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {scheduleQuery.data?.employees
                            ?.sort((a, b) => {
                              const lastNameA = a.lastName || a.fullName.split(' ').pop() || '';
                              const lastNameB = b.lastName || b.fullName.split(' ').pop() || '';
                              return lastNameA.localeCompare(lastNameB);
                            })
                            ?.map((employee) => (
                              <CommandItem
                                key={employee.employeeNumber}
                                value={`${employee.fullName} ${employee.employeeNumber}`}
                                onSelect={() => {
                                  handleEmployeeSelect(employee.employeeNumber);
                                  setEmployeeSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedEmployeeNumber === employee.employeeNumber ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {`${employee.lastName || employee.fullName.split(' ').pop()}, ${employee.firstName || employee.fullName.split(' ').slice(0, -1).join(' ')}`}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {scheduleQuery.error && (
                  <p className="text-sm text-destructive mt-1">
                    Failed to load employee schedule. Manual entry available below.
                  </p>
                )}
              </div>
              
              {/* Selected Employee Display */}
              {selectedEmployeeNumber && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <User className="text-primary mr-2 h-5 w-5" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {scheduleQuery.data?.employees?.find((emp) => emp.employeeNumber === selectedEmployeeNumber)?.fullName}
                      </p>
                      <p className="text-sm text-gray-600">Employee #: {watchedValues.employeeNumber || selectedEmployeeNumber}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Address Field */}
              {selectedEmployeeNumber && (
                <div className="mt-4">
                  <Label htmlFor="employeeEmail" className="flex items-center mb-2">
                    <Mail className="text-primary mr-2 h-4 w-4" />
                    Email Address
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="employeeEmail"
                      type="email"
                      value={currentEmployeeEmail}
                      onChange={(e) => setCurrentEmployeeEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1"
                      data-testid="input-employee-email"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await apiRequest("PUT", `/api/employee-numbers/${selectedEmployeeNumber}/email`, { 
                            email: currentEmployeeEmail 
                          });
                          toast({
                            title: "Email updated",
                            description: "Your email address has been saved.",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to update email address.",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!currentEmployeeEmail || !/\S+@\S+\.\S+/.test(currentEmployeeEmail)}
                      data-testid="button-save-email"
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This email will be used for timesheet notifications and submissions.
                  </p>
                </div>
              )}
              
              {/* Manual Employee Number Entry (when no employee selected) */}
              {!selectedEmployeeNumber && (
                <div>
                  <Label htmlFor="employeeNumber" className="flex items-center mb-2">
                    <IdCard className="text-primary mr-2 h-4 w-4" />
                    Employee Number
                  </Label>
                  <Input
                    id="employeeNumber"
                    {...form.register("employeeNumber")}
                    placeholder="Enter employee number if not in dropdown"
                    data-testid="input-employee-number"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Week Selection Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4" data-testid="heading-week-selection">
                Week Selection
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="weekEnding" className="flex items-center mb-2">
                    <Calendar className="text-primary mr-2 h-4 w-4" />
                    Week Ending (Saturday)
                  </Label>
                  <Input
                    id="weekEnding"
                    type="date"
                    {...form.register("weekEnding", {
                      onChange: (e) => handleWeekEndingChange(e.target.value)
                    })}
                    data-testid="input-week-ending"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Entry Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4" data-testid="heading-time-entry">
                Daily Time Entry
              </h2>
              
              {DAYS_OF_WEEK.map(({ key, label }) => (
                <div key={key} className="grid grid-cols-12 gap-2 items-center py-3 border-b border-gray-200 last:border-b-0">
                  <div className="col-span-12 md:col-span-3">
                    <Label className="text-sm font-medium text-secondary">{label}</Label>
                    <Input
                      type="date"
                      {...form.register(`${key}Date` as keyof TimesheetFormData)}
                      readOnly
                      className="mt-1 text-sm bg-gray-50"
                      data-testid={`input-${key}-date`}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Label className="text-sm font-medium text-secondary">Start Time</Label>
                    <FormField
                      control={form.control}
                      name={`${key}StartTime` as keyof TimesheetFormData}
                      render={({ field }) => (
                        <FormItem className="mt-1">
                          <Select value={field.value?.toString() || ""} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="text-sm" data-testid={`select-${key}-start-time`}>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Label className="text-sm font-medium text-secondary">End Time</Label>
                    <FormField
                      control={form.control}
                      name={`${key}EndTime` as keyof TimesheetFormData}
                      render={({ field }) => (
                        <FormItem className="mt-1">
                          <Select value={field.value?.toString() || ""} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="text-sm" data-testid={`select-${key}-end-time`}>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <Label className="text-sm font-medium text-secondary">Total Hours</Label>
                    <Input
                      value={typeof watchedValues[`${key}TotalHours` as keyof TimesheetFormData] === 'number' ? (watchedValues[`${key}TotalHours` as keyof TimesheetFormData] as number).toFixed(2) : ""}
                      readOnly
                      className="mt-1 text-sm bg-gray-50 text-center font-semibold"
                      data-testid={`text-${key}-total-hours`}
                    />
                  </div>
                </div>
              ))}

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
            </CardContent>
          </Card>

          {/* Weeknight Rescue Coverage Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4" data-testid="heading-rescue-coverage">
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
                                className="w-5 h-5"
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
            </CardContent>
          </Card>

          {/* Acknowledgment Card */}
          <Card>
            <CardContent className="p-6">
              <FormField
                control={form.control}
                name="acknowledgmentChecked"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-acknowledgment"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium text-secondary">
                        Acknowledgment <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormDescription className="text-sm text-muted-foreground">
                        I acknowledge that I have reviewed all times and totals for accuracy. 
                        Times imported from the schedule should be verified and updated if they 
                        differ from actual worked hours.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Digital Signature Card */}
          <Card>
            <CardContent className="p-6">
              <FormField
                control={form.control}
                name="signatureData"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-secondary">
                      Digital Signature <span className="text-red-500">*</span>
                    </FormLabel>
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
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {/* Status Indicator */}
          {currentTimesheet && (
            <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-secondary mb-1">Timesheet Status</h3>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(currentTimesheet.status)}
                    {currentTimesheet.supervisorComments && (
                      <span className="text-sm text-gray-600">
                        Comments: {currentTimesheet.supervisorComments}
                      </span>
                    )}
                  </div>
                </div>
                {currentTimesheet.status === "rejected" && (
                  <div className="text-right text-sm text-gray-600">
                    <p>Rejected by: {currentTimesheet.approvedBy}</p>
                    <p>{new Date(currentTimesheet.approvedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearAll}
              data-testid="button-clear-all"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear All
            </Button>
            
            {currentTimesheet && currentTimesheet.status === "draft" && (
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90"
                onClick={handleSubmitForApproval}
                disabled={submitTimesheetMutation.isPending}
                data-testid="button-submit"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitTimesheetMutation.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            )}
            
            <Button
              type="button"
              className="bg-accent hover:bg-accent/90"
              onClick={handleEmail}
              disabled={emailTimesheetMutation.isPending}
              data-testid="button-email"
            >
              <Mail className="mr-2 h-4 w-4" />
              Submit by Email
            </Button>
            
            <Button
              type="button"
              onClick={handlePrint}
              disabled={isLoading}
              data-testid="button-print"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print PDF
            </Button>
          </div>
        </form>
        </Form>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">© 2024 Oakland Fire-Rescue Department</p>
          <p className="text-xs text-gray-500 mt-1">Timesheet Application v1.0</p>
        </div>
      </footer>

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
              className="mt-2"
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
              onClick={handleEmailSubmit}
              disabled={emailTimesheetMutation.isPending}
              data-testid="button-email-submit"
            >
              {emailTimesheetMutation.isPending ? "Submitting..." : "Submit by Email"}
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
    </div>
  );
}
