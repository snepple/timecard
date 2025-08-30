import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { History, Clock, Edit, UserPlus, FileText, Eye, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

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

export function ActivityLog() {
  const activityQuery = useQuery<ActivityLogEntry[]>({
    queryKey: ['/api/timecards/activity-log'],
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
        return `${entry.employeeName} submitted timecard for week ending ${format(new Date(entry.weekEnding), 'MMM d, yyyy')}`;
      case 'edited':
        return `${entry.performedBy} edited ${entry.employeeName}'s timecard`;
      case 'completed_by_supervisor':
        return `${entry.performedBy} completed ${entry.employeeName}'s timecard`;
      default:
        return `${entry.performedBy} performed ${entry.activityType} on ${entry.employeeName}'s timecard`;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <History className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground">
              Complete history of all timecard activities in the system
            </p>
          </div>
        </div>
        <Link href="/supervisor">
          <Button variant="outline" className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {activityQuery.isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {activityQuery.error && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-red-500">Failed to load activity log</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please try refreshing the page or contact support if the problem persists.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activityQuery.data && activityQuery.data.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium text-muted-foreground mb-2">No Activity Found</h3>
                <p className="text-sm text-muted-foreground">
                  There are no recorded activities in the system yet.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activityQuery.data && activityQuery.data.length > 0 && (
          <div className="space-y-4">
            {activityQuery.data.map((entry: ActivityLogEntry, index: number) => (
              <Card key={entry.id} className="transition-shadow hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-3">
                        {getActivityIcon(entry.activityType)}
                        <div>
                          <CardTitle className="text-base">
                            {getActivityDescription(entry)}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-2 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {format(new Date(entry.performedAt), 'PPpp')}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getActivityBadge(entry.activityType)}
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
                  </div>
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
      </div>
    </div>
  );
}