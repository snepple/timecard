import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: 'start' | 'end';
  startTime?: string;
}

// Helper function to determine if a time is AM or PM and what day it represents
function formatTimeWithDay(time: string): { display: string; period: string; dayIndicator: string } {
  const [hours, minutes] = time.split(':').map(Number);
  let period = "AM";
  let displayHour = hours;
  let dayIndicator = "";
  
  if (hours === 0) {
    displayHour = 12;
    dayIndicator = " (Next Day)";
  } else if (hours > 12) {
    displayHour = hours - 12;
    period = "PM";
  } else if (hours === 12) {
    period = "PM";
  } else if (hours < 7) {
    dayIndicator = " (Next Day)";
  }
  
  return {
    display: `${displayHour}:${minutes.toString().padStart(2, '0')}`,
    period,
    dayIndicator
  };
}

// Helper function to convert time to minutes from 7AM base
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  // If hour is 0-6, it's next day (after midnight within our 7:00-7:00 range)
  const adjustedHours = hours < 7 ? hours + 24 : hours;
  return (adjustedHours - 7) * 60 + minutes;
}

// Helper function to check if a time is valid for end time selection
function isValidEndTime(time: string, startTime?: string): boolean {
  const endMinutes = timeToMinutes(time);
  
  // End time cannot exceed 7:00 AM next day (24 hours from 7AM = 1440 minutes)
  if (endMinutes > 24 * 60) return false;
  
  if (!startTime) return true;
  
  const startMinutes = timeToMinutes(startTime);
  
  // End time must be after start time
  return endMinutes > startMinutes;
}

