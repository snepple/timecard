import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Shield, Edit, Calendar, FileText, Eye, AlertTriangle, CheckCircle, Clock, BarChart3, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SupervisorTimecardForm } from "@/components/SupervisorTimecardForm";
import { EmployeeMonthActivityDialog } from "@/components/EmployeeMonthActivityDialog";

interface WeeklyRescueData {
  weekNumber: number;
  weekLabel: string;
  dateLabel: string;
  weekEnding: string;
  sunday: number;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  totalShifts: number;
  hasTimecard: boolean;
  timecardStatus: 'complete' | 'missing' | 'pending';
  dataSource: 'timecard' | 'schedule';
  isEdited?: boolean;
  timesheetId?: string;
  scheduledRescueCounts?: {
    sunday: number;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
  };
  rescueDeviations?: Record<string, boolean>;
  daysInMonth?: {
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  };
}

interface RescueCoverageEmployee {
  employeeName: string;
  employeeNumber: string;
  weeks: WeeklyRescueData[];
  monthlyTotals: {
    sunday: number;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    total: number;
  };
}

interface RescueCoverageReportData {
  year: number;
  month: number;
  monthName: string;
  employees: RescueCoverageEmployee[];
  grandTotals: {
    sunday: number;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    total: number;
  };
  dayOverlaps: {
    sunday: Record<string, string[]>;
    monday: Record<string, string[]>;
    tuesday: Record<string, string[]>;
    wednesday: Record<string, string[]>;
    thursday: Record<string, string[]>;
    friday: Record<string, string[]>;
    saturday: Record<string, string[]>;
  };
}

