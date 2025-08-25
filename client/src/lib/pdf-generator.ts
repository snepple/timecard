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

export async function generateTimeSheetPDF(data: TimesheetData): Promise<string> {
  try {
    // Load the fillable PDF template
    const templateResponse = await fetch('/timesheet-template.pdf');
    if (!templateResponse.ok) {
      throw new Error('Could not load PDF template');
    }
    const templateBytes = await templateResponse.arrayBuffer();
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    
    // Get all form fields to see what's available
    const fields = form.getFields();
    console.log('Available form fields:', fields.map(field => field.getName()));
    
    // Fill in the basic information fields
    try {
      const nameField = form.getTextField('Name');
      nameField.setText(data.employeeName);
    } catch (e) {
      console.log('Name field not found or not fillable');
    }
    
    try {
      const numberField = form.getTextField('Number');
      numberField.setText(data.employeeNumber);
    } catch (e) {
      console.log('Number field not found or not fillable');
    }
    
    try {
      const weekEndingField = form.getTextField('WeekEnding');
      weekEndingField.setText(data.weekEnding);
    } catch (e) {
      console.log('Week Ending field not found or not fillable');
    }
    
    // Fill in daily fields
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
      // Try different field name patterns
      const possibleDateFields = [`${day.prefix}Date`, `${day.prefix}_Date`, `Date_${day.prefix}`];
      const possibleStartFields = [`${day.prefix}Start`, `${day.prefix}_Start`, `Start_${day.prefix}`, `${day.prefix}StartTime`];
      const possibleEndFields = [`${day.prefix}End`, `${day.prefix}_End`, `End_${day.prefix}`, `${day.prefix}EndTime`];
      const possibleTotalFields = [`${day.prefix}Total`, `${day.prefix}_Total`, `Total_${day.prefix}`, `${day.prefix}Hours`];
      
      // Try to fill date field
      for (const fieldName of possibleDateFields) {
        try {
          const field = form.getTextField(fieldName);
          field.setText(day.date || '');
          break;
        } catch (e) {
          // Continue to next possible field name
        }
      }
      
      // Try to fill start time field
      for (const fieldName of possibleStartFields) {
        try {
          const field = form.getTextField(fieldName);
          field.setText(formatTimeForPDF(day.start));
          break;
        } catch (e) {
          // Continue to next possible field name
        }
      }
      
      // Try to fill end time field
      for (const fieldName of possibleEndFields) {
        try {
          const field = form.getTextField(fieldName);
          field.setText(formatTimeForPDF(day.end));
          break;
        } catch (e) {
          // Continue to next possible field name
        }
      }
      
      // Try to fill total hours field
      for (const fieldName of possibleTotalFields) {
        try {
          const field = form.getTextField(fieldName);
          field.setText(formatHoursForPDF(day.total));
          break;
        } catch (e) {
          // Continue to next possible field name
        }
      }
    });
    
    // Fill in total weekly hours
    try {
      const totalField = form.getTextField('TotalWeeklyHours');
      totalField.setText(formatHoursForPDF(data.totalWeeklyHours));
    } catch (e) {
      console.log('Total weekly hours field not found');
    }
    
    // Fill in rescue coverage checkboxes
    const coverageFields = [
      { name: 'MondayCoverage', checked: data.rescueCoverageMonday },
      { name: 'TuesdayCoverage', checked: data.rescueCoverageTuesday },
      { name: 'WednesdayCoverage', checked: data.rescueCoverageWednesday },
      { name: 'ThursdayCoverage', checked: data.rescueCoverageThursday },
    ];
    
    coverageFields.forEach(({ name, checked }) => {
      try {
        const field = form.getCheckBox(name);
        if (checked) {
          field.check();
        }
      } catch (e) {
        console.log(`Coverage field ${name} not found`);
      }
    });
    
    // Handle signature - try to add it if we have signature data
    if (data.signatureData) {
      try {
        // For fillable PDFs, we might need to add the signature as an image overlay
        // since signature fields are complex
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // Remove data URL prefix if present
        const base64Data = data.signatureData.replace(/^data:image\/[a-z]+;base64,/, '');
        const signatureImage = await pdfDoc.embedPng(base64Data);
        
        // Position the signature where the signature field would be
        // You may need to adjust these coordinates based on your template
        firstPage.drawImage(signatureImage, {
          x: 120, // Adjust X position
          y: 600, // Adjust Y position  
          width: 100,
          height: 25,
        });
      } catch (error) {
        console.warn("Could not add signature to PDF:", error);
      }
    }
    
    // Flatten the form to prevent further editing
    form.flatten();
    
    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Convert to base64 for download
    const base64String = btoa(String.fromCharCode(...Array.from(new Uint8Array(pdfBytes))));
    return `data:application/pdf;base64,${base64String}`;
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }
}