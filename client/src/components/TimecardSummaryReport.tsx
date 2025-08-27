import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeekPicker } from "@/components/ui/week-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Calendar, AlertCircle, CheckCircle2, Eye } from "lucide-react";
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
}

interface TimecardSummaryResponse {
  summary: TimecardSummaryData[];
  weekEnding: string;
}

export function TimecardSummaryReport() {
  const [selectedWeekEnding, setSelectedWeekEnding] = useState<string>("");

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

  const formatHours = (hours: number) => {
    return hours === 0 ? "-" : hours.toString();
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
            <CardTitle>Week Ending {new Date(summaryQuery.data.weekEnding).toLocaleDateString()}</CardTitle>
            <CardDescription>
              Timecard summary for all employees scheduled during this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Employee Name</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Sunday</TableHead>
                    <TableHead className="text-center">Monday</TableHead>
                    <TableHead className="text-center">Tuesday</TableHead>
                    <TableHead className="text-center">Wednesday</TableHead>
                    <TableHead className="text-center">Thursday</TableHead>
                    <TableHead className="text-center">Friday</TableHead>
                    <TableHead className="text-center">Saturday</TableHead>
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
                          {formatHours(employee.sunday)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatHours(employee.monday)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatHours(employee.tuesday)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatHours(employee.wednesday)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatHours(employee.thursday)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatHours(employee.friday)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatHours(employee.saturday)}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {formatHours(employee.totalHours)}
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