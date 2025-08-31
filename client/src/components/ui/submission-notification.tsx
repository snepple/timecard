import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, User, Calendar, Info } from "lucide-react";
import { format } from "date-fns";

interface SubmissionNotificationProps {
  lastActivityInfo: {
    type: string;
    by: string;
    timestamp: string;
    description: string;
  };
  weekEnding: string;
}

export function SubmissionNotification({ lastActivityInfo, weekEnding }: SubmissionNotificationProps) {
  const formatDate = (timestamp: string) => {
    return format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a");
  };

  const formatDeadline = (weekEnding: string) => {
    return format(new Date(weekEnding), "MMM d, yyyy 'at' 11:59 PM");
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'submitted':
        return <Calendar className="h-4 w-4" />;
      case 'edited':
        return <Clock className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'submitted':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'edited':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Alert className={`mb-6 ${getActivityColor(lastActivityInfo.type)}`} data-testid="alert-submission-notification">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getActivityIcon(lastActivityInfo.type)}
        </div>
        <div className="flex-1">
          <AlertDescription className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="h-3 w-3" />
              <span className="font-semibold text-sm">
                Previously {lastActivityInfo.type} by {lastActivityInfo.by}
              </span>
              <span className="text-xs text-muted-foreground">
                on {formatDate(lastActivityInfo.timestamp)}
              </span>
            </div>
            
            <div className="text-sm">
              <p className="mb-1">You can edit and resubmit this timesheet.</p>
              <p className="text-xs text-muted-foreground">
                <strong>Deadline:</strong> Timecard edits are accepted for the current week until {formatDeadline(weekEnding)}
              </p>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}