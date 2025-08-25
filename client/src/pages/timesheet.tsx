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
import { useToast } from "@/hooks/use-toast";
import { calculateHours, populateWeekDates } from "@/lib/time-calculations";
import { generateTimeSheetPDF } from "@/lib/pdf-generator";
import { apiRequest } from "@/lib/queryClient";
import SignaturePad from "@/components/ui/signature-pad";
import { getCurrentWeekEndingDate, isSaturday, getNextSaturday, getPreviousSaturday } from "@/lib/date-utils";
import { Flame, User, IdCard, Calendar, Save, Mail, Printer, HelpCircle, Users, RefreshCw, Send, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

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
  
  signatureData: z.string().optional(),
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

export default function TimesheetPage() {
  const { toast } = useToast();
  const [signatureData, setSignatureData] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState<string>("");
  const [currentTimesheet, setCurrentTimesheet] = useState<any>(null);

  // Fetch schedule data (employees and shifts)
  const scheduleQuery = useQuery<ScheduleData>({
    queryKey: ['/api/schedule'],
    staleTime: 1000 * 60 * 60, // 1 hour
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

  // Save to localStorage
  useEffect(() => {
    const subscription = watch((value) => {
      if (value.employeeName || value.employeeNumber) {
        localStorage.setItem("timesheet-draft", JSON.stringify(value));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("timesheet-draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach((key) => {
          if (parsed[key] !== undefined && parsed[key] !== "") {
            setValue(key as keyof TimesheetFormData, parsed[key]);
          }
        });
        if (parsed.selectedEmployee) {
          setSelectedEmployeeNumber(parsed.selectedEmployee);
        }
        toast({
          title: "Draft loaded",
          description: "Your previous timesheet draft has been loaded.",
        });
      } catch (error) {
        console.error("Error loading saved draft:", error);
      }
    }
  }, [setValue, toast]);

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
      
      // Populate from shifts
      shifts.forEach((shift) => {
        // Use the date string directly to avoid timezone issues
        const shiftDate = new Date(shift.date + 'T12:00:00'); // Add noon time to avoid timezone edge cases
        const dayOfWeek = shiftDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayKey = DAYS_OF_WEEK[dayOfWeek]?.key;
        
        if (dayKey) {
          // Check if this is a night duty shift for rescue coverage
          if (shift.position && shift.position.toLowerCase().includes('night duty')) {
            // Mark rescue coverage for weeknights only (Monday-Thursday)
            if (dayKey === 'monday') setValue("rescueCoverageMonday", true);
            else if (dayKey === 'tuesday') setValue("rescueCoverageTuesday", true);
            else if (dayKey === 'wednesday') setValue("rescueCoverageWednesday", true);
            else if (dayKey === 'thursday') setValue("rescueCoverageThursday", true);
          } else {
            // Regular shift - populate daily time entry
            // Convert UTC times to local time strings
            const startTime = new Date(shift.startTime);
            const endTime = new Date(shift.endTime);
            
            // Use proper locale time formatting to handle timezone conversion
            const startTimeStr = startTime.toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'America/New_York' // Eastern time for Oakland
            });
            const endTimeStr = endTime.toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'America/New_York'
            });
            
            setValue(`${dayKey}StartTime` as keyof TimesheetFormData, startTimeStr);
            setValue(`${dayKey}EndTime` as keyof TimesheetFormData, endTimeStr);
            setValue(`${dayKey}TotalHours` as keyof TimesheetFormData, shift.duration);
          }
        }
      });
      
      toast({
        title: "Schedule loaded",
        description: `Populated timecard from ${shifts.length} scheduled shifts.`,
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
      setValue("employeeNumber", employee.employeeNumber);
      
      // Auto-populate from schedule if week ending is set
      const weekEnding = getValues("weekEnding");
      if (weekEnding) {
        autoPopulateFromSchedule(employeeNumber, weekEnding);
      }
    }
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

  const saveTimesheetMutation = useMutation({
    mutationFn: async (data: TimesheetFormData) => {
      const response = await apiRequest("POST", "/api/timesheets", {
        ...data,
        signatureData: signatureData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentTimesheet(data);
      toast({
        title: "Success",
        description: "Timesheet saved successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save timesheet. Please try again.",
        variant: "destructive",
      });
    },
  });

  const emailTimesheetMutation = useMutation({
    mutationFn: async (data: { pdfBuffer: string; employeeName: string; weekEnding: string }) => {
      const response = await apiRequest("POST", "/api/timesheets/email", {
        to: "bonnie@oaklandfire.gov",
        employeeName: data.employeeName,
        weekEnding: data.weekEnding,
        pdfBuffer: data.pdfBuffer,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet emailed to Bonnie successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to email timesheet. Please try again.",
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

  const handleSave = () => {
    const formData = getValues();
    saveTimesheetMutation.mutate({
      ...formData,
      signatureData,
    });
  };

  const handleSubmitForApproval = () => {
    if (!currentTimesheet?.id) {
      toast({
        title: "Save Required",
        description: "Please save the timesheet first before submitting for approval.",
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

    setIsLoading(true);
    try {
      const pdfBuffer = await generateTimeSheetPDF({
        ...formData,
        signatureData,
      });
      
      emailTimesheetMutation.mutate({
        pdfBuffer: pdfBuffer,
        employeeName: formData.employeeName,
        weekEnding: formData.weekEnding,
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

    setIsLoading(true);
    try {
      const pdfBuffer = await generateTimeSheetPDF({
        ...formData,
        signatureData,
      });
      
      // Create blob and trigger download
      const blob = new Blob([Buffer.from(pdfBuffer, 'base64')], { type: 'application/pdf' });
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

  const handleAutoFillDates = () => {
    const weekEnding = getValues("weekEnding");
    if (!weekEnding) {
      toast({
        title: "Error",
        description: "Please select a week ending date first.",
        variant: "destructive",
      });
      return;
    }

    const dates = populateWeekDates(weekEnding);
    DAYS_OF_WEEK.forEach(({ key }, index) => {
      setValue(`${key}Date` as keyof TimesheetFormData, dates[index]);
    });

    toast({
      title: "Success",
      description: "Week dates auto-filled successfully!",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Loading Overlay */}
      {(isLoading || saveTimesheetMutation.isPending || emailTimesheetMutation.isPending) && (
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
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-blue-700 rounded-full text-white"
              data-testid="button-help"
            >
              <HelpCircle className="text-xl" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
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
                  Select Employee from Schedule
                  {scheduleQuery.isLoading && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
                </Label>
                <Select 
                  value={selectedEmployeeNumber} 
                  onValueChange={handleEmployeeSelect}
                  disabled={scheduleQuery.isLoading || !scheduleQuery.data?.employees?.length}
                >
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder="Choose an employee from the schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleQuery.data?.employees?.map((employee) => (
                      <SelectItem key={employee.employeeNumber} value={employee.employeeNumber}>
                        {employee.fullName} (#{employee.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {scheduleQuery.error && (
                  <p className="text-sm text-destructive mt-1">
                    Failed to load employee schedule. Manual entry available below.
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeName" className="flex items-center mb-2">
                    <User className="text-primary mr-2 h-4 w-4" />
                    Name
                  </Label>
                  <Input
                    id="employeeName"
                    placeholder="Enter full name"
                    {...form.register("employeeName")}
                    data-testid="input-employee-name"
                  />
                </div>
                <div>
                  <Label htmlFor="employeeNumber" className="flex items-center mb-2">
                    <IdCard className="text-primary mr-2 h-4 w-4" />
                    Employee Number
                  </Label>
                  <Input
                    id="employeeNumber"
                    placeholder="Enter employee number"
                    {...form.register("employeeNumber")}
                    data-testid="input-employee-number"
                  />
                </div>
              </div>
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
                <Button
                  type="button"
                  onClick={handleAutoFillDates}
                  className="h-fit"
                  data-testid="button-auto-fill-dates"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Auto-Fill Dates
                </Button>
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
                    <Input
                      type="time"
                      {...form.register(`${key}StartTime` as keyof TimesheetFormData)}
                      className="mt-1 text-sm"
                      data-testid={`input-${key}-start-time`}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Label className="text-sm font-medium text-secondary">End Time</Label>
                    <Input
                      type="time"
                      {...form.register(`${key}EndTime` as keyof TimesheetFormData)}
                      className="mt-1 text-sm"
                      data-testid={`input-${key}-end-time`}
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
              <p className="text-sm text-gray-600 mb-4">
                ***Weeknight Rescue Coverage will be paid out in monthly check***
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
                      <Checkbox
                        {...form.register(key as keyof TimesheetFormData)}
                        className="w-5 h-5"
                        data-testid={`checkbox-${key}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Digital Signature Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4" data-testid="heading-signature">
                Digital Signature
              </h2>
              <SignaturePad
                onSignatureChange={setSignatureData}
                data-testid="signature-pad"
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
              variant="secondary"
              onClick={handleSave}
              disabled={saveTimesheetMutation.isPending}
              data-testid="button-save"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
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
              Email to Bonnie
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
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">© 2024 Oakland Fire-Rescue Department</p>
          <p className="text-xs text-gray-500 mt-1">Timesheet Application v1.0</p>
        </div>
      </footer>
    </div>
  );
}
