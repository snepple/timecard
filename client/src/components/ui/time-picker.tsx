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

export function TimePicker({ value, onChange, placeholder = "Select time", disabled = false, className }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(15);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      let displayHour = h;
      if (h === 0) {
        displayHour = 12;
        setSelectedPeriod('AM');
      } else if (h > 12) {
        displayHour = h - 12;
        setSelectedPeriod('PM');
      } else if (h === 12) {
        setSelectedPeriod('PM');
      } else {
        setSelectedPeriod('AM');
      }
      setSelectedHour(displayHour);
      setSelectedMinute(m);
    }
  }, [value]);

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
                  {generateHours().map((hour) => (
                    <Button
                      key={hour}
                      variant={selectedHour === hour ? "default" : "ghost"}
                      size="sm"
                      className="w-full h-8 text-sm"
                      onClick={() => setSelectedHour(hour)}
                    >
                      {hour}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Minutes */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Minute</div>
                <div className="space-y-1">
                  {generateMinutes().map((minute) => (
                    <Button
                      key={minute}
                      variant={selectedMinute === minute ? "default" : "ghost"}
                      size="sm"
                      className="w-full h-8 text-sm"
                      onClick={() => setSelectedMinute(minute)}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
              </div>

              {/* AM/PM */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Period</div>
                <div className="space-y-1">
                  <Button
                    variant={selectedPeriod === 'AM' ? "default" : "ghost"}
                    size="sm"
                    className="w-full h-8 text-sm"
                    onClick={() => setSelectedPeriod('AM')}
                  >
                    AM
                  </Button>
                  <Button
                    variant={selectedPeriod === 'PM' ? "default" : "ghost"}
                    size="sm"
                    className="w-full h-8 text-sm"
                    onClick={() => setSelectedPeriod('PM')}
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