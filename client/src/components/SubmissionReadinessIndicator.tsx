import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';

interface SubmissionReadinessIndicatorProps {
  hasEmployee: boolean;
  hasWeekEnding: boolean;
  hasTimeEntries: boolean;
  hasSignature: boolean;
  totalHours: number;
  compact?: boolean;
}

export function SubmissionReadinessIndicator({
  hasEmployee,
  hasWeekEnding,
  hasTimeEntries,
  hasSignature,
  totalHours,
  compact = false
}: SubmissionReadinessIndicatorProps) {
  const requirements = [
    { name: 'Employee Selected', completed: hasEmployee },
    { name: 'Week Selected', completed: hasWeekEnding },
    { name: 'Time Entries', completed: hasTimeEntries },
    { name: 'Digital Signature', completed: hasSignature }
  ];

  const completedCount = requirements.filter(req => req.completed).length;
  const totalRequirements = requirements.length;
  const completionPercentage = (completedCount / totalRequirements) * 100;

  // Determine status and colors
  let status: 'incomplete' | 'partial' | 'ready';
  let bgColor: string;
  let textColor: string;
  let borderColor: string;
  let icon: React.ReactNode;
  let statusText: string;

  if (completedCount === totalRequirements) {
    status = 'ready';
    bgColor = 'bg-green-50';
    textColor = 'text-green-800';
    borderColor = 'border-green-200';
    icon = <CheckCircle className="h-5 w-5 text-green-600" />;
    statusText = 'Ready to Submit';
  } else if (completedCount > 0) {
    status = 'partial';
    bgColor = 'bg-yellow-50';
    textColor = 'text-yellow-800';
    borderColor = 'border-yellow-200';
    icon = <Clock className="h-5 w-5 text-yellow-600" />;
    statusText = 'In Progress';
  } else {
    status = 'incomplete';
    bgColor = 'bg-red-50';
    textColor = 'text-red-800';
    borderColor = 'border-red-200';
    icon = <XCircle className="h-5 w-5 text-red-600" />;
    statusText = 'Not Started';
  }

  const missingRequirements = requirements.filter(req => !req.completed);

  return (
    <div className={`${bgColor} ${borderColor} border-2 rounded-lg ${compact ? 'p-3 mb-3' : 'p-4 mb-4'}`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className={`font-semibold ${textColor} ${compact ? 'text-sm' : ''}`}>
            {compact ? 'Readiness' : 'Submission Readiness'}
          </h3>
        </div>
        <div className={`text-sm font-medium ${textColor}`}>
          {completedCount}/{totalRequirements}
        </div>
      </div>

      {/* Progress bar */}
      <div className={compact ? 'mb-2' : 'mb-3'}>
        <div className="flex justify-between text-xs mb-1">
          <span className={textColor}>{statusText}</span>
          <span className={textColor}>{Math.round(completionPercentage)}% Complete</span>
        </div>
        <div className={`w-full bg-gray-200 rounded-full ${compact ? 'h-1.5' : 'h-2'}`}>
          <div 
            className={`${compact ? 'h-1.5' : 'h-2'} rounded-full transition-all duration-300 ${
              status === 'ready' ? 'bg-green-600' : 
              status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {!compact && (
        <div className="space-y-2">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {req.completed ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className={req.completed ? 'text-green-700' : 'text-gray-600'}>
                {req.name}
                {req.name === 'Time Entries' && hasTimeEntries && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({totalHours.toFixed(1)} hours)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Missing requirements message */}
      {missingRequirements.length > 0 && (
        <div className={`${compact ? 'mt-2' : 'mt-3'} p-2 rounded border-l-4 ${
          status === 'partial' ? 'border-yellow-400 bg-yellow-25' : 'border-red-400 bg-red-25'
        }`}>
          <p className={`text-xs font-medium ${textColor}`}>
            {compact ? 'Missing: ' : 'Still needed: '}{missingRequirements.map(req => req.name).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}