export function TimePicker({ value, onChange, placeholder = "Select time", disabled = false, className, type = 'start', startTime }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  
  // Initialize with smart defaults based on context
  const getInitialValues = () => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      let displayHour = h;
      let period: 'AM' | 'PM' = 'AM';
      
      if (h === 0) {
        displayHour = 12;
        period = 'AM';
      } else if (h > 12) {
        displayHour = h - 12;
        period = 'PM';
      } else if (h === 12) {
        period = 'PM';
      }
      
      return { hour: displayHour, minute: m, period };
    }
    
    // For end time picker, initialize to 15 minutes after start time if available
    if (type === 'end' && startTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      let newHour = startH;
      let newMinute = startM + 15;
      
      // Handle minute overflow
      if (newMinute >= 60) {
        newHour += 1;
        newMinute -= 60;
      }
      
      // Handle hour overflow
      if (newHour >= 24) {
        newHour -= 24;
      }
      
      let displayHour = newHour;
      let period: 'AM' | 'PM' = 'AM';
      
      if (newHour === 0) {
        displayHour = 12;
        period = 'AM';
      } else if (newHour > 12) {
        displayHour = newHour - 12;
        period = 'PM';
      } else if (newHour === 12) {
        period = 'PM';
      }
      
      return { hour: displayHour, minute: newMinute, period };
    }
    
    // Default fallback
    return { hour: 8, minute: 0, period: 'AM' as 'AM' | 'PM' };
  };
  
  const initialValues = getInitialValues();
  const [selectedHour, setSelectedHour] = useState(initialValues.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialValues.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initialValues.period);

  React.useEffect(() => {
    const newValues = getInitialValues();
    setSelectedHour(newValues.hour);
    setSelectedMinute(newValues.minute);
    setSelectedPeriod(newValues.period);
  }, [value, startTime]);

  const generateHours = () => Array.from({ length: 12 }, (_, i) => i + 1);
  const generateMinutes = () => [0, 15, 30, 45];

  const handleConfirm = () => {
    let actualHour = selectedHour;
    
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      actualHour = selectedHour + 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      actualHour = 0;
    }
    
    const timeString = `${actualHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    
    // Validate the time before confirming
    if (type === 'end' && startTime && !isValidEndTime(timeString, startTime)) {
      return; // Don't confirm invalid end times
    }
    
    onChange(timeString);
    setOpen(false);
  };

  const currentDisplayTime = value ? formatTimeWithDay(value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between text-sm h-8", className)}
          disabled={disabled}
        >
          {currentDisplayTime ? (
            <span className="flex items-center">
              <span>{currentDisplayTime.display}{currentDisplayTime.period}</span>
              {currentDisplayTime.dayIndicator && (
                <span className="text-xs text-muted-foreground ml-1">{currentDisplayTime.dayIndicator}</span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="bg-white rounded-lg border">
          {/* Header */}
          <div className="p-3 border-b">
            <div className="text-sm font-medium text-center">Select Time</div>
          </div>
          
          {/* Time picker grid */}
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Hours */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Hour</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {generateHours().map((hour) => {
                    // Check if this hour would be valid for end time selection
                    const isHourDisabled = type === 'end' && startTime && (() => {
                      let actualHour = hour;
                      if (selectedPeriod === 'PM' && hour !== 12) {
                        actualHour = hour + 12;
                      } else if (selectedPeriod === 'AM' && hour === 12) {
                        actualHour = 0;
                      }
                      const testTime = `${actualHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
                      return !isValidEndTime(testTime, startTime);
                    })();
                    
                    return (
                      <Button
                        key={hour}
                        variant={selectedHour === hour ? "default" : "ghost"}
                        size="sm"
                        className="w-full h-8 text-sm"
                        onClick={() => setSelectedHour(hour)}
                        disabled={isHourDisabled || false}
                      >
                        {hour}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Minute</div>
                <div className="space-y-1">
                  {generateMinutes().map((minute) => {
                    // Check if this minute would be valid for end time selection
                    const isMinuteDisabled = type === 'end' && startTime && (() => {
                      // Use the actual hour value based on current state
                      let actualHour = selectedHour;
                      if (selectedPeriod === 'PM' && selectedHour !== 12) {
                        actualHour = selectedHour + 12;
                      } else if (selectedPeriod === 'AM' && selectedHour === 12) {
                        actualHour = 0;
                      }
                      const testTime = `${actualHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      return !isValidEndTime(testTime, startTime);
                    })();
                    
                    return (
                      <Button
                        key={minute}
                        variant={selectedMinute === minute ? "default" : "ghost"}
                        size="sm"
                        className="w-full h-8 text-sm"
                        onClick={() => setSelectedMinute(minute)}
                        disabled={isMinuteDisabled || false}
                      >
                        {minute.toString().padStart(2, '0')}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* AM/PM */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Period</div>
                <div className="space-y-1">
                  {/* AM Button - check if AM times would be valid for end times */}
                  <Button
                    variant={selectedPeriod === 'AM' ? "default" : "ghost"}
                    size="sm"
                    className="w-full h-8 text-sm"
                    onClick={() => setSelectedPeriod('AM')}
                    disabled={type === 'end' && startTime ? (() => {
                      let testHour = selectedHour === 12 ? 0 : selectedHour;
                      const testTime = `${testHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
                      return !isValidEndTime(testTime, startTime);
                    })() : false}
                  >
                    AM
                  </Button>
                  {/* PM Button - check if PM times would be valid for end times */}
                  <Button
                    variant={selectedPeriod === 'PM' ? "default" : "ghost"}
                    size="sm"
                    className="w-full h-8 text-sm"
                    onClick={() => setSelectedPeriod('PM')}
                    disabled={type === 'end' && startTime ? (() => {
                      let testHour = selectedHour === 12 ? 12 : selectedHour + 12;
                      const testTime = `${testHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
                      return !isValidEndTime(testTime, startTime);
                    })() : false}
                  >
                    PM
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Preview</div>
              <div className="text-sm font-medium">
                {selectedHour}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
                {(() => {
                  let actualHour = selectedHour;
                  if (selectedPeriod === 'PM' && selectedHour !== 12) {
                    actualHour = selectedHour + 12;
                  } else if (selectedPeriod === 'AM' && selectedHour === 12) {
                    actualHour = 0;
                  }
                  return actualHour < 7 ? " (Next Day)" : "";
                })()}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-2 p-3 border-t">
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirm}
              className="flex items-center gap-1"
            >
              <Check className="h-4 w-4" />
              Confirm
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}