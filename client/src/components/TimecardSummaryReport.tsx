import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeekPicker } from "@/components/ui/week-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Calendar, AlertCircle, CheckCircle2, Eye, Download, UserPlus, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SupervisorTimecardForm } from "./SupervisorTimecardForm";
import { SupervisorEditTimecardForm } from "./SupervisorEditTimecardForm";

interface TimecardSummaryData {
  employeeName: string;
  employeeNumber: string;
  hasTimesheet: boolean;
  timesheetId?: string;
  completedBy?: string; // "employee", "supervisor", or null
  isEdited?: boolean; // Whether timecard was edited by supervisor
  editedBy?: string; // Who edited the timecard
  editedAt?: string; // When it was edited
  sunday: number;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  shiftTimes: {
    sunday: string[];
    monday: string[];
    tuesday: string[];
    wednesday: string[];
    thursday: string[];
    friday: string[];
    saturday: string[];
  };
}

interface TimecardSummaryResponse {
  summary: TimecardSummaryData[];
  weekEnding: string;
}

// Helper function to get current week ending (Saturday)
function getCurrentWeekEnding(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSaturday = (6 - dayOfWeek) % 7;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSaturday);
  return saturday.toISOString().split('T')[0];
}

export function TimecardSummaryReport() {
  const [selectedWeekEnding, setSelectedWeekEnding] = useState<string>("");
  const [supervisorFormOpen, setSupervisorFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{
    employeeName: string;
    employeeNumber: string;
    timesheetId?: string;
  } | null>(null);
  
  // Set default week ending to current week on component mount
  useEffect(() => {
    if (!selectedWeekEnding) {
      setSelectedWeekEnding(getCurrentWeekEnding());
    }
  }, []);

  // Fetch timecard summary data
  const summaryQuery = useQuery<TimecardSummaryResponse>({
    queryKey: ['/api/admin/timecard-summary', selectedWeekEnding],
    enabled: !!selectedWeekEnding,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleViewPDF = async (timesheetId: string, employeeName: string) => {
    try {
      // Fetch timesheet data
      const response = await fetch(`/api/timesheets/${timesheetId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch timesheet data');
      }
      
      const timesheet = await response.json();
      
      // Import the PDF generator
      const { generateTimeSheetPDF } = await import('../lib/pdf-generator');
      
      // Convert timesheet data to PDF format
      const pdfData = {
        employeeName: timesheet.employeeName,
        employeeNumber: timesheet.employeeNumber,
        weekEnding: timesheet.weekEnding,
        
        sundayDate: timesheet.sundayDate,
        sundayTotalHours: parseFloat(timesheet.sundayTotalHours || '0'),
        
        mondayDate: timesheet.mondayDate,
        mondayTotalHours: parseFloat(timesheet.mondayTotalHours || '0'),
        
        tuesdayDate: timesheet.tuesdayDate,
        tuesdayTotalHours: parseFloat(timesheet.tuesdayTotalHours || '0'),
        
        wednesdayDate: timesheet.wednesdayDate,
        wednesdayTotalHours: parseFloat(timesheet.wednesdayTotalHours || '0'),
        
        thursdayDate: timesheet.thursdayDate,
        thursdayTotalHours: parseFloat(timesheet.thursdayTotalHours || '0'),
        
        fridayDate: timesheet.fridayDate,
        fridayTotalHours: parseFloat(timesheet.fridayTotalHours || '0'),
        
        saturdayDate: timesheet.saturdayDate,
        saturdayTotalHours: parseFloat(timesheet.saturdayTotalHours || '0'),
        
        totalWeeklyHours: parseFloat(timesheet.totalWeeklyHours || '0'),
        
        rescueCoverageMonday: timesheet.rescueCoverageMonday,
        rescueCoverageTuesday: timesheet.rescueCoverageTuesday,
        rescueCoverageWednesday: timesheet.rescueCoverageWednesday,
        rescueCoverageThursday: timesheet.rescueCoverageThursday,
        
        signatureData: timesheet.signatureData,
        completedBy: timesheet.completedBy || 'employee',
        
        // Edit tracking information
        isEdited: timesheet.isEdited || false,
        editedBy: timesheet.editedBy,
        editedAt: timesheet.editedAt,
      };

      // Generate PDF
      const pdfDataUrl = await generateTimeSheetPDF(pdfData);
      
      // Convert to blob and open
      const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to original approach if available
      const pdfUrl = `/api/timesheet/${timesheetId}/pdf`;
      window.open(pdfUrl, '_blank');
    }
  };

  const handleExportExcel = () => {
    if (!selectedWeekEnding) {
      return;
    }
    // Download Excel file
    const exportUrl = `/api/admin/timecard-summary/${selectedWeekEnding}/export`;
    window.open(exportUrl, '_blank');
  };

  const handleCompleteOnBehalf = (employee: TimecardSummaryData) => {
    setSelectedEmployee({
      employeeName: employee.employeeName,
      employeeNumber: employee.employeeNumber,
    });
    setSupervisorFormOpen(true);
  };

  const handleEditTimecard = (employee: TimecardSummaryData) => {
    setSelectedEmployee({
      employeeName: employee.employeeName,
      employeeNumber: employee.employeeNumber,
      timesheetId: employee.timesheetId,
    });
    setEditFormOpen(true);
  };

  const handleViewOriginalPDF = async (timesheetId: string, employeeName: string) => {
    try {
      // Fetch timesheet data
      const response = await fetch(`/api/timesheets/${timesheetId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch timesheet data');
      }
      
      const timesheet = await response.json();
      
      // Parse original timesheet data from JSON backup
      let originalData;
      try {
        originalData = JSON.parse(timesheet.originalTimesheetData || '{}');
      } catch {
        console.error('Failed to parse original timesheet data');
        return;
      }
      
      // Import the PDF generator
      const { generateTimeSheetPDF } = await import('../lib/pdf-generator');
      
      // Convert original timesheet data to PDF format
      const pdfData = {
        employeeName: originalData.employeeName,
        employeeNumber: originalData.employeeNumber,
        weekEnding: originalData.weekEnding,
        
        sundayDate: originalData.sundayDate,
        sundayTotalHours: parseFloat(originalData.sundayTotalHours || '0'),
        
        mondayDate: originalData.mondayDate,
        mondayTotalHours: parseFloat(originalData.mondayTotalHours || '0'),
        
        tuesdayDate: originalData.tuesdayDate,
        tuesdayTotalHours: parseFloat(originalData.tuesdayTotalHours || '0'),
        
        wednesdayDate: originalData.wednesdayDate,
        wednesdayTotalHours: parseFloat(originalData.wednesdayTotalHours || '0'),
        
        thursdayDate: originalData.thursdayDate,
        thursdayTotalHours: parseFloat(originalData.thursdayTotalHours || '0'),
        
        fridayDate: originalData.fridayDate,
        fridayTotalHours: parseFloat(originalData.fridayTotalHours || '0'),
        
        saturdayDate: originalData.saturdayDate,
        saturdayTotalHours: parseFloat(originalData.saturdayTotalHours || '0'),
        
        totalWeeklyHours: parseFloat(originalData.totalWeeklyHours || '0'),
        
        rescueCoverageMonday: originalData.rescueCoverageMonday,
        rescueCoverageTuesday: originalData.rescueCoverageTuesday,
        rescueCoverageWednesday: originalData.rescueCoverageWednesday,
        rescueCoverageThursday: originalData.rescueCoverageThursday,
        
        signatureData: originalData.signatureData,
        completedBy: originalData.completedBy || 'employee',
        
        // Mark as original version
        isOriginal: true,
      };

      // Generate PDF
      const pdfDataUrl = await generateTimeSheetPDF(pdfData);
      
      // Convert to blob and open
      const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating original PDF:', error);
    }
  };

  // Function to generate day headers with dates
  const getDayHeader = (weekEnding: string, dayOffset: number) => {
    const endDate = new Date(weekEnding);
    const targetDate = new Date(endDate);
    targetDate.setDate(endDate.getDate() - (6 - dayOffset)); // Sunday is 0, Saturday is 6
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[dayOffset];
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    
    return (
      <div className="text-center">
        <div className="font-medium">{dayName}</div>
        <div className="text-xs text-muted-foreground">{month}/{day}</div>
      </div>
    );
  };

  const formatHours = (hours: number) => {
    return hours === 0 ? "-" : hours.toString();
  };

  // Helper function to parse time string into 24-hour format for sorting
  const parseTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2}):?(\d{0,2})\s*(a|p|am|pm)?/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2] || '0');
    const period = (match[3] || '').toLowerCase();
    
    // Convert to 24-hour format
    if (period.includes('p') && hours !== 12) {
      hours += 12;
    } else if (period.includes('a') && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  };

  // Helper function to sort and combine consecutive shifts
  const processSortedShifts = (shiftTimes: string[]): string[] => {
    if (!shiftTimes || shiftTimes.length === 0) return [];
    
    // Parse shifts into start/end times
    const shifts = shiftTimes.map(timeRange => {
      const [startStr, endStr] = timeRange.split(' - ');
      return {
        original: timeRange,
        startTime: startStr?.trim() || '',
        endTime: endStr?.trim() || '',
        startMinutes: parseTimeToMinutes(startStr?.trim() || ''),
        endMinutes: parseTimeToMinutes(endStr?.trim() || '')
      };
    }).filter(shift => shift.startTime && shift.endTime);
    
    if (shifts.length === 0) return [];
    
    // Sort by start time
    shifts.sort((a, b) => a.startMinutes - b.startMinutes);
    
    // Combine consecutive back-to-back shifts
    const combined = [];
    let currentShift = shifts[0];
    
    for (let i = 1; i < shifts.length; i++) {
      const nextShift = shifts[i];
      
      // Check if shifts are back-to-back (current end time = next start time)
      if (currentShift.endMinutes === nextShift.startMinutes) {
        // Combine shifts - keep start time of current, end time of next
        currentShift = {
          ...currentShift,
          endTime: nextShift.endTime,
          endMinutes: nextShift.endMinutes,
          original: `${currentShift.startTime} - ${nextShift.endTime}`
        };
      } else {
        // Not consecutive, add current shift and start new one
        combined.push(`${currentShift.startTime} - ${currentShift.endTime}`);
        currentShift = nextShift;
      }
    }
    
    // Add the last shift
    combined.push(`${currentShift.startTime} - ${currentShift.endTime}`);
    
    return combined;
  };

  const renderHoursWithTooltip = (hours: number, shiftTimes: string[], day: string) => {
    if (hours === 0) {
      return <span className="text-gray-400">-</span>;
    }

    if (!shiftTimes || shiftTimes.length === 0) {
      return <span>{hours}</span>;
    }

    const processedShifts = processSortedShifts(shiftTimes);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help underline decoration-dotted underline-offset-2">
              {hours}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-sm">
              <div className="font-medium mb-1">
                {day.charAt(0).toUpperCase() + day.slice(1)} Shifts:
              </div>
              {processedShifts.map((time, index) => (
                <div key={index} className="text-xs">
                  {time}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getRowClassName = (hasTimesheet: boolean) => {
    return hasTimesheet ? "" : "bg-orange-50 dark:bg-orange-900/20";
  };

  const getStatusBadge = (hasTimesheet: boolean, completedBy?: string, isEdited?: boolean) => {
    if (hasTimesheet) {
      if (isEdited) {
        return (
          <Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
            <Edit className="w-3 h-3 mr-1" />
            Edited by Supervisor
          </Badge>
        );
      } else if (completedBy === 'supervisor') {
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            <UserPlus className="w-3 h-3 mr-1" />
            Completed by Supervisor
          </Badge>
        );
      } else {
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Submitted
          </Badge>
        );
      }
    } else {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Scheduled
        </Badge>
      );
    }
  };

  const completedCount = summaryQuery.data?.summary.filter(emp => emp.hasTimesheet).length || 0;
  const scheduledCount = summaryQuery.data?.summary.filter(emp => !emp.hasTimesheet).length || 0;
  const totalEmployees = (summaryQuery.data?.summary.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <FileText className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Timecard Summary Report</h2>
      </div>

      {/* Week Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Select Week</span>
          </CardTitle>
          <CardDescription>
            Choose the week ending date to view timecard summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeekPicker
            value={selectedWeekEnding}
            onChange={setSelectedWeekEnding}
            placeholder="Select week ending date"
            className="w-full max-w-md"
          />
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summaryQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{completedCount}</p>
                  <p className="text-sm text-muted-foreground">Submitted Timesheets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{scheduledCount}</p>
                  <p className="text-sm text-muted-foreground">Scheduled Only</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{totalEmployees}</p>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      {summaryQuery.data && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-medium">Legend:</span>
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Submitted
                </Badge>
                <span className="text-sm">Employee completed timesheet</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  <UserPlus className="w-3 h-3 mr-1" />
                  Completed by Supervisor
                </Badge>
                <span className="text-sm">Supervisor completed on behalf of employee</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Scheduled
                </Badge>
                <span className="text-sm">Hours from schedule (no timesheet submitted)</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {summaryQuery.isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading timecard summary...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {summaryQuery.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load timecard summary. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Table */}
      {summaryQuery.data && summaryQuery.data.summary.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Week Ending {new Date(summaryQuery.data.weekEnding).toLocaleDateString()}</CardTitle>
                <CardDescription>
                  Timecard summary for all employees scheduled during this week
                </CardDescription>
              </div>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="flex items-center space-x-2"
                data-testid="button-export-excel"
              >
                <Download className="w-4 h-4" />
                <span>Export to Excel</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Employee Name</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">{getDayHeader(summaryQuery.data.weekEnding, 0)}</TableHead>
                    <TableHead className="text-center">{getDayHeader(summaryQuery.data.weekEnding, 1)}</TableHead>
                    <TableHead className="text-center">{getDayHeader(summaryQuery.data.weekEnding, 2)}</TableHead>
                    <TableHead className="text-center">{getDayHeader(summaryQuery.data.weekEnding, 3)}</TableHead>
                    <TableHead className="text-center">{getDayHeader(summaryQuery.data.weekEnding, 4)}</TableHead>
                    <TableHead className="text-center">{getDayHeader(summaryQuery.data.weekEnding, 5)}</TableHead>
                    <TableHead className="text-center">{getDayHeader(summaryQuery.data.weekEnding, 6)}</TableHead>
                    <TableHead className="text-center">Total Hours</TableHead>
                    <TableHead className="text-center">PDF Timesheet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryQuery.data.summary
                    .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
                    .map((employee) => (
                      <TableRow 
                        key={employee.employeeNumber} 
                        className={getRowClassName(employee.hasTimesheet)}
                      >
                        <TableCell className="font-medium">
                          {employee.employeeName}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(employee.hasTimesheet, employee.completedBy, employee.isEdited)}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderHoursWithTooltip(employee.sunday, employee.shiftTimes?.sunday, 'sunday')}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderHoursWithTooltip(employee.monday, employee.shiftTimes?.monday, 'monday')}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderHoursWithTooltip(employee.tuesday, employee.shiftTimes?.tuesday, 'tuesday')}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderHoursWithTooltip(employee.wednesday, employee.shiftTimes?.wednesday, 'wednesday')}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderHoursWithTooltip(employee.thursday, employee.shiftTimes?.thursday, 'thursday')}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderHoursWithTooltip(employee.friday, employee.shiftTimes?.friday, 'friday')}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderHoursWithTooltip(employee.saturday, employee.shiftTimes?.saturday, 'saturday')}
                        </TableCell>
                        <TableCell className="text-center font-medium min-w-[120px]">
                          <div>
                            {formatHours(employee.totalHours)}
                            {employee.totalHours > 0 && (
                              <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                                Reg: {employee.regularHours} / OT: {employee.overtimeHours}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {employee.hasTimesheet && employee.timesheetId ? (
                            <div className="flex gap-1 justify-center flex-wrap">
                              {employee.isEdited ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewPDF(employee.timesheetId!, employee.employeeName)}
                                    className="flex items-center space-x-1 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                                    data-testid={`button-view-edited-pdf-${employee.employeeNumber}`}
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View Edited</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewOriginalPDF(employee.timesheetId!, employee.employeeName)}
                                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 border-gray-200 hover:border-gray-300"
                                    data-testid={`button-view-original-pdf-${employee.employeeNumber}`}
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View Original</span>
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewPDF(employee.timesheetId!, employee.employeeName)}
                                  className="flex items-center space-x-1"
                                  data-testid={`button-view-pdf-${employee.employeeNumber}`}
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View PDF</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTimecard(employee)}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                                data-testid={`button-edit-timecard-${employee.employeeNumber}`}
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompleteOnBehalf(employee)}
                              className="flex items-center space-x-1 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                              data-testid={`button-complete-behalf-${employee.employeeNumber}`}
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Complete on behalf</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {summaryQuery.data && summaryQuery.data.summary.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No data found</p>
              <p className="text-sm text-muted-foreground">
                No employees were scheduled for the selected week.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supervisor Timecard Form */}
      {selectedEmployee && (
        <SupervisorTimecardForm
          open={supervisorFormOpen}
          onOpenChange={setSupervisorFormOpen}
          employee={selectedEmployee}
          weekEnding={selectedWeekEnding}
          onSuccess={() => {
            // Refresh the summary data
            summaryQuery.refetch();
          }}
        />
      )}

      {/* Supervisor Edit Timecard Form */}
      {selectedEmployee && selectedEmployee.timesheetId && (
        <SupervisorEditTimecardForm
          open={editFormOpen}
          onOpenChange={setEditFormOpen}
          employee={selectedEmployee}
          weekEnding={selectedWeekEnding}
          onSuccess={() => {
            // Refresh the summary data
            summaryQuery.refetch();
          }}
        />
      )}
    </div>
  );
}