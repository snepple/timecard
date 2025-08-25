import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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
  return time.replace(":", "");
}

function formatHoursForPDF(hours?: number): string {
  if (!hours) return "";
  return hours.toFixed(2);
}

export async function generateTimeSheetPDF(data: TimesheetData): Promise<string> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();
    
    // Get fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Header - centered exactly like template
    page.drawText('Oakland Fire-Rescue', {
      x: width / 2 - 70,
      y: height - 50,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Weekly Time Sheet', {
      x: width / 2 - 55,
      y: height - 80,
      size: 14,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Employee Information - positioned exactly like template
    page.drawText(`Name: ${data.employeeName}_______________Number: ${data.employeeNumber}_______`, {
      x: 50,
      y: height - 120,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Week Ending: ${data.weekEnding}________________________`, {
      x: 50,
      y: height - 145,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Signature: ___________________________', {
      x: 50,
      y: height - 170,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Table headers - positioned exactly like template  
    const tableStartY = height - 200;
    
    page.drawText('Date        Start Time           End Time           Total Hours', {
      x: 80,
      y: tableStartY,
      size: 11,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Days data - positioned exactly like template
    const days = [
      { name: "Sunday", date: data.sundayDate, start: data.sundayStartTime, end: data.sundayEndTime, total: data.sundayTotalHours },
      { name: "Monday", date: data.mondayDate, start: data.mondayStartTime, end: data.mondayEndTime, total: data.mondayTotalHours },
      { name: "Tuesday", date: data.tuesdayDate, start: data.tuesdayStartTime, end: data.tuesdayEndTime, total: data.tuesdayTotalHours },
      { name: "Wednesday", date: data.wednesdayDate, start: data.wednesdayStartTime, end: data.wednesdayEndTime, total: data.wednesdayTotalHours },
      { name: "Thursday", date: data.thursdayDate, start: data.thursdayStartTime, end: data.thursdayEndTime, total: data.thursdayTotalHours },
      { name: "Friday", date: data.fridayDate, start: data.fridayStartTime, end: data.fridayEndTime, total: data.fridayTotalHours },
      { name: "Saturday", date: data.saturdayDate, start: data.saturdayStartTime, end: data.saturdayEndTime, total: data.saturdayTotalHours },
    ];
    
    let currentY = tableStartY - 30;
    
    days.forEach((day) => {
      // Day name and data - formatted like template
      const dayText = day.name.padEnd(12, ' ');
      const dateText = (day.date || '').padEnd(12, ' ');
      const startTimeText = formatTimeForPDF(day.start).padEnd(20, ' ');
      const endTimeText = formatTimeForPDF(day.end).padEnd(18, ' ');
      const totalHoursText = formatHoursForPDF(day.total);
      
      page.drawText(`${dayText}${dateText}${startTimeText}${endTimeText}${totalHoursText}`, {
        x: 50,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      currentY -= 22; // Spacing between days
    });
    
    // Total hours section - positioned exactly like template
    currentY -= 30;
    page.drawText(`Total Hours for Week: ${formatHoursForPDF(data.totalWeeklyHours)}`, {
      x: 200,
      y: currentY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Weeknight Rescue Coverage - centered exactly like template
    currentY -= 60;
    page.drawText('Weeknight Rescue Coverage', {
      x: width / 2 - 90,
      y: currentY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Coverage days - positioned exactly like template
    currentY -= 30;
    const mondayText = data.rescueCoverageMonday ? 'Monday (X)' : 'Monday';
    const tuesdayText = data.rescueCoverageTuesday ? 'Tuesday (X)' : 'Tuesday';
    const wednesdayText = data.rescueCoverageWednesday ? 'Wednesday (X)' : 'Wednesday';
    const thursdayText = data.rescueCoverageThursday ? 'Thursday (X)' : 'Thursday';
    
    page.drawText(`${mondayText.padEnd(20, ' ')}${tuesdayText.padEnd(20, ' ')}${wednesdayText.padEnd(20, ' ')}${thursdayText}`, {
      x: 100,
      y: currentY,
      size: 11,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Footer note - centered exactly like template
    currentY -= 60;
    page.drawText('***Weeknight Rescue Coverage will be paid out in monthly check***', {
      x: width / 2 - 180,
      y: currentY,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Add signature if provided - positioned over signature line
    if (data.signatureData && data.signatureData.trim() !== '') {
      try {
        // Remove data URL prefix if present
        const base64Data = data.signatureData.replace(/^data:image\/[a-z]+;base64,/, '');
        const signatureImage = await pdfDoc.embedPng(base64Data);
        
        page.drawImage(signatureImage, {
          x: 115,
          y: height - 160,
          width: 100,
          height: 15,
        });
      } catch (error) {
        console.warn("Could not add signature to PDF, continuing without signature:", error);
      }
    }
    
    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();
    
    // Convert to base64
    const base64String = btoa(String.fromCharCode(...pdfBytes));
    return base64String;
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
