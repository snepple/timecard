import { PDFDocument, PDFForm } from "pdf-lib";

interface TimesheetData {
  employeeName: string;
  employeeNumber: string;
  weekEnding: string;
  
  sundayDate?: string;
  sundayStartTime?: string;
  sundayEndTime?: string;
  sundayTotalHours?: number;
  
  mondayDate?: string;
  mondayStartTime?: string;
  mondayEndTime?: string;
  mondayTotalHours?: number;
  
  tuesdayDate?: string;
  tuesdayStartTime?: string;
  tuesdayEndTime?: string;
  tuesdayTotalHours?: number;
  
  wednesdayDate?: string;
  wednesdayStartTime?: string;
  wednesdayEndTime?: string;
  wednesdayTotalHours?: number;
  
  thursdayDate?: string;
  thursdayStartTime?: string;
  thursdayEndTime?: string;
  thursdayTotalHours?: number;
  
  fridayDate?: string;
  fridayStartTime?: string;
  fridayEndTime?: string;
  fridayTotalHours?: number;
  
  saturdayDate?: string;
  saturdayStartTime?: string;
  saturdayEndTime?: string;
  saturdayTotalHours?: number;
  
  totalWeeklyHours?: number;
  
  rescueCoverageMonday?: boolean;
  rescueCoverageTuesday?: boolean;
  rescueCoverageWednesday?: boolean;
  rescueCoverageThursday?: boolean;
  
  signatureData?: string;
}

function formatTimeForPDF(time?: string): string {
  if (!time) return "";
  return time;
}

function formatHoursForPDF(hours?: number): string {
  if (!hours) return "";
  return hours.toFixed(2);
}

function formatDateForPDF(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    // Handle YYYY-MM-DD format to avoid timezone issues
    if (dateStr.includes('-') && dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const yearShort = year.toString().slice(-2);
      return `${month}/${day}/${yearShort}`;
    }
    
    // Fallback to original Date parsing for other formats
    const date = new Date(dateStr);
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2); // Get last 2 digits
    return `${month}/${day}/${year}`;
  } catch (error) {
    return dateStr; // Return original if parsing fails
  }
}

