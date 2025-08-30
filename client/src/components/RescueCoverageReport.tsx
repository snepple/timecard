import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Shield, Edit, Calendar, FileText, Eye, AlertTriangle, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SupervisorTimecardForm } from "@/components/SupervisorTimecardForm";
import { EmployeeMonthActivityDialog } from "@/components/EmployeeMonthActivityDialog";

interface WeeklyRescueData {
  weekNumber: number;
  weekLabel: string;
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
}

export function RescueCoverageReport() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [editingEmployee, setEditingEmployee] = useState<{ employeeName: string; employeeNumber: string } | null>(null);
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

  const handleExportCSV = () => {
    if (!reportData?.employees) return;

    const headers = ['Employee Name', 'Employee #', 'Week', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Total Shifts'];
    const csvData = [
      headers.join(','),
      ...reportData.employees.flatMap(emp => 
        emp.weeks?.map(week => [
          emp.employeeName, 
          emp.employeeNumber, 
          week.weekLabel,
          week.sunday,
          week.monday, 
          week.tuesday, 
          week.wednesday, 
          week.thursday,
          week.friday,
          week.saturday,
          week.totalShifts
        ].join(',')) || []
      )
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rescue-coverage-weekly-${reportData.monthName}-${reportData.year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleTimecardSaved = () => {
    // Refresh the report data after timecard changes
    queryClient.invalidateQueries({ queryKey: ['/api/admin/rescue-coverage-report'] });
    setEditingEmployee(null);
  };


  const getTimecardButtonText = (status: 'complete' | 'missing' | 'pending') => {
    switch (status) {
      case 'complete': return 'Complete';
      case 'missing': return 'Create';
      case 'pending': return 'View';
      default: return 'Edit';
    }
  };

  const getTimecardButtonVariant = (status: 'complete' | 'missing' | 'pending') => {
    switch (status) {
      case 'complete': return 'default' as const;
      case 'missing': return 'outline' as const;
      case 'pending': return 'secondary' as const;
      default: return 'outline' as const;
    }
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
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Weekday Rescue Coverage Shifts - {reportData?.monthName} {reportData?.year}
            </span>
            {reportData && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Total: {reportData.grandTotals?.total || 0} shifts
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading rescue coverage report...</span>
            </div>
          ) : reportData?.employees ? (
            <div className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This report shows weekly rescue coverage shifts by member for {reportData.monthName} {reportData.year}. Each row represents one week.
                </AlertDescription>
              </Alert>

              {/* Employee Tables */}
              {reportData.employees.map((employee, employeeIndex) => (
                <div key={`${employee.employeeName}-${employee.employeeNumber}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{employee.employeeName}</h3>
                  </div>
                  
                  <Table className="border">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold w-32">Week</TableHead>
                        <TableHead className="font-semibold text-center w-20">Sunday</TableHead>
                        <TableHead className="font-semibold text-center w-20">Monday</TableHead>
                        <TableHead className="font-semibold text-center w-20">Tuesday</TableHead>
                        <TableHead className="font-semibold text-center w-20">Wednesday</TableHead>
                        <TableHead className="font-semibold text-center w-20">Thursday</TableHead>
                        <TableHead className="font-semibold text-center w-20">Friday</TableHead>
                        <TableHead className="font-semibold text-center w-20">Saturday</TableHead>
                        <TableHead className="font-semibold text-center w-24">Total Shifts</TableHead>
                        <TableHead className="font-semibold text-center w-32">PDF Timesheet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.weeks?.map((week, weekIndex) => (
                        <TableRow key={`${employee.employeeNumber}-week-${week.weekNumber}`}>
                          <TableCell className="font-medium text-sm">
                            {week.weekLabel}
                          </TableCell>
                          <TableCell className="text-center">
                            {week.sunday > 0 ? week.sunday : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            {week.monday > 0 ? week.monday : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            {week.tuesday > 0 ? week.tuesday : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            {week.wednesday > 0 ? week.wednesday : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            {week.thursday > 0 ? week.thursday : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            {week.friday > 0 ? week.friday : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            {week.saturday > 0 ? week.saturday : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {week.totalShifts}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col space-y-1">
                              <Button
                                variant={getTimecardButtonVariant(week.timecardStatus)}
                                size="sm"
                                className="text-xs h-6"
                                onClick={() => setEditingEmployee({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                data-testid={`button-timecard-${employee.employeeNumber}-week-${week.weekNumber}`}
                              >
                                {getTimecardButtonText(week.timecardStatus)}
                              </Button>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-5 px-1"
                                  onClick={() => setEditingEmployee({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-5 px-1"
                                  onClick={() => setEditingEmployee({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                >
                                  Edited
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-5 px-1"
                                  onClick={() => setEditingEmployee({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                >
                                  Original
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-5 px-1"
                                  onClick={() => setEditingEmployee({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-5 px-1"
                                  onClick={() => setShowActivityLog({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                >
                                  Activity
                                </Button>
                              </div>
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
          ) : null}
        </CardContent>
      </Card>

      {/* Timecard Edit Dialog */}
      {editingEmployee && (
        <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Edit Timecard - {editingEmployee.employeeName} (#{editingEmployee.employeeNumber})
              </DialogTitle>
            </DialogHeader>
            <SupervisorTimecardForm
              employeeName={editingEmployee.employeeName}
              employeeNumber={editingEmployee.employeeNumber}
              onSave={handleTimecardSaved}
              onCancel={() => setEditingEmployee(null)}
            />
          </DialogContent>
        </Dialog>
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