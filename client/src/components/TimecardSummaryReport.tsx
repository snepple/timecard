import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeekPicker } from "@/components/ui/week-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Calendar, AlertCircle, CheckCircle2, Eye, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimecardSummaryData {
  employeeName: string;
  employeeNumber: string;
  hasTimesheet: boolean;
  timesheetId?: string;
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

  const handleViewPDF = (timesheetId: string, employeeName: string) => {
    // Generate PDF for the specific timesheet
    const pdfUrl = `/api/timesheet/${timesheetId}/pdf`;
    window.open(pdfUrl, '_blank');
  };

  const handleExportExcel = () => {
    if (!selectedWeekEnding) {
      return;
    }
    // Download Excel file
    const exportUrl = `/api/admin/timecard-summary/${selectedWeekEnding}/export`;
    window.open(exportUrl, '_blank');
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

  const renderHoursWithTooltip = (hours: number, shiftTimes: string[], day: string) => {
    if (hours === 0) {
      return <span className="text-gray-400">-</span>;
    }

    if (!shiftTimes || shiftTimes.length === 0) {
      return <span>{hours}</span>;
    }

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
              {shiftTimes.map((time, index) => (
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

  const getStatusBadge = (hasTimesheet: boolean) => {
    if (hasTimesheet) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Submitted
        </Badge>
      );
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
                          {getStatusBadge(employee.hasTimesheet)}
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
                        <TableCell className="text-center font-medium">
                          <div>
                            {formatHours(employee.totalHours)}
                            {employee.totalHours > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Reg: {employee.regularHours} / OT: {employee.overtimeHours}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {employee.hasTimesheet && employee.timesheetId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPDF(employee.timesheetId!, employee.employeeName)}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View PDF</span>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not Available</span>
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
    </div>
  );
}