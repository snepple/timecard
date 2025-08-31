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
import { Flame, User, IdCard, Calendar, Save, Mail, Printer, HelpCircle, Users, RefreshCw, Send, CheckCircle, Clock, XCircle, AlertCircle, Check, RotateCcw, LogOut, Plus, Trash2, Download } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  acknowledgmentChecked: z.boolean().refine(val => val === true, {
    message: "You must acknowledge that you have reviewed all times and totals for accuracy"
  }),
  
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

export default function TimesheetPage() {
  const [signatureData, setSignatureData] = useState<string>("");
  const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState<string>("");
  const [currentEmployeeEmail, setCurrentEmployeeEmail] = useState<string>("");
  const [activeSection, setActiveSection] = useState("employee");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTimesheet, setCurrentTimesheet] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'schedule' | 'existing' | 'manual'>('manual');
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [showChangeMemberDialog, setShowChangeMemberDialog] = useState(false);
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
      acknowledgmentChecked: false,
      signatureData: "",
      isEditingPreviousSubmission: false,
    },
  });

  const { watch, setValue, handleSubmit: formHandleSubmit } = form;
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
    queryKey: ['/api/employee-email', selectedEmployeeNumber],
    queryFn: () => Promise.resolve(""),
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
    mutationFn: (data: any) => apiRequest('/api/email-timesheet', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet has been emailed successfully.",
      });
    },
  });

  const submitTimesheetMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/submit-timesheet', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet submitted for approval.",
      });
    },
  });

  // Calculate total hours
  const totalHours = (watchedValues.sundayTotalHours || 0) +
                    (watchedValues.mondayTotalHours || 0) +
                    (watchedValues.tuesdayTotalHours || 0) +
                    (watchedValues.wednesdayTotalHours || 0) +
                    (watchedValues.thursdayTotalHours || 0) +
                    (watchedValues.fridayTotalHours || 0) +
                    (watchedValues.saturdayTotalHours || 0);


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
        setValue(`${key}Shifts` as keyof TimesheetFormData, timesheet[`${key}Shifts`] || []);
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
        setValue("signatureData", timesheet.signatureData);
      }
      
      setValue("acknowledgmentChecked", timesheet.acknowledgmentChecked || false);
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
      
      // Clear existing shifts first
      DAYS_OF_WEEK.forEach(({ key }) => {
        setValue(`${key}Shifts` as keyof TimesheetFormData, []);
        setValue(`${key}TotalHours` as keyof TimesheetFormData, 0);
      });
      
      // Process schedule shifts
      employeeShiftsQuery.data.forEach((shift: any) => {
        const shiftDate = new Date(shift.date);
        const dayOfWeek = shiftDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayKey = DAYS_OF_WEEK[dayOfWeek].key;
        
        if (shift.startTime && shift.endTime) {
          const currentShifts = form.getValues(`${dayKey}Shifts` as keyof TimesheetFormData) as DayShift[] || [];
          const hours = calculateHours(shift.startTime, shift.endTime);
          
          const newShift: DayShift = {
            startTime: shift.startTime,
            endTime: shift.endTime,
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

  const handleEmployeeSelect = (employeeNumber: string) => {
    setSelectedEmployeeNumber(employeeNumber);
    setValue("memberNumber", employeeNumber);
    
    // Get employee name from schedule data
    const employee = scheduleQuery.data?.employees?.find(emp => emp.employeeNumber === employeeNumber);
    if (employee) {
      setValue("memberName", employee.fullName);
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
      setIsLoading(true);
      const formData = form.getValues();
      
      // Generate PDF
      const pdfBytes = await generateTimeSheetPDF({
        memberName: formData.memberName,
        memberNumber: formData.memberNumber,
        weekEnding: formData.weekEnding,
        totalHours,
        signature: signatureData,
      });

      // Submit via email
      await emailTimesheetMutation.mutateAsync({
        ...formData,
        pdfBuffer: pdfBytes,
        totalHours,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit timesheet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
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
    hasEmployee: !!(watchedValues.memberName && watchedValues.memberNumber),
    hasWeekEnding: !!watchedValues.weekEnding,
    hasTimeEntries: totalHours > 0,
    hasRescueCoverage: true,
    hasAcknowledgment: !!watchedValues.acknowledgmentChecked,
    hasSignature: !!(signatureData && signatureData.trim() !== ''),
  });

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-gray-50 flex h-full">
      {/* Loading Overlay */}
      {(isLoading || emailTimesheetMutation.isPending) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="ios-card p-8 text-center max-w-xs">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="ios-body text-muted-foreground">Processing...</p>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <TimesheetSidebar
        sections={sections}
        onSectionClick={handleSectionClick}
        activeSection={activeSection}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-auto pb-6">
          <div className="ios-mobile-spacing">
            <h1 className="ios-title-1 text-foreground mb-6">Weekly Timesheet</h1>
            
            <Form {...form}>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                {/* Employee Selection Section */}
                <div id="section-employee">
                  {!selectedEmployeeNumber ? (
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
                                  const dbEmployee = employeeNumbersQuery.data?.find(emp => emp.employeeNumber === employee.employeeNumber);
                                  const isActive = !dbEmployee || dbEmployee.active !== false;
                                  const searchLower = memberSearchQuery.toLowerCase();
                                  const matchesSearch = searchLower === '' || 
                                    employee.fullName.toLowerCase().includes(searchLower) ||
                                    employee.employeeNumber.toLowerCase().includes(searchLower);
                                  return isActive && matchesSearch;
                                })
                                .sort((a, b) => {
                                  const aLastName = a.lastName || a.fullName.split(' ').pop() || '';
                                  const bLastName = b.lastName || b.fullName.split(' ').pop() || '';
                                  return aLastName.localeCompare(bLastName);
                                })
                                .map((employee) => (
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
                                          Member #{employee.employeeNumber}
                                        </div>
                                      </div>
                                      {selectedEmployeeNumber === employee.employeeNumber && (
                                        <Check className="ml-2 h-5 w-5 text-primary" />
                                      )}
                                    </div>
                                  </Button>
                                ))
                            )}
                            
                            {scheduleQuery.data?.employees
                              ?.filter((employee) => {
                                const dbEmployee = employeeNumbersQuery.data?.find(emp => emp.employeeNumber === employee.employeeNumber);
                                const isActive = !dbEmployee || dbEmployee.active !== false;
                                const searchLower = memberSearchQuery.toLowerCase();
                                const matchesSearch = searchLower === '' || 
                                  employee.fullName.toLowerCase().includes(searchLower) ||
                                  employee.employeeNumber.toLowerCase().includes(searchLower);
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
                  ) : (
                    <Card className="bg-primary/5 border-l-4 border-primary">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="ios-headline" data-testid="heading-selected-member">
                            Selected Member
                          </h2>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowChangeMemberDialog(true)}
                            className="text-sm"
                            data-testid="change-member-button"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Select Different Member
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="ios-body font-medium text-foreground">
                              {scheduleQuery.data?.employees?.find((emp) => emp.employeeNumber === selectedEmployeeNumber)?.fullName}
                            </p>
                            <p className="ios-footnote text-muted-foreground">Member #: {selectedEmployeeNumber}</p>
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
                          const dayShifts = watchedValues[`${key}Shifts` as keyof TimesheetFormData] as DayShift[] || [];
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
                                    {dayTotalHours.toFixed(2)}
                                  </p>
                                </div>
                              </div>

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
                                        onChange={(value) => updateShiftTime(key, index, 'startTime', value)}
                                        placeholder="Select start time"
                                        className="w-full"
                                        type="start"
                                      />
                                    </div>
                                    <div className="col-span-4">
                                      <Label className="text-xs text-gray-600">End Time</Label>
                                      <TimePicker
                                        value={shift.endTime || ""}
                                        onChange={(value) => updateShiftTime(key, index, 'endTime', value)}
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
                                        onClick={() => removeShift(key, index)}
                                        className="h-8 w-8 p-0"
                                        data-testid={`button-remove-${key}-shift-${index}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => addShift(key)}
                                className="w-full mt-2"
                                data-testid={`button-add-${key}-shift`}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Shift
                              </Button>
                            </div>
                          );
                        })}

                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total Weekly Hours:</span>
                            <span className="text-2xl font-bold text-blue-600" data-testid="text-total-weekly-hours">
                              {totalHours.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Rescue Coverage Section */}
                {selectedEmployeeNumber && watchedValues.weekEnding && (
                  <div id="section-rescue">
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="ios-headline mb-4">Rescue Coverage</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          Check the days you provided rescue coverage (optional).
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="rescueCoverageMonday"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
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
                          name="acknowledgmentChecked"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-6">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-acknowledgment"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium text-secondary">
                                  I acknowledge that I have reviewed all times and totals for accuracy
                                </FormLabel>
                                <FormDescription className="text-sm text-muted-foreground">
                                  By checking this box, you confirm that all time entries are correct and complete.
                                </FormDescription>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="signatureData"
                          render={() => (
                            <FormItem>
                              <FormDescription className="text-sm text-muted-foreground mb-4">
                                By signing, I attest that the hours submitted are a complete and accurate record of my time worked.
                              </FormDescription>
                              <FormControl>
                                <SignaturePad
                                  onSignatureChange={(signature) => {
                                    setSignatureData(signature);
                                    setValue("signatureData", signature);
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
                          disabled={submitTimesheetMutation.isPending}
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
                        disabled={isLoading || emailTimesheetMutation.isPending}
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

      {/* Validity Footer */}
      <ValidityFooter
        hasEmployee={!!(watchedValues.memberName && watchedValues.memberNumber)}
        hasWeekEnding={!!watchedValues.weekEnding}
        hasTimeEntries={totalHours > 0}
        hasAcknowledgment={!!watchedValues.acknowledgmentChecked}
        hasSignature={!!(signatureData && signatureData.trim() !== '')}
        totalHours={totalHours}
      />
    </div>
  );
}