export async function generateTimeSheetPDF(data: TimesheetData): Promise<string> {
  try {
    console.log("Starting PDF generation with data:", {
      employeeName: data.employeeName,
      employeeNumber: data.employeeNumber,
      weekEnding: data.weekEnding,
      hasSignature: !!data.signatureData
    });
    
    // Load the fillable PDF template
    console.log("Fetching PDF template...");
    const templateResponse = await fetch('/timesheet-template.pdf');
    if (!templateResponse.ok) {
      console.error("PDF template fetch failed:", templateResponse.status, templateResponse.statusText);
      throw new Error(`Could not load PDF template: ${templateResponse.status} ${templateResponse.statusText}`);
    }
    console.log("PDF template loaded successfully");
    
    const templateBytes = await templateResponse.arrayBuffer();
    console.log("Template size:", templateBytes.byteLength, "bytes");
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    
    // Get all form fields to see what's available
    const fields = form.getFields();
    const fieldNames = fields.map(field => field.getName());
    console.log('Available form fields:', fieldNames);
    
    // Helper function to safely fill text fields
    const fillTextField = (fieldName: string, value: string) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value);
        console.log(`Filled ${fieldName} with: ${value}`);
      } catch (e) {
        // Field not found - this is normal for optional fields
      }
    };
    
    // Helper function to safely check checkboxes
    const checkBox = (fieldName: string, checked: boolean) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (checked) {
          field.check();
        } else {
          field.uncheck();
        }
        console.log(`Set ${fieldName} checkbox to: ${checked}`);
      } catch (e) {
        // Checkbox not found - this is normal when trying multiple field name patterns
      }
    };
    
    // Fill basic information fields - try multiple field name patterns
    const nameFields = ['Name', 'EmployeeName', 'Employee Name', 'Employee_Name', 'name', 'employeename'];
    const numberFields = ['Number', 'EmployeeNumber', 'Employee Number', 'Employee_Number', 'number', 'employeenumber', 'ID', 'EmployeeID', 'Employee ID'];
    const weekEndingFields = [
      'WeekEnding', 'Week Ending', 'Week_Ending', 'weekending', 'DateWeekEnding', 'Date Week Ending',
      'WeekEndingDate', 'Week Ending Date', 'EndingDate', 'Ending Date', 'Week End', 'WeekEnd',
      'weekendingdate', 'endingdate', 'weekend'
    ];
    
    // Fill name
    for (const fieldName of nameFields) {
      fillTextField(fieldName, data.employeeName);
    }
    
    // Fill employee number
    for (const fieldName of numberFields) {
      fillTextField(fieldName, data.employeeNumber);
    }
    
    // Fill week ending date with m/d/yy format
    const formattedWeekEnding = formatDateForPDF(data.weekEnding);
    for (const fieldName of weekEndingFields) {
      fillTextField(fieldName, formattedWeekEnding);
    }
    
    // Fill daily time entries - try multiple field name patterns
    const days = [
      { prefix: 'Sunday', date: data.sundayDate, start: data.sundayStartTime, end: data.sundayEndTime, total: data.sundayTotalHours },
      { prefix: 'Monday', date: data.mondayDate, start: data.mondayStartTime, end: data.mondayEndTime, total: data.mondayTotalHours },
      { prefix: 'Tuesday', date: data.tuesdayDate, start: data.tuesdayStartTime, end: data.tuesdayEndTime, total: data.tuesdayTotalHours },
      { prefix: 'Wednesday', date: data.wednesdayDate, start: data.wednesdayStartTime, end: data.wednesdayEndTime, total: data.wednesdayTotalHours },
      { prefix: 'Thursday', date: data.thursdayDate, start: data.thursdayStartTime, end: data.thursdayEndTime, total: data.thursdayTotalHours },
      { prefix: 'Friday', date: data.fridayDate, start: data.fridayStartTime, end: data.fridayEndTime, total: data.fridayTotalHours },
      { prefix: 'Saturday', date: data.saturdayDate, start: data.saturdayStartTime, end: data.saturdayEndTime, total: data.saturdayTotalHours },
    ];
    
    days.forEach((day) => {
      // Try various field naming patterns
      const possibleDateFields = [
        `${day.prefix}Date`, `${day.prefix}_Date`, `Date_${day.prefix}`, 
        `${day.prefix} Date`, `date${day.prefix}`, `${day.prefix.toLowerCase()}Date`,
        `${day.prefix.toLowerCase()}_date`, `${day.prefix.toLowerCase()}date`
      ];
      
      const possibleStartFields = [
        `${day.prefix}Start`, `${day.prefix}_Start`, `Start_${day.prefix}`, 
        `${day.prefix} Start`, `${day.prefix}StartTime`, `${day.prefix}_StartTime`,
        `${day.prefix} Start Time`, `start${day.prefix}`, `${day.prefix.toLowerCase()}Start`,
        `${day.prefix.toLowerCase()}_start`, `${day.prefix.toLowerCase()}start`
      ];
      
      const possibleEndFields = [
        `${day.prefix}End`, `${day.prefix}_End`, `End_${day.prefix}`, 
        `${day.prefix} End`, `${day.prefix}EndTime`, `${day.prefix}_EndTime`,
        `${day.prefix} End Time`, `end${day.prefix}`, `${day.prefix.toLowerCase()}End`,
        `${day.prefix.toLowerCase()}_end`, `${day.prefix.toLowerCase()}end`
      ];
      
      const possibleTotalFields = [
        `${day.prefix}Total`, `${day.prefix}_Total`, `Total_${day.prefix}`, 
        `${day.prefix} Total`, `${day.prefix}Hours`, `${day.prefix}_Hours`,
        `${day.prefix} Hours`, `${day.prefix}TotalHours`, `total${day.prefix}`,
        `${day.prefix.toLowerCase()}Total`, `${day.prefix.toLowerCase()}_total`, 
        `${day.prefix.toLowerCase()}total`, `${day.prefix.toLowerCase()}hours`,
        `${day.prefix} Total Hours`, `${day.prefix}_Total_Hours`, `TotalHours${day.prefix}`,
        `Hours${day.prefix}`, `Hours_${day.prefix}`, `${day.prefix}Hrs`, `${day.prefix}_Hrs`
      ];
      
      // Try to fill each field type with formatted dates
      for (const fieldName of possibleDateFields) {
        if (day.date) {
          fillTextField(fieldName, formatDateForPDF(day.date));
        }
      }
      
      for (const fieldName of possibleStartFields) {
        if (day.start) {
          fillTextField(fieldName, formatTimeForPDF(day.start));
        }
      }
      
      for (const fieldName of possibleEndFields) {
        if (day.end) {
          fillTextField(fieldName, formatTimeForPDF(day.end));
        }
      }
      
      for (const fieldName of possibleTotalFields) {
        if (day.total) {
          fillTextField(fieldName, formatHoursForPDF(day.total));
        }
      }
    });
    
    // Fill total weekly hours
    const possibleTotalWeeklyFields = [
      'TotalWeeklyHours', 'Total Weekly Hours', 'WeeklyTotal', 'Weekly Total',
      'TotalHours', 'Total Hours', 'totalweeklyhours', 'weeklytotal', 'totalhours',
      'Total Hours for Week', 'TotalHoursForWeek', 'Total_Hours_for_Week',
      'WeekTotal', 'Week Total', 'GrandTotal', 'Grand Total', 'OverallTotal',
      'totalhours for week', 'total hours for week', 'weektotal', 'grandtotal'
    ];
    
    for (const fieldName of possibleTotalWeeklyFields) {
      if (data.totalWeeklyHours) {
        fillTextField(fieldName, formatHoursForPDF(data.totalWeeklyHours));
      }
    }
    
    // Fill rescue coverage checkboxes - use the exact field names from PDF template
    const coverageFields = [
      { 
        fieldName: 'Monday Weeknight Rescue Coverage',
        checked: data.rescueCoverageMonday 
      },
      { 
        fieldName: 'Tuesday Weeknight Rescue Coverage',
        checked: data.rescueCoverageTuesday 
      },
      { 
        fieldName: 'Wednesday Weeknight Rescue Coverage',
        checked: data.rescueCoverageWednesday 
      },
      { 
        fieldName: 'Thuresday Weeknight Rescue Coverage', // Note: PDF template has typo "Thuresday"
        checked: data.rescueCoverageThursday 
      },
    ];
    
    coverageFields.forEach(({ fieldName, checked }) => {
      console.log(`Set ${fieldName} checkbox to: ${checked}`);
      // Always set the checkbox state (true or false) to ensure proper unchecking
      checkBox(fieldName, checked || false);
    });
    
    // Add signature as image overlay (since signature field is not fillable)
    if (data.signatureData) {
      try {
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // Remove data URL prefix if present
        const base64Data = data.signatureData.replace(/^data:image\/[a-z]+;base64,/, '');
        const signatureImage = await pdfDoc.embedPng(base64Data);
        
        // Position signature in the correct area (after "Signature:" text)
        const pageHeight = firstPage.getSize().height;
        firstPage.drawImage(signatureImage, {
          x: 153, // Move 1/4" to the right (18 points)
          y: pageHeight - 225, // Position right after "Signature:" text
          width: 150,
          height: 20.5, // Reduce height by 1/16" (4.5 points)
        });
        console.log('Added signature image overlay');
      } catch (error) {
        console.warn("Could not add signature to PDF:", error);
      }
    }
    
    // Flatten the form to prevent further editing and ensure compatibility
    try {
      form.flatten();
      console.log('Form flattened successfully');
    } catch (error) {
      console.warn("Could not flatten form:", error);
    }
    
    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Convert to base64 for download
    const base64String = btoa(String.fromCharCode(...Array.from(new Uint8Array(pdfBytes))));
    return `data:application/pdf;base64,${base64String}`;
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Could not load PDF template')) {
        throw new Error("PDF template file not found. Please contact administrator to upload the template.");
      } else if (error.message.includes('Failed to parse')) {
        throw new Error("PDF template file is corrupted. Please contact administrator.");
      } else if (error.message.includes('signature')) {
        throw new Error("Error processing signature. Please try redrawing your signature.");
      } else {
        throw new Error(`PDF generation failed: ${error.message}`);
      }
    } else {
      throw new Error("Unknown error occurred during PDF generation");
    }
  }
}