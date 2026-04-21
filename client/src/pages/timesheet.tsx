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
import { getCurrentWeekEndingDate, isSaturday, getNextSaturday, getPreviousSaturday, formatDateShort } from "@/lib/date-utils";
import { TimesheetSidebar, generateTimesheetSections } from "@/components/TimesheetSidebar";
import { ValidityFooter } from "@/components/ValidityFooter";
import { SubmissionNotification } from "@/components/ui/submission-notification";
import { Flame, User, IdCard, Calendar, Save, Mail, Printer, HelpCircle, Users, RefreshCw, Send, CheckCircle, Clock, XCircle, AlertCircle, Check, RotateCcw, LogOut, Plus, Trash2, Download, Shield } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  
  // Employee edit fields
  isEditingPreviousSubmission: z.boolean().default(false),
  editComments: z.string().optional().refine((val, ctx) => {
    const formData = ctx.parent as any;
    if (formData.isEditingPreviousSubmission && (!val || val.trim().length === 0)) {
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

interface ScheduleData {
  shifts: any[];
  employees?: Array<{
    employeeNumber: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
  }>;
}

interface Shift {
  startTime: string;
  endTime: string;
  hours: number;
}

export default function TimesheetPage({ logout }: { logout?: () => void }) {
  const [signatureData, setSignatureData] = useState<string>("");
  const [initialSignature, setInitialSignature] = useState<string>("");
  const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState<string>("");
  const [currentEmployeeEmail, setCurrentEmployeeEmail] = useState<string>("");
  const [activeSection, setActiveSection] = useState("employee");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTimesheet, setCurrentTimesheet] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'schedule' | 'existing' | 'manual'>('manual');
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string>("");
  const [pendingEmailPayload, setPendingEmailPayload] = useState<any>(null);
  const [showChangeMemberDialog, setShowChangeMemberDialog] = useState(false);
  const [showEditEmailDialog, setShowEditEmailDialog] = useState(false);
  const [editingEmail, setEditingEmail] = useState('');
  const [showEmployeeIdPrompt, setShowEmployeeIdPrompt] = useState(false);
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [tempEmployeeData, setTempEmployeeData] = useState<any>(null);

  const { toast } = useToast();

  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      memberName: "",
      memberNumber: "",
      weekEnding: getCurrentWeekEndingDate(),
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
      signatureData: "",
      isEditingPreviousSubmission: false,
    },
  });

  const { watch, setValue, handleSubmit: formHandleSubmit } = form;

  // Force correct week ending date on mount
  useEffect(() => {
    // Calculate correct date directly here to ensure it works
    const today = new Date();
    const dayOfWeek = today.getDay();
    let daysToSaturday;
    if (dayOfWeek === 0) {
      daysToSaturday = -1; // Sunday: go back to yesterday's Saturday
    } else {
      daysToSaturday = 6 - dayOfWeek; // Other days: go forward to Saturday
    }
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysToSaturday);
    
    // Use timezone-safe date formatting to avoid ISO string timezone issues
    const year = saturday.getFullYear();
    const month = String(saturday.getMonth() + 1).padStart(2, '0');
    const day = String(saturday.getDate()).padStart(2, '0');
    const correctWeekEnding = `${year}-${month}-${day}`;
    
    setValue("weekEnding", correctWeekEnding);
  }, [setValue]);
  const watchedValues = watch();

  // Fetch schedule data (includes employee information)
  const scheduleQuery = useQuery<ScheduleData>({
    queryKey: ['/api/schedule'],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch employee numbers from database
  const employeeNumbersQuery = useQuery<Array<{ id: string; employeeName: string; employeeNumber: string; active: boolean }>>({
    queryKey: ['/api/employee-numbers'],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const employeeEmailQuery = useQuery({
    queryKey: ['/api/employee-numbers', selectedEmployeeNumber, 'email'],
    queryFn: async () => {
      const response = await fetch(`/api/employee-numbers/${selectedEmployeeNumber}/email`);
      if (!response.ok) return "";
      const data = await response.json();
      return data.email || "";
    },
    enabled: !!selectedEmployeeNumber,
  });

  const timesheetQuery = useQuery({
    queryKey: [`/api/timesheets/employee/${selectedEmployeeNumber}/${watchedValues.weekEnding}`],
    enabled: !!(selectedEmployeeNumber && watchedValues.weekEnding),
    retry: false,
  });

  // Query for employee shifts from schedule
  const employeeShiftsQuery = useQuery({
    queryKey: [`/api/schedule/employee/${selectedEmployeeNumber}/week/${watchedValues.weekEnding}`],
    enabled: !!(selectedEmployeeNumber && watchedValues.weekEnding),
    retry: false,
  });

  const emailTimesheetMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/timesheet/submit-email', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet has been emailed successfully.",
      });
    },
  });

  const submitTimesheetMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/submit-timesheet', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet submitted for approval.",
      });
    },
  });

  // Calculate total hours - convert to numbers since database values come as strings
  const totalHours = (Number(watchedValues.sundayTotalHours) || 0) +
                    (Number(watchedValues.mondayTotalHours) || 0) +
                    (Number(watchedValues.tuesdayTotalHours) || 0) +
                    (Number(watchedValues.wednesdayTotalHours) || 0) +
                    (Number(watchedValues.thursdayTotalHours) || 0) +
                    (Number(watchedValues.fridayTotalHours) || 0) +
                    (Number(watchedValues.saturdayTotalHours) || 0);


  // Populate dates when week ending changes
  useEffect(() => {
    if (watchedValues.weekEnding) {
      const dates = populateWeekDates(watchedValues.weekEnding);
      Object.entries(dates).forEach(([day, date]) => {
        setValue(`${day}Date` as keyof TimesheetFormData, date);
      });
    }
  }, [watchedValues.weekEnding, setValue]);

  // Load existing timesheet data when found
  useEffect(() => {
    if (timesheetQuery.data && typeof timesheetQuery.data === 'object' && timesheetQuery.data.id) {
      const timesheet = timesheetQuery.data;
      console.log('📋 Loading existing timesheet data:', timesheet);
      setCurrentTimesheet(timesheet);
      setDataSource('existing');
      
      // Populate form with existing timesheet data
      setValue("memberName", timesheet.employeeName || "");
      setValue("memberNumber", timesheet.employeeNumber || "");
      setValue("weekEnding", timesheet.weekEnding || "");
      
      // Populate daily data
      DAYS_OF_WEEK.forEach(({ key }) => {
        setValue(`${key}Date` as keyof TimesheetFormData, timesheet[`${key}Date`] || "");
        
        // Parse shifts from JSON string to array
        const shiftsData = timesheet[`${key}Shifts`];
        const parsedShifts = typeof shiftsData === 'string' ? JSON.parse(shiftsData) : shiftsData || [];
        setValue(`${key}Shifts` as keyof TimesheetFormData, parsedShifts);
        
        setValue(`${key}TotalHours` as keyof TimesheetFormData, timesheet[`${key}TotalHours`] || 0);
      });
      
      // Populate rescue coverage
      setValue("rescueCoverageMonday", timesheet.rescueCoverageMonday || false);
      setValue("rescueCoverageTuesday", timesheet.rescueCoverageTuesday || false);
      setValue("rescueCoverageWednesday", timesheet.rescueCoverageWednesday || false);
      setValue("rescueCoverageThursday", timesheet.rescueCoverageThursday || false);
      
      // Load signature data
      if (timesheet.signatureData) {
        setSignatureData(timesheet.signatureData);
        setInitialSignature(timesheet.signatureData);
        setValue("signatureData", timesheet.signatureData);
      } else {
        // Clear signature data if no signature in timesheet
        setSignatureData("");
        setInitialSignature("");
        setValue("signatureData", "");
      }
      
      setValue("status", timesheet.status || "draft");
      setValue("id", timesheet.id);
      
      console.log('✅ Existing timesheet loaded successfully');
    }
  }, [timesheetQuery.data, setValue]);

  // Load schedule shifts when no existing timesheet found
  useEffect(() => {
    if (employeeShiftsQuery.data && !timesheetQuery.data && selectedEmployeeNumber && watchedValues.weekEnding) {
      console.log('📅 Loading schedule shifts:', employeeShiftsQuery.data);
      setDataSource('schedule');
      
      // Clear existing shifts and rescue coverage first
      DAYS_OF_WEEK.forEach(({ key }) => {
        setValue(`${key}Shifts` as keyof TimesheetFormData, []);
        setValue(`${key}TotalHours` as keyof TimesheetFormData, 0);
      });
      
      // Clear rescue coverage checkboxes
      setValue("rescueCoverageMonday", false);
      setValue("rescueCoverageTuesday", false);
      setValue("rescueCoverageWednesday", false);
      setValue("rescueCoverageThursday", false);
      
      // Process schedule shifts
      employeeShiftsQuery.data.forEach((shift: any) => {
        // Fix date parsing to avoid timezone issues
        const shiftDate = new Date(shift.date + 'T12:00:00');
        const dayOfWeek = shiftDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayKey = DAYS_OF_WEEK[dayOfWeek].key;
        
        // Check if this is a Night Duty shift
        const isNightDuty = shift.position === "Night Duty" || 
                           (shift.description && shift.description.includes("PositionName:Night Duty"));
        
        if (isNightDuty) {
          // For Night Duty shifts, check the appropriate rescue coverage checkbox
          // Map day of week to rescue coverage field names (Monday-Thursday only)
          const rescueCoverageMap: { [key: number]: string } = {
            1: 'rescueCoverageMonday',    // Monday
            2: 'rescueCoverageTuesday',   // Tuesday  
            3: 'rescueCoverageWednesday', // Wednesday
            4: 'rescueCoverageThursday'   // Thursday
          };
          
          const rescueField = rescueCoverageMap[dayOfWeek];
          if (rescueField) {
            setValue(rescueField as keyof TimesheetFormData, true);
          }
        } else if (shift.startTime && shift.endTime) {
          // Regular shifts: add to time entry
          // Convert ISO timestamp to HH:MM format
          const formatTimeFromISO = (isoString: string): string => {
            const date = new Date(isoString);
            return date.toTimeString().substring(0, 5); // Gets HH:MM
          };
          
          const startTimeFormatted = formatTimeFromISO(shift.startTime);
          const endTimeFormatted = formatTimeFromISO(shift.endTime);
          
          const currentShifts = form.getValues(`${dayKey}Shifts` as keyof TimesheetFormData) as DayShift[] || [];
          const hours = calculateHours(startTimeFormatted, endTimeFormatted);
          
          const newShift: DayShift = {
            startTime: startTimeFormatted,
            endTime: endTimeFormatted,
            hours: hours
          };
          
          const updatedShifts = [...currentShifts, newShift];
          setValue(`${dayKey}Shifts` as keyof TimesheetFormData, updatedShifts);
          updateDayTotalHours(dayKey, updatedShifts);
        }
      });
      
      console.log('✅ Schedule shifts loaded successfully');
    }
  }, [employeeShiftsQuery.data, timesheetQuery.data, selectedEmployeeNumber, watchedValues.weekEnding, setValue, form]);

  // Initialize employee email when loaded
  useEffect(() => {
    if (employeeEmailQuery.data && selectedEmployeeNumber) {
      setCurrentEmployeeEmail(employeeEmailQuery.data);
    }
  }, [employeeEmailQuery.data, selectedEmployeeNumber]);

  const handleEmployeeSelect = (employeeNumber: string) => {
    setSelectedEmployeeNumber(employeeNumber);
    
    // Clear signature data when switching employees
    setSignatureData("");
    setInitialSignature("");
    setValue("signatureData", "");
    
    // Get employee name from schedule data
    const employee = scheduleQuery.data?.employees?.find(emp => emp.employeeNumber === employeeNumber);
    if (employee) {
      setValue("memberName", employee.fullName);
      // Look up actual member number from DB by name (calendar may have name-based IDs)
      const dbEmployee = employeeNumbersQuery.data?.find(emp => emp.employeeName === employee.fullName);
      setValue("memberNumber", dbEmployee?.employeeNumber || employeeNumber);
    } else {
      setValue("memberNumber", employeeNumber);
    }
    
    setMemberSearchQuery('');
  };

  const handleWeekEndingChange = (weekEnding: string) => {
    setValue("weekEnding", weekEnding);
  };

  const addShift = (day: string) => {
    const currentShifts = watchedValues[`${day}Shifts` as keyof TimesheetFormData] as DayShift[] || [];
    const newShift: DayShift = { startTime: "", endTime: "", hours: 0 };
    setValue(`${day}Shifts` as keyof TimesheetFormData, [...currentShifts, newShift]);
  };

  const removeShift = (day: string, index: number) => {
    const currentShifts = watchedValues[`${day}Shifts` as keyof TimesheetFormData] as DayShift[] || [];
    const updatedShifts = currentShifts.filter((_, i) => i !== index);
    setValue(`${day}Shifts` as keyof TimesheetFormData, updatedShifts);
    updateDayTotalHours(day, updatedShifts);
  };

  const updateShiftTime = (day: string, index: number, field: 'startTime' | 'endTime', value: string) => {
    const currentShifts = watchedValues[`${day}Shifts` as keyof TimesheetFormData] as DayShift[] || [];
    const updatedShifts = [...currentShifts];
    updatedShifts[index] = { ...updatedShifts[index], [field]: value };
    
    // Recalculate hours for this shift
    if (updatedShifts[index].startTime && updatedShifts[index].endTime) {
      updatedShifts[index].hours = calculateHours(updatedShifts[index].startTime, updatedShifts[index].endTime);
    }
    
    setValue(`${day}Shifts` as keyof TimesheetFormData, updatedShifts);
    updateDayTotalHours(day, updatedShifts);
  };

  const updateDayTotalHours = (day: string, shifts: DayShift[]) => {
    const total = shifts.reduce((sum, shift) => sum + (shift.hours || 0), 0);
    setValue(`${day}TotalHours` as keyof TimesheetFormData, total);
  };

  const handleSubmit = async () => {
    try {
      // Validate signature is present
      if (!signatureData || signatureData.trim() === '') {
        toast({
          title: "Signature Required",
          description: "Please provide a digital signature before submitting your timesheet.",
          variant: "destructive",
        });
        return;
      }
      
      setIsLoading(true);
      const formData = form.getValues();
      
      // Compute dates for each day from the week ending date
      const weekEndDate = new Date(formData.weekEnding + 'T00:00:00');
      const getDayDate = (offset: number) => {
        const d = new Date(weekEndDate);
        d.setDate(weekEndDate.getDate() - (6 - offset));
        return d.toISOString().split('T')[0];
      };
      const firstStart = (shifts: DayShift[]) => shifts?.[0]?.startTime || '';
      const firstEnd = (shifts: DayShift[]) => shifts?.[0]?.endTime || '';

      // Generate PDF with all required fields
      const pdfBytes = await generateTimeSheetPDF({
        employeeName: formData.memberName,
        employeeNumber: formData.memberNumber,
        weekEnding: formData.weekEnding,

        sundayDate: formData.sundayDate || getDayDate(0),
        sundayStartTime: firstStart(formData.sundayShifts),
        sundayEndTime: firstEnd(formData.sundayShifts),
        sundayTotalHours: formData.sundayTotalHours || 0,

        mondayDate: formData.mondayDate || getDayDate(1),
        mondayStartTime: firstStart(formData.mondayShifts),
        mondayEndTime: firstEnd(formData.mondayShifts),
        mondayTotalHours: formData.mondayTotalHours || 0,

        tuesdayDate: formData.tuesdayDate || getDayDate(2),
        tuesdayStartTime: firstStart(formData.tuesdayShifts),
        tuesdayEndTime: firstEnd(formData.tuesdayShifts),
        tuesdayTotalHours: formData.tuesdayTotalHours || 0,

        wednesdayDate: formData.wednesdayDate || getDayDate(3),
        wednesdayStartTime: firstStart(formData.wednesdayShifts),
        wednesdayEndTime: firstEnd(formData.wednesdayShifts),
        wednesdayTotalHours: formData.wednesdayTotalHours || 0,

        thursdayDate: formData.thursdayDate || getDayDate(4),
        thursdayStartTime: firstStart(formData.thursdayShifts),
        thursdayEndTime: firstEnd(formData.thursdayShifts),
        thursdayTotalHours: formData.thursdayTotalHours || 0,

        fridayDate: formData.fridayDate || getDayDate(5),
        fridayStartTime: firstStart(formData.fridayShifts),
        fridayEndTime: firstEnd(formData.fridayShifts),
        fridayTotalHours: formData.fridayTotalHours || 0,

        saturdayDate: formData.saturdayDate || getDayDate(6),
        saturdayStartTime: firstStart(formData.saturdayShifts),
        saturdayEndTime: firstEnd(formData.saturdayShifts),
        saturdayTotalHours: formData.saturdayTotalHours || 0,

        totalWeeklyHours: totalHours,

        rescueCoverageMonday: formData.rescueCoverageMonday,
        rescueCoverageTuesday: formData.rescueCoverageTuesday,
        rescueCoverageWednesday: formData.rescueCoverageWednesday,
        rescueCoverageThursday: formData.rescueCoverageThursday,

        signatureData: signatureData,
      });

      // Store PDF and email payload, then show preview modal
      const emailPayload = {
        employeeNumber: formData.memberNumber,
        employeeEmail: currentEmployeeEmail || '',
        timesheetData: {
          employeeName: formData.memberName,
          weekEnding: formData.weekEnding,
          pdfBuffer: pdfBytes,
          sundayDate: formData.sundayDate,
          sundayTotalHours: formData.sundayTotalHours,
          sundayShifts: JSON.stringify(formData.sundayShifts || []),
          mondayDate: formData.mondayDate,
          mondayTotalHours: formData.mondayTotalHours,
          mondayShifts: JSON.stringify(formData.mondayShifts || []),
          tuesdayDate: formData.tuesdayDate,
          tuesdayTotalHours: formData.tuesdayTotalHours,
          tuesdayShifts: JSON.stringify(formData.tuesdayShifts || []),
          wednesdayDate: formData.wednesdayDate,
          wednesdayTotalHours: formData.wednesdayTotalHours,
          wednesdayShifts: JSON.stringify(formData.wednesdayShifts || []),
          thursdayDate: formData.thursdayDate,
          thursdayTotalHours: formData.thursdayTotalHours,
          thursdayShifts: JSON.stringify(formData.thursdayShifts || []),
          fridayDate: formData.fridayDate,
          fridayTotalHours: formData.fridayTotalHours,
          fridayShifts: JSON.stringify(formData.fridayShifts || []),
          saturdayDate: formData.saturdayDate,
          saturdayTotalHours: formData.saturdayTotalHours,
          saturdayShifts: JSON.stringify(formData.saturdayShifts || []),
          totalWeeklyHours: totalHours,
          rescueCoverageMonday: formData.rescueCoverageMonday,
          rescueCoverageTuesday: formData.rescueCoverageTuesday,
          rescueCoverageWednesday: formData.rescueCoverageWednesday,
          rescueCoverageThursday: formData.rescueCoverageThursday,
          signatureData: signatureData,
        },
      };

      setGeneratedPdfUrl(pdfBytes);
      setPendingEmailPayload(emailPayload);
      setShowPdfPreview(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate timesheet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailTimesheet = async () => {
    try {
      await emailTimesheetMutation.mutateAsync(pendingEmailPayload);
      setShowPdfPreview(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrintPdf = () => {
    if (!generatedPdfUrl) return;
    const printWindow = window.open(generatedPdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      // Validate signature is present
      if (!signatureData || signatureData.trim() === '') {
        toast({
          title: "Signature Required",
          description: "Please provide a digital signature before submitting your timesheet.",
          variant: "destructive",
        });
        return;
      }
      
      const formData = form.getValues();
      await submitTimesheetMutation.mutateAsync({
        ...formData,
        status: "submitted",
        totalHours,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit for approval. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClearAll = () => {
    form.reset();
    setSignatureData("");
    setSelectedEmployeeNumber("");
    setCurrentEmployeeEmail("");
  };

  const sections = generateTimesheetSections({
    hasWeekEnding: !!watchedValues.weekEnding,
    hasTimeEntries: totalHours > 0,
    hasRescueCoverage: true,
    hasSignature: !!(signatureData && signatureData.trim() !== ''),
  });


  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    // Map finalization to acknowledgment section for scrolling
    const targetId = sectionId === 'finalization' ? 'acknowledgment' : sectionId;
    const element = document.getElementById(`section-${targetId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-background min-h-[100dvh]">
      {/* Loading Overlay */}
      {(isLoading || emailTimesheetMutation.isPending) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="ios-card p-8 text-center max-w-xs">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="ios-body text-muted-foreground">Processing...</p>
          </div>
        </div>
      )}

      {/* Sidebar Navigation - only show after member is selected and on medium+ screens */}
      {selectedEmployeeNumber && (
        <div className="hidden md:block fixed left-0 top-0 h-screen z-10 animate-in slide-in-from-left-full duration-500 ease-out">
          <TimesheetSidebar
            sections={sections}
            onSectionClick={handleSectionClick}
            activeSection={activeSection}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className={`${selectedEmployeeNumber ? 'md:ml-64' : ''} pb-20`}>
        <main className="p-4 sm:p-6 bg-background">
          <div className="ios-mobile-spacing pt-safe-area-inset-top pb-safe-area-inset-bottom">
            <div className="flex justify-between items-center mb-6">
              <h1 className="ios-title-1 text-foreground">Weekly Timesheet</h1>
              <a
                href="/admin"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 text-sm inline-flex items-center rounded-md font-medium transition-colors"
                data-testid="nav-admin"
              >
                <Shield className="h-4 w-4 mr-1" />
                Admin Login
              </a>
            </div>
            
            {/* Submission Notification for existing timesheets */}
            {currentTimesheet && currentTimesheet.lastActivityInfo && (
              <SubmissionNotification 
                lastActivityInfo={currentTimesheet.lastActivityInfo}
                weekEnding={currentTimesheet.weekEnding}
              />
            )}
            
            <Form {...form}>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                {/* Employee Selection Section */}
                <div id="section-employee">
                  {!selectedEmployeeNumber && (
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="ios-headline mb-4" data-testid="heading-employee-selection">
                          Select Member
                        </h2>
                        
                        <div className="mb-6">
                          <div className="flex items-center mb-4">
                            <Users className="text-primary mr-2 h-5 w-5" />
                            <h3 className="text-lg font-medium">Select Your Name</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Choose your name from the list below. You can search to find it quickly.
                          </p>
                          
                          <div className="mb-4">
                            <Input
                              placeholder="Search by name..."
                              value={memberSearchQuery}
                              onChange={(e) => setMemberSearchQuery(e.target.value)}
                              className="w-full"
                              data-testid="input-member-search"
                            />
                          </div>
                          
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {scheduleQuery.isLoading ? (
                              <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, index) => (
                                  <div key={index} className="h-16 bg-muted animate-pulse rounded"></div>
                                ))}
                              </div>
                            ) : (
                              scheduleQuery.data?.employees
                                ?.filter((employee) => {
                                  const dbEmployee = employeeNumbersQuery.data?.find(emp => emp.employeeName === employee.fullName);
                                  const isActive = !dbEmployee || dbEmployee.active !== false;
                                  const searchLower = memberSearchQuery.toLowerCase();
                                  const displayNumber = dbEmployee?.employeeNumber || employee.employeeNumber;
                                  const matchesSearch = searchLower === '' || 
                                    employee.fullName.toLowerCase().includes(searchLower) ||
                                    displayNumber.toLowerCase().includes(searchLower);
                                  return isActive && matchesSearch;
                                })
                                .sort((a, b) => {
                                  const aLastName = a.lastName || a.fullName.split(' ').pop() || '';
                                  const bLastName = b.lastName || b.fullName.split(' ').pop() || '';
                                  return aLastName.localeCompare(bLastName);
                                })
                                .map((employee) => {
                                  const dbEmployee = employeeNumbersQuery.data?.find(emp => emp.employeeName === employee.fullName);
                                  const displayNumber = dbEmployee?.employeeNumber || employee.employeeNumber;
                                  return (
                                  <Button
                                    key={employee.employeeNumber}
                                    variant={selectedEmployeeNumber === employee.employeeNumber ? "default" : "ghost"}
                                    className="w-full h-16 flex items-center justify-start p-4 text-left"
                                    onClick={() => handleEmployeeSelect(employee.employeeNumber)}
                                    data-testid={`select-employee-${employee.employeeNumber}`}
                                  >
                                    <div className="flex items-center w-full">
                                      <div className="flex-1">
                                        <div className="font-medium text-base">
                                          {`${employee.lastName || employee.fullName.split(' ').pop()}, ${employee.firstName || employee.fullName.split(' ').slice(0, -1).join(' ')}`}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          Member #{displayNumber}
                                        </div>
                                      </div>
                                      {selectedEmployeeNumber === employee.employeeNumber && (
                                        <Check className="ml-2 h-5 w-5 text-primary" />
                                      )}
                                    </div>
                                  </Button>
                                  );
                                })
                            )}
                            
                            {scheduleQuery.data?.employees
                              ?.filter((employee) => {
                                const dbEmployee = employeeNumbersQuery.data?.find(emp => emp.employeeName === employee.fullName);
                                const isActive = !dbEmployee || dbEmployee.active !== false;
                                const searchLower = memberSearchQuery.toLowerCase();
                                const displayNumber = dbEmployee?.employeeNumber || employee.employeeNumber;
                                const matchesSearch = searchLower === '' || 
                                  employee.fullName.toLowerCase().includes(searchLower) ||
                                  displayNumber.toLowerCase().includes(searchLower);
                                return isActive && matchesSearch;
                              }).length === 0 && !scheduleQuery.isLoading && (
                              <div className="text-center py-8 text-muted-foreground">
                                {memberSearchQuery ? 'No members found matching your search.' : 'No active members found.'}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Week Selection Section */}
                {selectedEmployeeNumber && (
                  <div id="section-week">
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="ios-headline mb-4" data-testid="heading-week-selection">
                          Week Selection
                        </h2>
                        <Label htmlFor="weekEnding" className="flex items-center mb-2">
                          <Calendar className="text-primary mr-2 h-4 w-4" />
                          Week Ending (Saturday)
                        </Label>
                        <WeekPicker
                          value={watchedValues.weekEnding}
                          onChange={handleWeekEndingChange}
                          placeholder="Select a week"
                          className="w-full"
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Time Entry Section */}
                {selectedEmployeeNumber && watchedValues.weekEnding && (
                  <div id="section-time">
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="ios-headline mb-4">Daily Time Entry</h2>
                        
                        {DAYS_OF_WEEK.map(({ key, label }) => {
                          // Ensure dayShifts is always an array
                          const shiftsValue = watchedValues[`${key}Shifts` as keyof TimesheetFormData];
                          const dayShifts = Array.isArray(shiftsValue) ? shiftsValue : [];
                          const dayDate = watchedValues[`${key}Date` as keyof TimesheetFormData] as string || "";
                          const dayTotalHours = watchedValues[`${key}TotalHours` as keyof TimesheetFormData] as number || 0;

                          return (
                            <div key={key} className="mb-6 p-4 border rounded-lg">
                              <div className="flex justify-between items-center mb-4">
                                <div>
                                  <h3 className="text-lg font-semibold">{label}</h3>
                                  <p className="text-sm text-muted-foreground">{dayDate}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Total Hours</p>
                                  <p className="text-lg font-bold" data-testid={`text-${key}-total-hours`}>
                                    {Number(dayTotalHours || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              {dayShifts.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                  No shifts added. Click "Add Shift" to get started.
                                </div>
                              ) : (
                                dayShifts.map((shift, index) => (
                                  <div key={index} className="bg-gray-50 rounded-lg mb-3 p-4">
                                    {/* Mobile Layout - Stack vertically on small screens */}
                                    <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-end">
                                      <div className="md:col-span-4">
                                        <Label className="text-sm text-gray-600 mb-2 block">Start Time</Label>
                                        <TimePicker
                                          value={shift.startTime || ""}
                                          onChange={(value) => updateShiftTime(key, index, 'startTime', value)}
                                          placeholder="Select start time"
                                          className="w-full h-12 text-base"
                                          type="start"
                                        />
                                      </div>
                                      <div className="md:col-span-4">
                                        <Label className="text-sm text-gray-600 mb-2 block">End Time</Label>
                                        <TimePicker
                                          value={shift.endTime || ""}
                                          onChange={(value) => updateShiftTime(key, index, 'endTime', value)}
                                          placeholder="Select end time"
                                          className="w-full h-12 text-base"
                                          type="end"
                                          startTime={shift.startTime}
                                        />
                                      </div>
                                      <div className="flex justify-between items-center md:col-span-4 md:block">
                                        <div className="md:text-center">
                                          <Label className="text-sm text-gray-600 mb-2 block">Hours</Label>
                                          <div className="text-lg font-semibold bg-white px-3 py-2 rounded border md:text-center" data-testid={`text-${key}-shift-${index}-hours`}>
                                            {shift.hours?.toFixed(2) || "0.00"}
                                          </div>
                                        </div>
                                        <div className="ml-4 md:ml-0 md:mt-2 md:text-center">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeShift(key, index)}
                                            className="h-12 w-12 p-0 md:h-10 md:w-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            data-testid={`button-remove-${key}-shift-${index}`}
                                          >
                                            <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => addShift(key)}
                                className="w-full mt-4 h-12 text-base font-medium"
                                data-testid={`button-add-${key}-shift`}
                              >
                                <Plus className="mr-2 h-5 w-5" />
                                Add Shift
                              </Button>
                            </div>
                          );
                        })}

                        <div className="mt-6 p-6 bg-blue-50 rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                            <span className="text-lg font-semibold text-center sm:text-left">Total Weekly Hours:</span>
                            <span className="text-3xl font-bold text-blue-600 text-center sm:text-right" data-testid="text-total-weekly-hours">
                              {Number(totalHours || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Weekday Rescue Coverage Section */}
                {selectedEmployeeNumber && watchedValues.weekEnding && (
                  <div id="section-rescue">
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="ios-headline mb-4">Weekday Rescue Coverage</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          Check the days you provided rescue coverage (optional).
                        </p>
                        
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                          <FormField
                            control={form.control}
                            name="rescueCoverageMonday"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="w-8 h-8 sm:w-6 sm:h-6"
                                    data-testid="checkbox-rescue-monday"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm">Monday</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="rescueCoverageTuesday"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="w-8 h-8 sm:w-6 sm:h-6"
                                    data-testid="checkbox-rescue-tuesday"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm">Tuesday</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="rescueCoverageWednesday"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="w-8 h-8 sm:w-6 sm:h-6"
                                    data-testid="checkbox-rescue-wednesday"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm">Wednesday</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="rescueCoverageThursday"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="w-8 h-8 sm:w-6 sm:h-6"
                                    data-testid="checkbox-rescue-thursday"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm">Thursday</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Acknowledgment and Signature Section */}
                {selectedEmployeeNumber && watchedValues.weekEnding && (
                  <div id="section-acknowledgment">
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="ios-headline mb-4 text-orange-700">
                          Acknowledgment & Digital Signature
                        </h2>
                        
                        <FormField
                          control={form.control}
                          name="signatureData"
                          render={() => (
                            <FormItem>
                              <FormDescription className="text-sm text-muted-foreground mb-4">
                                By signing below, I acknowledge that I have reviewed all times and totals for accuracy, confirm that all time entries are correct and complete, and attest that the hours submitted are a complete and accurate record of my time worked.
                              </FormDescription>
                              <FormControl>
                                <SignaturePad
                                  onSignatureChange={(signature) => {
                                    setSignatureData(signature);
                                    setValue("signatureData", signature);
                                  }}
                                  existingSignature={initialSignature}
                                  data-testid="signature-pad"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedEmployeeNumber && watchedValues.weekEnding && (
                  <div className="relative mb-8">
                    <div className="absolute left-0 top-0">
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
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                      {currentTimesheet && currentTimesheet.status === "draft" && (
                        <Button
                          type="button"
                          className="ios-button ios-button-primary"
                          onClick={handleSubmitForApproval}
                          disabled={submitTimesheetMutation.isPending || !signatureData || signatureData.trim() === ''}
                          data-testid="button-submit"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {submitTimesheetMutation.isPending ? "Submitting..." : "Submit for Approval"}
                        </Button>
                      )}
                      
                      <Button
                        type="button"
                        className="ios-button ios-button-primary bg-accent hover:bg-accent/90"
                        onClick={handleSubmit}
                        disabled={isLoading || emailTimesheetMutation.isPending || !signatureData || signatureData.trim() === ''}
                        data-testid="button-submit"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Submit
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </div>
        </main>
      </div>

      {/* Change Member Confirmation Dialog */}
      <AlertDialog open={showChangeMemberDialog} onOpenChange={setShowChangeMemberDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Your timecard is not saved or submitted. Any changes you've made will be lost if you select a different member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setSelectedEmployeeNumber('');
                setCurrentEmployeeEmail('');
                setValue('memberNumber', '');
                setShowChangeMemberDialog(false);
              }}
              data-testid="confirm-change-member"
            >
              Yes, Change Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Email Dialog */}
      <Dialog open={showEditEmailDialog} onOpenChange={setShowEditEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Email Address</DialogTitle>
            <DialogDescription>
              Update the email address for {watchedValues.memberName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={editingEmail}
                onChange={(e) => setEditingEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded mt-1"
                placeholder="Enter email address"
                data-testid="input-edit-email"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditEmailDialog(false)}
                data-testid="button-cancel-email"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setCurrentEmployeeEmail(editingEmail);
                  setShowEditEmailDialog(false);
                }}
                data-testid="button-save-email"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validity Footer - only show after member is selected */}
      {selectedEmployeeNumber && (
        <ValidityFooter
          hasEmployee={!!(watchedValues.memberName && watchedValues.memberNumber)}
          hasWeekEnding={!!watchedValues.weekEnding}
          hasTimeEntries={totalHours > 0}
          hasRescueCoverage={watchedValues.rescueCoverageMonday || watchedValues.rescueCoverageTuesday || watchedValues.rescueCoverageWednesday || watchedValues.rescueCoverageThursday}
          hasSignature={!!(signatureData && signatureData.trim() !== '')}
          totalHours={totalHours}
          memberName={watchedValues.memberName}
          memberNumber={watchedValues.memberNumber}
          memberEmail={currentEmployeeEmail}
          onMemberNameClick={() => {
            setEditingEmail(currentEmployeeEmail);
            setShowEditEmailDialog(true);
          }}
          onChangeMember={() => setShowChangeMemberDialog(true)}
        />
      )}

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle>Review Your Timesheet</DialogTitle>
            <DialogDescription>
              Review your timesheet below, then choose to email it or print it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6">
            {generatedPdfUrl && (
              <iframe
                src={generatedPdfUrl}
                className="w-full h-full rounded border"
                title="Timesheet Preview"
              />
            )}
          </div>
          <DialogFooter className="px-6 py-4 shrink-0 flex gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowPdfPreview(false)}
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrintPdf}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print PDF
              </Button>
              <Button
                onClick={handleEmailTimesheet}
                disabled={emailTimesheetMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-2" />
                {emailTimesheetMutation.isPending ? "Sending..." : "Email Timesheet"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}