export function RescueCoverageReport() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [editingEmployee, setEditingEmployee] = useState<{ employeeName: string; employeeNumber: string; weekEnding: string } | null>(null);
  const [showActivityLog, setShowActivityLog] = useState<{ employeeName: string; employeeNumber: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: reportData, isLoading, error } = useQuery<RescueCoverageReportData>({
    queryKey: ['/api/admin/rescue-coverage-report', selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await fetch(`/api/admin/rescue-coverage-report/${selectedYear}/${selectedMonth}`);
      if (!response.ok) {
        throw new Error('Failed to fetch rescue coverage report');
      }
      return response.json();
    }
  });

  // Generate year options (current year + previous 2 years)
  const yearOptions = [];
  for (let i = 0; i < 3; i++) {
    yearOptions.push(currentDate.getFullYear() - i);
  }

  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const handleExportExcel = async () => {
    if (!reportData?.employees) return;

    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      
      // Create worksheet data
      const worksheetData = [];
      
      // Add headers
      worksheetData.push(['Employee Name', 'Employee #', 'Week', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Total Shifts', 'Source']);
      
      // Add data rows
      reportData.employees.forEach(emp => {
        emp.weeks?.forEach(week => {
          worksheetData.push([
            emp.employeeName,
            emp.employeeNumber,
            week.weekLabel,
            week.sunday || 0,
            week.monday || 0,
            week.tuesday || 0,
            week.wednesday || 0,
            week.thursday || 0,
            week.friday || 0,
            week.saturday || 0,
            week.totalShifts,
            week.hasTimecard ? 'Timecard' : 'Schedule'
          ]);
        });
        
        // Add employee totals row
        worksheetData.push([
          `${emp.employeeName} - TOTALS`,
          '',
          '',
          emp.monthlyTotals?.sunday || 0,
          emp.monthlyTotals?.monday || 0,
          emp.monthlyTotals?.tuesday || 0,
          emp.monthlyTotals?.wednesday || 0,
          emp.monthlyTotals?.thursday || 0,
          emp.monthlyTotals?.friday || 0,
          emp.monthlyTotals?.saturday || 0,
          emp.monthlyTotals?.total || 0,
          ''
        ]);
        
        // Add empty row for separation
        worksheetData.push([]);
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rescue Coverage');
      
      // Download the file
      XLSX.writeFile(workbook, `rescue-coverage-${reportData.monthName}-${reportData.year}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const handleViewPDF = async (employeeNumber: string, weekEnding: string, employeeName: string) => {
    try {
      // Find the timesheet for this employee and week
      const response = await fetch(`/api/timesheets`);
      if (!response.ok) {
        throw new Error('Failed to fetch timesheets');
      }
      
      const timesheets = await response.json();
      const timesheet = timesheets.find((ts: any) => 
        (ts.employeeNumber === employeeNumber || ts.employeeName === employeeName) && 
        ts.weekEnding === weekEnding
      );
      
      if (!timesheet) {
        console.error('Timesheet not found');
        return;
      }
      
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
    }
  };

  const handleViewOriginalPDF = async (employeeNumber: string, weekEnding: string, employeeName: string) => {
    try {
      // Find the timesheet for this employee and week
      const response = await fetch(`/api/timesheets`);
      if (!response.ok) {
        throw new Error('Failed to fetch timesheets');
      }
      
      const timesheets = await response.json();
      const timesheet = timesheets.find((ts: any) => 
        (ts.employeeNumber === employeeNumber || ts.employeeName === employeeName) && 
        ts.weekEnding === weekEnding
      );
      
      if (!timesheet) {
        console.error('Timesheet not found');
        return;
      }
      
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

  const renderDayCell = (week: WeeklyRescueData, day: keyof WeeklyRescueData, dayName: string) => {
    const dayValue = week[day] as number;
    const hasDeviation = week.rescueDeviations?.[dayName];
    const scheduledValue = week.scheduledRescueCounts?.[dayName as keyof typeof week.scheduledRescueCounts];
    const isDayInMonth = week.daysInMonth?.[dayName as keyof typeof week.daysInMonth] ?? true;
    
    // Calculate the actual date for this day
    const dayOfWeekMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const dayOffset = dayOfWeekMap[dayName as keyof typeof dayOfWeekMap];
    const weekEndingDate = new Date(week.weekEnding + 'T00:00:00'); // Ensure proper parsing as local date
    
    // The week ending is Saturday (day 6), so we need to go back to Sunday (day 0)
    // Saturday minus 6 days = Sunday
    const sundayDate = new Date(weekEndingDate);
    sundayDate.setDate(weekEndingDate.getDate() - 6);
    
    // Now add the day offset to get the specific day
    const currentDayDate = new Date(sundayDate);
    currentDayDate.setDate(sundayDate.getDate() + dayOffset);
    const dayNumber = currentDayDate.getDate();
    const dateKey = currentDayDate.toISOString().split('T')[0];
    
    // Check for overlaps using the reportData
    const overlappingEmployees = reportData?.dayOverlaps?.[dayName as keyof typeof reportData.dayOverlaps]?.[dateKey] || [];
    const hasOverlap = overlappingEmployees.length > 1;
    
    return (
      <TableCell className={`text-center relative ${!isDayInMonth ? 'opacity-30 bg-gray-50' : ''}`}>
        <div className="flex items-center justify-center space-x-1">
          {dayValue > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center space-x-1">
                    {week.dataSource === 'timecard' ? (
                      <FileText className={`h-3 w-3 ${!isDayInMonth ? 'text-gray-400' : 'text-green-600'}`} />
                    ) : (
                      <Calendar className={`h-3 w-3 ${!isDayInMonth ? 'text-gray-400' : 'text-blue-500'}`} />
                    )}
                    {hasDeviation && isDayInMonth && (
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                    )}
                    {hasOverlap && isDayInMonth && (
                      <div className="relative">
                        <Shield className="h-3 w-3 text-purple-600" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-600 rounded-full text-[8px] text-white flex items-center justify-center">
                          {overlappingEmployees.length}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    {!isDayInMonth && (
                      <p className="text-gray-600 font-medium mb-2">📅 Outside selected month</p>
                    )}
                    <p>{week.dataSource === 'timecard' ? 'From submitted timecard' : 'From schedule'}</p>
                    {hasDeviation && isDayInMonth && (
                      <p className="text-orange-600 font-medium mt-1">
                        ⚠️ Rescue coverage differs from schedule
                      </p>
                    )}
                    {hasOverlap && isDayInMonth && (
                      <div className="mt-2 pt-2 border-t border-purple-200">
                        <p className="text-purple-600 font-medium">🛡️ Multiple employees assigned:</p>
                        <ul className="text-xs mt-1">
                          {overlappingEmployees.map((empName, idx) => (
                            <li key={idx} className="text-purple-700">• {empName}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {week.hasTimecard && week.scheduledRescueCounts && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs">Timecard: {dayValue > 0 ? 'Yes' : 'No'}</p>
                        <p className="text-xs">Scheduled: {scheduledValue && scheduledValue > 0 ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span className={`${hasDeviation && isDayInMonth ? 'text-orange-700 font-medium' : ''} ${!isDayInMonth ? 'text-gray-400' : ''} ${hasOverlap && isDayInMonth ? 'text-purple-700 font-bold' : ''}`}>
            {dayValue > 0 ? dayValue : ''}
          </span>
        </div>
        {/* Date in bottom right corner */}
        <div className="absolute bottom-0 right-1 text-xs text-gray-400 leading-none">
          {dayNumber}
        </div>
      </TableCell>
    );
  };



  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load rescue coverage report. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Rescue Coverage Report</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-36" data-testid="select-month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(month => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24" data-testid="select-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {reportData && (
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Rescue Coverage Shifts - {reportData?.monthName} {reportData?.year}
            </span>
            {reportData && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Total: {reportData.grandTotals?.total || 0} shifts
              </Badge>
            )}
          </CardTitle>
          
          {/* Legend */}
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium mb-2">Legend:</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3 text-green-600" />
                <span>From timecard</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span>From schedule</span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                <span>Differs from schedule</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="relative">
                  <Shield className="h-3 w-3 text-purple-600" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-600 rounded-full text-[6px] text-white flex items-center justify-center">
                    2
                  </div>
                </div>
                <span>Multiple employees assigned</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading rescue coverage report...</span>
            </div>
          ) : reportData?.employees ? (
            <div className="space-y-6">

              {/* Summary Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Monthly Summary</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold text-center">Total Shifts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.employees.map((employee) => (
                      <TableRow key={employee.employeeNumber}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => {
                              const element = document.getElementById(`employee-${employee.employeeNumber}`);
                              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                            data-testid={`link-employee-${employee.employeeNumber}`}
                          >
                            {employee.employeeName}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {employee.monthlyTotals.total}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Grand Total Row */}
                    <TableRow className="border-t-2 bg-gray-50">
                      <TableCell className="font-bold text-gray-900">
                        Grand Total
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-blue-600 text-white">
                          {reportData.grandTotals?.total || 0}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Weekly Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Weekly Breakdown</h3>
                <Alert className="mb-4">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    This report shows weekly rescue coverage shifts by member for {reportData.monthName} {reportData.year}. Each row represents one week.
                  </AlertDescription>
                </Alert>
                {reportData.employees.map((employee, employeeIndex) => (
                <div key={`${employee.employeeName}-${employee.employeeNumber}`} className="space-y-2" id={`employee-${employee.employeeNumber}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{employee.employeeName}</h3>
                  </div>
                  
                  <Table className="border">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold w-32">Week</TableHead>
                        <TableHead className="font-semibold text-center w-16">Sun</TableHead>
                        <TableHead className="font-semibold text-center w-16">Mon</TableHead>
                        <TableHead className="font-semibold text-center w-16">Tue</TableHead>
                        <TableHead className="font-semibold text-center w-16">Wed</TableHead>
                        <TableHead className="font-semibold text-center w-16">Thu</TableHead>
                        <TableHead className="font-semibold text-center w-16">Fri</TableHead>
                        <TableHead className="font-semibold text-center w-16">Sat</TableHead>
                        <TableHead className="font-semibold text-center w-24">Total Shifts</TableHead>
                        <TableHead className="font-semibold text-center w-32">PDF Timesheet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.weeks?.map((week, weekIndex) => (
                        <TableRow key={`${employee.employeeNumber}-week-${week.weekNumber}`}>
                          <TableCell className="font-medium text-sm">
                            <div>{week.weekLabel}</div>
                            <div className="text-xs text-muted-foreground">({week.dateLabel})</div>
                          </TableCell>
                          {renderDayCell(week, 'sunday', 'sunday')}
                          {renderDayCell(week, 'monday', 'monday')}
                          {renderDayCell(week, 'tuesday', 'tuesday')}
                          {renderDayCell(week, 'wednesday', 'wednesday')}
                          {renderDayCell(week, 'thursday', 'thursday')}
                          {renderDayCell(week, 'friday', 'friday')}
                          {renderDayCell(week, 'saturday', 'saturday')}
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {week.totalShifts}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col space-y-1">
                              {week.hasTimecard && week.timesheetId ? (
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {week.isEdited ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewPDF(employee.employeeNumber, week.weekEnding, employee.employeeName)}
                                        className="text-xs h-6 px-2 flex items-center space-x-1 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                                        data-testid={`button-view-edited-pdf-${employee.employeeNumber}-week-${week.weekNumber}`}
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>View Edited</span>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewOriginalPDF(employee.employeeNumber, week.weekEnding, employee.employeeName)}
                                        className="text-xs h-6 px-2 flex items-center space-x-1 text-gray-600 hover:text-gray-700 border-gray-200 hover:border-gray-300"
                                        data-testid={`button-view-original-pdf-${employee.employeeNumber}-week-${week.weekNumber}`}
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>View Original</span>
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewPDF(employee.employeeNumber, week.weekEnding, employee.employeeName)}
                                      className="text-xs h-6 px-2 flex items-center space-x-1"
                                      data-testid={`button-view-pdf-${employee.employeeNumber}-week-${week.weekNumber}`}
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View PDF</span>
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2 flex items-center space-x-1 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                                    onClick={() => setEditingEmployee({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                    data-testid={`button-edit-${employee.employeeNumber}-week-${week.weekNumber}`}
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>Edit</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => setShowActivityLog({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                    data-testid={`button-activity-${employee.employeeNumber}-week-${week.weekNumber}`}
                                  >
                                    Activity
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6 px-2 flex items-center space-x-1 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                                  onClick={() => setEditingEmployee({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber, weekEnding: week.weekEnding })}
                                  data-testid={`button-complete-behalf-${employee.employeeNumber}-week-${week.weekNumber}`}
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Complete on behalf</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Employee totals row */}
                      <TableRow className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                        <TableCell className="font-bold">TOTALS</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {employee.monthlyTotals?.sunday || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {employee.monthlyTotals?.monday || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {employee.monthlyTotals?.tuesday || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {employee.monthlyTotals?.wednesday || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {employee.monthlyTotals?.thursday || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {employee.monthlyTotals?.friday || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {employee.monthlyTotals?.saturday || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="bg-blue-700 text-white">
                            {employee.monthlyTotals?.total || 0}
                          </Badge>
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ))}

              {reportData.employees.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No rescue coverage shifts found for {reportData.monthName} {reportData.year}
                </div>
              )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Timecard Edit Dialog */}
      {editingEmployee && (
        <SupervisorTimecardForm
          open={!!editingEmployee}
          onOpenChange={(open) => {
            if (!open) {
              setEditingEmployee(null);
            }
          }}
          employee={{
            employeeName: editingEmployee.employeeName,
            employeeNumber: editingEmployee.employeeNumber,
          }}
          weekEnding={editingEmployee.weekEnding}
          onSuccess={() => {
            // Refresh the report data
            queryClient.invalidateQueries({ queryKey: ['/api/admin/rescue-coverage-report'] });
            setEditingEmployee(null);
          }}
        />
      )}

      {/* Employee Monthly Activity Log Dialog */}
      {showActivityLog && (
        <EmployeeMonthActivityDialog
          employeeName={showActivityLog.employeeName}
          employeeNumber={showActivityLog.employeeNumber}
          year={selectedYear}
          month={selectedMonth}
          monthName={reportData?.monthName || ''}
          open={!!showActivityLog}
          onOpenChange={(open) => {
            if (!open) {
              setShowActivityLog(null);
            }
          }}
        />
      )}
    </div>
  );
}