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
  return time;
}

function formatHoursForPDF(hours?: number): string {
  if (!hours) return "";
  return hours.toFixed(2);
}

export async function generateTimeSheetPDF(data: TimesheetData): Promise<string> {
  try {
    // Create a new PDF document based on your template layout
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();
    
    // Get fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Header - centered exactly like template
    page.drawText('Oakland Fire-Rescue', {
      x: width / 2 - 85,
      y: height - 80,
      size: 14,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Weekly Time Sheet', {
      x: width / 2 - 75,
      y: height - 100,
      size: 14,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Employee Information - matching template format
    page.drawText(`Name: ${data.employeeName}`, {
      x: 50,
      y: height - 140,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Number: ${data.employeeNumber}`, {
      x: 350,
      y: height - 140,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Week Ending: ${data.weekEnding}`, {
      x: 50,
      y: height - 170,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Signature:', {
      x: 50,
      y: height - 200,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Table headers
    const tableStartY = height - 250;
    
    page.drawText('Date', {
      x: 160,
      y: tableStartY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Start Time', {
      x: 240,
      y: tableStartY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('End Time', {
      x: 340,
      y: tableStartY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Total Hours', {
      x: 440,
      y: tableStartY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Days data
    const days = [
      { name: "Sunday", date: data.sundayDate, start: data.sundayStartTime, end: data.sundayEndTime, total: data.sundayTotalHours },
      { name: "Monday", date: data.mondayDate, start: data.mondayStartTime, end: data.mondayEndTime, total: data.mondayTotalHours },
      { name: "Tuesday", date: data.tuesdayDate, start: data.tuesdayStartTime, end: data.tuesdayEndTime, total: data.tuesdayTotalHours },
      { name: "Wednesday", date: data.wednesdayDate, start: data.wednesdayStartTime, end: data.wednesdayEndTime, total: data.wednesdayTotalHours },
      { name: "Thursday", date: data.thursdayDate, start: data.thursdayStartTime, end: data.thursdayEndTime, total: data.thursdayTotalHours },
      { name: "Friday", date: data.fridayDate, start: data.fridayStartTime, end: data.fridayEndTime, total: data.fridayTotalHours },
      { name: "Saturday", date: data.saturdayDate, start: data.saturdayStartTime, end: data.saturdayEndTime, total: data.saturdayTotalHours },
    ];
    
    let currentY = tableStartY - 40;
    
    days.forEach((day) => {
      // Day name
      page.drawText(day.name, {
        x: 60,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      // Date
      page.drawText(day.date || '', {
        x: 160,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      // Start time
      page.drawText(formatTimeForPDF(day.start), {
        x: 250,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      // End time
      page.drawText(formatTimeForPDF(day.end), {
        x: 350,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      // Total hours
      page.drawText(formatHoursForPDF(day.total), {
        x: 460,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      currentY -= 25;
    });
    
    // Total hours section
    currentY -= 30;
    page.drawText('Total Hours for Week', {
      x: 350,
      y: currentY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(formatHoursForPDF(data.totalWeeklyHours), {
      x: 510,
      y: currentY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Weeknight Rescue Coverage
    currentY -= 60;
    page.drawText('Weeknight Rescue Coverage', {
      x: width / 2 - 100,
      y: currentY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    currentY -= 30;
    const coverageDays = [
      { name: "Monday", covered: data.rescueCoverageMonday, x: 130 },
      { name: "Tuesday", covered: data.rescueCoverageTuesday, x: 220 },
      { name: "Wednesday", covered: data.rescueCoverageWednesday, x: 310 },
      { name: "Thursday", covered: data.rescueCoverageThursday, x: 420 },
    ];
    
    coverageDays.forEach((day) => {
      page.drawText(day.name, {
        x: day.x,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      if (day.covered) {
        page.drawText('X', {
          x: day.x + 10,
          y: currentY - 20,
          size: 14,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });
      }
    });
    
    // Footer note
    currentY -= 60;
    page.drawText('***Weeknight Rescue Coverage will be paid out in monthly check***', {
      x: width / 2 - 200,
      y: currentY,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Add signature if provided
    if (data.signatureData) {
      try {
        // Remove data URL prefix if present
        const base64Data = data.signatureData.replace(/^data:image\/[a-z]+;base64,/, '');
        const signatureImage = await pdfDoc.embedPng(base64Data);
        
        page.drawImage(signatureImage, {
          x: 120,
          y: height - 190,
          width: 100,
          height: 20,
        });
      } catch (error) {
        console.warn("Could not add signature to PDF, continuing without signature:", error);
      }
    }
    
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