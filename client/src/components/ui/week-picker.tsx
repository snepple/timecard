import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekPickerProps {
  value?: string;
  onChange: (weekEndingDate: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Helper function to get the Saturday of the week containing the given date
function getWeekEndingDate(date: Date): string {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const daysToSaturday = day === 6 ? 0 : (6 - day); // If already Saturday, stay on same day
  const saturday = new Date(date);
  saturday.setDate(date.getDate() + daysToSaturday);
  
  // Use local date string to avoid timezone issues
  const year = saturday.getFullYear();
  const month = String(saturday.getMonth() + 1).padStart(2, '0');
  const day_str = String(saturday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day_str}`;
}

// Helper function to get all dates in a week
function getWeekDates(weekEndingDate: string): Date[] {
  // Parse the date more reliably to avoid timezone issues
  const [year, month, day] = weekEndingDate.split('-').map(Number);
  const saturday = new Date(year, month - 1, day); // month is 0-indexed in JS
  const dates = [];
  
  // Start from Sunday (6 days before Saturday)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(saturday);
    date.setDate(saturday.getDate() - i);
    dates.push(date);
  }
  
  return dates;
}

// Helper function to check if two dates are in the same week
function isSameWeek(date1: Date, date2: Date): boolean {
  const week1End = getWeekEndingDate(date1);
  const week2End = getWeekEndingDate(date2);
  return week1End === week2End;
}

export function WeekPicker({ value, onChange, placeholder = "Select week ending date", disabled = false, className }: WeekPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const selectedDate = value ? new Date(value) : null;

  // Generate calendar dates for the current month view
  const generateCalendarDates = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(endDate.getDate() + (6 - lastDayOfMonth.getDay())); // End on Saturday
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const calendarDates = generateCalendarDates();

  const handleDateClick = (date: Date) => {
    const weekEndingDate = getWeekEndingDate(date);
    onChange(weekEndingDate);
    setOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + (direction === 'next' ? 1 : -1));
    setViewDate(newDate);
  };

  const formatDisplayDate = () => {
    if (!selectedDate) return placeholder;
    
    const weekDates = getWeekDates(value!);
    const startDate = weekDates[0];  // Sunday
    const endDate = weekDates[6];    // Saturday
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    const formatDateWithYear = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    // Show year if dates span different years, or always show year on end date
    const startFormatted = formatDate(startDate);
    const endFormatted = startDate.getFullYear() !== endDate.getFullYear() 
      ? formatDateWithYear(endDate) 
      : formatDateWithYear(endDate);
    
    return `Week of ${startFormatted} - ${endFormatted}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          <span>{formatDisplayDate()}</span>
          <Calendar className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="bg-white rounded-lg border">
          {/* Header with month navigation */}
          <div className="flex items-center justify-between p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-0 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0">
            {calendarDates.map((date, index) => {
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = selectedDate && isSameWeek(date, selectedDate);
              const isHovered = hoveredDate && isSameWeek(date, hoveredDate);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <button
                  key={index}
                  className={cn(
                    "p-2 text-sm hover:bg-blue-50 transition-colors relative",
                    !isCurrentMonth && "text-muted-foreground",
                    isCurrentMonth && "text-foreground",
                    (isSelected || isHovered) && "bg-blue-100 text-blue-900",
                    isToday && "font-bold"
                  )}
                  onClick={() => handleDateClick(date)}
                  onMouseEnter={() => setHoveredDate(date)}
                  onMouseLeave={() => setHoveredDate(null)}
                >
                  <span className="relative z-10">{date.getDate()}</span>
                  
                  {/* Week highlight overlay */}
                  {(isSelected || isHovered) && (
                    <div className={cn(
                      "absolute inset-0 bg-blue-200",
                      date.getDay() === 0 && "rounded-l-md", // Sunday - left rounded
                      date.getDay() === 6 && "rounded-r-md", // Saturday - right rounded
                      isSelected && "bg-blue-300"
                    )} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer with selection info */}
          {(selectedDate || hoveredDate) && (
            <div className="p-3 border-t text-sm text-center text-muted-foreground">
              {hoveredDate && !selectedDate && (
                <>Week ending {new Date(getWeekEndingDate(hoveredDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
              )}
              {selectedDate && (
                <>Selected: Week ending {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}