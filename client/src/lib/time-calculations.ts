export function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  
  // Handle overnight shifts
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  const diffMs = end.getTime() - start.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return parseFloat(hours.toFixed(2));
}

export function populateWeekDates(weekEndingDate: string): string[] {
  const endDate = new Date(weekEndingDate);
  const dates: string[] = [];
  
  // Calculate Sunday (6 days before Saturday)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
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
