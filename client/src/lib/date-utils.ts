/**
 * Get the current week's Saturday (week ending date)
 * @returns ISO date string for the Saturday of the current week
 */
export function getCurrentWeekEndingDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Calculate days until Saturday
  const daysUntilSaturday = 6 - dayOfWeek;
  
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSaturday);
  
  return saturday.toISOString().split('T')[0];
}

/**
 * Check if a given date is a Saturday
 * @param dateString ISO date string (YYYY-MM-DD)
 * @returns true if the date is a Saturday
 */
export function isSaturday(dateString: string): boolean {
  // Add noon time to avoid timezone parsing issues
  const date = new Date(dateString + 'T12:00:00');
  return date.getDay() === 6;
}

/**
 * Get the next Saturday from a given date
 * @param dateString ISO date string (YYYY-MM-DD)
 * @returns ISO date string for the next Saturday
 */
export function getNextSaturday(dateString: string): string {
  // Add noon time to avoid timezone parsing issues
  const date = new Date(dateString + 'T12:00:00');
  const dayOfWeek = date.getDay();
  
  // Calculate days until next Saturday
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : 6 - dayOfWeek;
  
  const saturday = new Date(date);
  saturday.setDate(date.getDate() + daysUntilSaturday);
  
  return saturday.toISOString().split('T')[0];
}

/**
 * Get the previous Saturday from a given date
 * @param dateString ISO date string (YYYY-MM-DD)
 * @returns ISO date string for the previous Saturday
 */
export function getPreviousSaturday(dateString: string): string {
  // Add noon time to avoid timezone parsing issues
  const date = new Date(dateString + 'T12:00:00');
  const dayOfWeek = date.getDay();
  
  // Calculate days back to previous Saturday
  const daysToSaturday = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
  
  const saturday = new Date(date);
  saturday.setDate(date.getDate() - daysToSaturday);
  
  return saturday.toISOString().split('T')[0];
}

/**
 * Get all Saturdays for the next 12 weeks
 * @returns Array of ISO date strings for upcoming Saturdays
 */
export function getUpcomingSaturdays(): string[] {
  const saturdays: string[] = [];
  let currentSaturday = getCurrentWeekEndingDate();
  
  for (let i = 0; i < 12; i++) {
    saturdays.push(currentSaturday);
    const nextDate = new Date(currentSaturday);
    nextDate.setDate(nextDate.getDate() + 7);
    currentSaturday = nextDate.toISOString().split('T')[0];
  }
  
  return saturdays;
}

/**
 * Format a date string for display
 * @param dateString ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

// Standardized date formatting function for m/d/yy format
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

// Helper for YYYY-MM-DD format dates to avoid timezone issues
export function formatDateShortFromYMD(dateStr: string): string {
  if (!dateStr) return "";
  try {
    // Handle YYYY-MM-DD format to avoid timezone issues
    if (dateStr.includes('-') && dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const yearShort = year.toString().slice(-2);
      return `${month}/${day}/${yearShort}`;
    }
    // Fallback to regular formatting
    return formatDateShort(dateStr);
  } catch (error) {
    return dateStr;
  }
}