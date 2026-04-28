export function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  // Convert times to minutes from 7AM base
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    // If hour is 0-6, it's next day (after midnight within our 7:00-7:00 range)
    const adjustedHours = hours < 7 ? hours + 24 : hours;
    return (adjustedHours - 7) * 60 + minutes;
  };
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // Handle invalid combinations (same time = 0 hours, not 24 hours)
  if (startMinutes === endMinutes) {
    return 0;
  }
  
  // End time must be after start time within the 7AM-7AM range
  if (endMinutes <= startMinutes) {
    return 0; // Invalid shift
  }
  
  // Calculate duration in hours
  const durationMinutes = endMinutes - startMinutes;
  return parseFloat((durationMinutes / 60).toFixed(2));
}

export function populateWeekDates(weekEndingDate: string): string[] {
  const endDate = new Date(weekEndingDate);
  const dates: string[] = [];
  
  // Calculate Sunday (6 days before Saturday)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - i);
    // Use manual YYYY-MM-DD formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  
  return dates;
}

export function formatTimeFor24Hour(time: string): string {
  if (!time) return "";
  
  // Convert HH:MM to HHMM format for display
  return time.replace(":", "");
}

export function formatHoursAsDecimal(hours: number): string {
  return hours.toFixed(2);
}
