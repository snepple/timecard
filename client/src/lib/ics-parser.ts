export interface Employee {
  firstName: string;
  lastName: string;
  fullName: string;
  employeeNumber: string;
}

export interface Shift {
  employeeNumber: string;
  employeeName: string;
  startTime: Date;
  endTime: Date;
  position: string;
  description?: string; // Added for Night Duty detection
  duration: number;
  date: string; // YYYY-MM-DD format
}

export interface ScheduleData {
  employees: Employee[];
  shifts: Shift[];
  lastUpdated: string;
}

export function parseICSData(icsContent: string): ScheduleData {
  const events = extractVEvents(icsContent);
  const shifts: Shift[] = [];
  const employeeMap = new Map<string, Employee>();

  for (const event of events) {
    const shift = parseEvent(event);
    if (shift) {
      shifts.push(shift);
      
      // Extract employee info
      const employee: Employee = {
        firstName: extractEmployeeFirst(event),
        lastName: extractEmployeeLast(event),
        fullName: extractEmployeeName(event),
        employeeNumber: shift.employeeNumber,
      };
      
      employeeMap.set(employee.employeeNumber, employee);
    }
  }

  return {
    employees: Array.from(employeeMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    shifts,
    lastUpdated: new Date().toISOString(),
  };
}

function extractVEvents(icsContent: string): string[] {
  const events: string[] = [];
  const lines = icsContent.split('\n');
  let currentEvent = '';
  let inEvent = false;

  for (const line of lines) {
    if (line.trim() === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = line + '\n';
    } else if (line.trim() === 'END:VEVENT') {
      currentEvent += line + '\n';
      events.push(currentEvent);
      currentEvent = '';
      inEvent = false;
    } else if (inEvent) {
      currentEvent += line + '\n';
    }
  }

  return events;
}

function parseEvent(eventData: string): Shift | null {
  try {
    const dtStart = extractField(eventData, 'DTSTART');
    const dtEnd = extractField(eventData, 'DTEND');
    const description = extractField(eventData, 'DESCRIPTION');
    
    if (!dtStart || !dtEnd || !description) return null;

    const startTime = parseICSDateTime(dtStart);
    const endTime = parseICSDateTime(dtEnd);
    const employeeNumber = extractFromDescription(description, 'EmployeeNumber');
    const employeeFirst = extractFromDescription(description, 'EmployeeFirst');
    const employeeLast = extractFromDescription(description, 'EmployeeLast');
    const positionName = extractFromDescription(description, 'PositionName');
    const duration = parseFloat(extractFromDescription(description, 'ShiftDuration') || '0');

    if (!employeeNumber || !employeeFirst || !employeeLast) return null;

    return {
      employeeNumber,
      employeeName: `${employeeFirst} ${employeeLast}`,
      startTime,
      endTime,
      position: positionName || 'Unknown',
      description, // Include full description for Night Duty detection
      duration,
      date: startTime.toISOString().split('T')[0],
    };
  } catch (error) {
    console.error('Error parsing event:', error);
    return null;
  }
}

function extractField(eventData: string, fieldName: string): string | null {
  // ICS format can have line continuations - lines starting with space or tab are continuations
  const lines = eventData.split('\n');
  let result = '';
  let foundField = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith(`${fieldName}:`)) {
      // Found the field, extract initial value
      result = line.substring(fieldName.length + 1);
      foundField = true;
    } else if (foundField && (lines[i].startsWith(' ') || lines[i].startsWith('\t'))) {
      // This is a continuation line
      result += lines[i].substring(1); // Remove the leading space/tab
    } else if (foundField && !lines[i].startsWith(' ') && !lines[i].startsWith('\t')) {
      // Found a new field, stop collecting continuation lines
      break;
    }
  }
  
  if (foundField) {
    // Debug log for DESCRIPTION field to see what we're getting
    if (fieldName === 'DESCRIPTION' && result.includes('Anthony')) {
      console.log(`🔍 DEBUG: Extracted ${fieldName} for Anthony:`, result.substring(0, 200) + '...');
    }
    return result.trim();
  }
  
  return null;
}

function extractFromDescription(description: string, fieldName: string): string {
  const regex = new RegExp(`\\(${fieldName}:([^)]+)\\)`);
  const match = description.match(regex);
  return match ? match[1].trim() : '';
}

function extractEmployeeName(eventData: string): string {
  const summary = extractField(eventData, 'SUMMARY');
  if (!summary) return '';
  
  // Extract name from summary like "Sam Nepple Per-Diem 7am-3pm"
  const parts = summary.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return '';
}

function extractEmployeeFirst(eventData: string): string {
  const description = extractField(eventData, 'DESCRIPTION');
  return description ? extractFromDescription(description, 'EmployeeFirst') : '';
}

function extractEmployeeLast(eventData: string): string {
  const description = extractField(eventData, 'DESCRIPTION');
  return description ? extractFromDescription(description, 'EmployeeLast') : '';
}

function parseICSDateTime(dateTimeStr: string): Date {
  // Handle format like "20250622T110000Z"
  if (dateTimeStr.includes('T') && dateTimeStr.endsWith('Z')) {
    const year = parseInt(dateTimeStr.substring(0, 4));
    const month = parseInt(dateTimeStr.substring(4, 6)) - 1; // JS months are 0-based
    const day = parseInt(dateTimeStr.substring(6, 8));
    const hour = parseInt(dateTimeStr.substring(9, 11));
    const minute = parseInt(dateTimeStr.substring(11, 13));
    const second = parseInt(dateTimeStr.substring(13, 15));
    
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
  
  return new Date(dateTimeStr);
}

export function getShiftsForEmployeeAndWeek(
  shifts: Shift[], 
  employeeNumber: string, 
  weekEndingDate: string
): Shift[] {
  const endDate = new Date(weekEndingDate);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6); // Sunday to Saturday

  return shifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    return shift.employeeNumber === employeeNumber &&
           shiftDate >= startDate && 
           shiftDate <= endDate;
  });
}

export function convertShiftToTimeEntry(shift: Shift): {
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
} {
  // Convert UTC times to local times for display
  const localStart = new Date(shift.startTime.getTime() - (shift.startTime.getTimezoneOffset() * 60000));
  const localEnd = new Date(shift.endTime.getTime() - (shift.endTime.getTimezoneOffset() * 60000));
  
  return {
    date: shift.date,
    startTime: localStart.toTimeString().substring(0, 5), // HH:MM format
    endTime: localEnd.toTimeString().substring(0, 5),
    totalHours: shift.duration,
  };
}