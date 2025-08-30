import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Shield, Edit, Calendar, FileText, Eye, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SupervisorTimecardForm } from "@/components/SupervisorTimecardForm";
import { EmployeeMonthActivityDialog } from "@/components/EmployeeMonthActivityDialog";

interface RescueCoverageEmployee {
  employeeName: string;
  employeeNumber: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  total: number;
  hasTimecards: boolean;
  timecardIds: string[];
  scheduleSource: {
    monday: 'schedule' | 'timecard';
    tuesday: 'schedule' | 'timecard';
    wednesday: 'schedule' | 'timecard';
    thursday: 'schedule' | 'timecard';
  };
}

interface RescueCoverageReportData {
  year: number;
  month: number;
  monthName: string;
  employees: RescueCoverageEmployee[];
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

    const headers = ['Employee Name', 'Employee #', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Total', 'Source Type'];
    const csvData = [
      headers.join(','),
      ...reportData.employees.map(emp => {
        const sourceInfo = `Schedule: ${Object.values(emp.scheduleSource).filter(s => s === 'schedule').length}, Timecard: ${Object.values(emp.scheduleSource).filter(s => s === 'timecard').length}`;
        return [emp.employeeName, emp.employeeNumber, emp.monday, emp.tuesday, emp.wednesday, emp.thursday, emp.total, sourceInfo].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rescue-coverage-${reportData.monthName}-${reportData.year}.csv`;
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

  const getDataSourceIcon = (source: 'schedule' | 'timecard') => {
    return source === 'schedule' ? (
      <Calendar className="h-3 w-3 text-blue-500" />
    ) : (
      <FileText className="h-3 w-3 text-green-600" />
    );
  };

  const getDataSourceTooltip = (employee: RescueCoverageEmployee, day: keyof RescueCoverageEmployee['scheduleSource']) => {
    const source = employee.scheduleSource[day];
    return source === 'schedule' 
      ? 'Data from scheduled night duty shifts'
      : 'Data from submitted timecard';
  };

  const getTotalsByDay = () => {
    if (!reportData?.employees) return { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, total: 0 };
    
    return reportData.employees.reduce((totals, emp) => ({
      monday: totals.monday + emp.monday,
      tuesday: totals.tuesday + emp.tuesday,
      wednesday: totals.wednesday + emp.wednesday,
      thursday: totals.thursday + emp.thursday,
      total: totals.total + emp.total
    }), { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, total: 0 });
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

  const totals = getTotalsByDay();

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
                Total: {totals.total} shifts
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
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This report shows weekday rescue coverage shifts by member. Data comes from scheduled night duty shifts unless timecard data is available.
                  <div className="flex items-center space-x-4 mt-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-blue-500" />
                      <span>Schedule data</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3 text-green-600" />
                      <span>Timecard data</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Employee Name</TableHead>
                    <TableHead className="font-semibold text-center">Employee #</TableHead>
                    <TableHead className="font-semibold text-center">Monday</TableHead>
                    <TableHead className="font-semibold text-center">Tuesday</TableHead>
                    <TableHead className="font-semibold text-center">Wednesday</TableHead>
                    <TableHead className="font-semibold text-center">Thursday</TableHead>
                    <TableHead className="font-semibold text-center">Total</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.employees.map((employee, index) => (
                    <TableRow key={`${employee.employeeName}-${employee.employeeNumber}`} data-testid={`row-employee-${index}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{employee.employeeName}</span>
                          {!employee.hasTimecards && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>No timecards submitted - showing scheduled night duty only</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{employee.employeeNumber}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {getDataSourceIcon(employee.scheduleSource.monday)}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getDataSourceTooltip(employee, 'monday')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {employee.monday > 0 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {employee.monday}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {getDataSourceIcon(employee.scheduleSource.tuesday)}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getDataSourceTooltip(employee, 'tuesday')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {employee.tuesday > 0 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {employee.tuesday}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {getDataSourceIcon(employee.scheduleSource.wednesday)}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getDataSourceTooltip(employee, 'wednesday')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {employee.wednesday > 0 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {employee.wednesday}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {getDataSourceIcon(employee.scheduleSource.thursday)}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getDataSourceTooltip(employee, 'thursday')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {employee.thursday > 0 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {employee.thursday}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {employee.total > 0 ? (
                          <Badge variant="default" className="bg-blue-600 text-white">
                            {employee.total}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingEmployee({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                  data-testid={`button-edit-${employee.employeeNumber}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit/Create Timecard</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {employee.timecardIds.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowActivityLog({ employeeName: employee.employeeName, employeeNumber: employee.employeeNumber })}
                                    data-testid={`button-activity-${employee.employeeNumber}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View Activity Log</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Totals row */}
                  <TableRow className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <TableCell className="font-bold">TOTALS</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {totals.monday}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {totals.tuesday}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {totals.wednesday}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {totals.thursday}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-blue-700 text-white">
                        {totals.total}
                      </Badge>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

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