import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { History, Clock, Edit, UserPlus, FileText, Eye } from "lucide-react";
import { format } from "date-fns";

interface TimecardWeekActivityDialogProps {
  employeeName: string;
  employeeNumber: string;
  weekEnding: string;
  trigger?: React.ReactNode;
}

interface ActivityLogEntry {
  id: string;
  timesheetId: string;
  activityType: string;
  performedBy: string;
  performedAt: string;
  details: string | null;
  employeeName: string;
  weekEnding: string;
  pdfData: string | null;
}

export function TimecardWeekActivityDialog({ 
  employeeName, 
  employeeNumber, 
  weekEnding, 
  trigger 
}: TimecardWeekActivityDialogProps) {
  const [open, setOpen] = useState(false);

  const activityQuery = useQuery<ActivityLogEntry[]>({
    queryKey: ['/api/timecards/activity-log/week', employeeNumber, weekEnding],
    enabled: open,
  });

  const handleViewPDF = (pdfData: string) => {
    // Create a blob from the base64 data and open it in a new tab
    const byteCharacters = atob(pdfData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    // Open in new tab
    window.open(url, '_blank');
    
    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'submitted':
        return <FileText className="w-4 h-4" />;
      case 'edited':
        return <Edit className="w-4 h-4" />;
      case 'completed_by_supervisor':
        return <UserPlus className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityBadge = (activityType: string) => {
    switch (activityType) {
      case 'submitted':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
            Submitted
          </Badge>
        );
      case 'edited':
        return (
          <Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
            Edited
          </Badge>
        );
      case 'completed_by_supervisor':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            Completed by Supervisor
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {activityType}
          </Badge>
        );
    }
  };

  const getActivityDescription = (entry: ActivityLogEntry) => {
    switch (entry.activityType) {
      case 'submitted':
        return `Timecard submitted by employee`;
      case 'edited':
        return `Timecard edited by ${entry.performedBy}`;
      case 'completed_by_supervisor':
        return `Timecard completed by supervisor ${entry.performedBy}`;
      default:
        return `${entry.performedBy} performed ${entry.activityType}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
            data-testid={`button-week-activity-${employeeNumber}-${weekEnding}`}
          >
            <History className="w-3 h-3" />
            <span>Activity</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Weekly Timecard Activity</span>
          </DialogTitle>
          <DialogDescription>
            Activity history for {employeeName}'s timecard for week ending {format(new Date(weekEnding), 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {activityQuery.isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {activityQuery.error && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-4">
                  <p className="text-red-500">Failed to load activity log</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activityQuery.data && activityQuery.data.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No activity found</p>
                  <p className="text-sm text-muted-foreground">
                    No timecard activity recorded for this week.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activityQuery.data && activityQuery.data.length > 0 && (
            <div className="space-y-4">
              {activityQuery.data.map((entry: ActivityLogEntry, index: number) => (
                <Card key={entry.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {getActivityIcon(entry.activityType)}
                          <CardTitle className="text-base">
                            {getActivityDescription(entry)}
                          </CardTitle>
                        </div>
                        {getActivityBadge(entry.activityType)}
                      </div>
                      {entry.pdfData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPDF(entry.pdfData!)}
                          className="flex items-center space-x-1"
                          data-testid={`button-view-pdf-${entry.id}`}
                        >
                          <Eye className="w-3 h-3" />
                          <span>View PDF</span>
                        </Button>
                      )}
                    </div>
                    <CardDescription className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {format(new Date(entry.performedAt), 'PPpp')}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  {entry.details && (
                    <CardContent className="pt-0">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">
                          <strong>Details:</strong> {entry.details}
                        </p>
                      </div>
                    </CardContent>
                  )}
                  {index < activityQuery.data.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}