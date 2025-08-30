import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ValidityFooterProps {
  hasEmployee: boolean;
  hasWeekEnding: boolean;
  hasTimeEntries: boolean;
  hasAcknowledgment: boolean;
  hasSignature: boolean;
  totalHours: number;
}

export function ValidityFooter({
  hasEmployee,
  hasWeekEnding,
  hasTimeEntries,
  hasAcknowledgment,
  hasSignature,
  totalHours
}: ValidityFooterProps) {
  const requirements = [
    { name: 'Employee Selection', completed: hasEmployee },
    { name: 'Week Ending Date', completed: hasWeekEnding },
    { name: 'Time Entries', completed: hasTimeEntries },
    { name: 'Acknowledgment', completed: hasAcknowledgment },
    { name: 'Digital Signature', completed: hasSignature },
  ];

  const completedCount = requirements.filter(req => req.completed).length;
  const totalRequirements = requirements.length;
  const validityPercentage = Math.round((completedCount / totalRequirements) * 100);
  
  const missingRequirements = requirements.filter(req => !req.completed);
  
  const getStatusColor = () => {
    if (validityPercentage === 100) return 'text-green-600';
    if (validityPercentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (validityPercentage === 100) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left side - Additional info */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Oakland Fire Department</span>
          {hasTimeEntries && (
            <span>Total Hours: {totalHours.toFixed(1)}</span>
          )}
        </div>
        
        {/* Right side - Validity indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="flex items-center gap-2 cursor-help"
                data-testid="validity-indicator"
              >
                {getStatusIcon()}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Validity:
                  </span>
                  <span className={`text-lg font-bold ${getStatusColor()}`}>
                    {validityPercentage}%
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-2">
                <div className="font-semibold">
                  Timesheet Completion Status
                </div>
                <div className="text-sm">
                  {validityPercentage === 100 ? (
                    <span className="text-green-600">
                      ✓ All requirements completed - Ready to submit!
                    </span>
                  ) : (
                    <>
                      <div className="text-red-600 mb-2">
                        Missing requirements:
                      </div>
                      <ul className="space-y-1">
                        {missingRequirements.map((req, index) => (
                          <li key={index} className="text-red-600">
                            • {req.name}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500 pt-2 border-t">
                  Completed: {completedCount}/{totalRequirements}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}