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
    page.drawText(`Name: ${data.employeeName}`, {
      x: 50,
      y: height - 120,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Underline for Name field
    page.drawLine({
      start: { x: 85, y: height - 125 },
      end: { x: 320, y: height - 125 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Number: ${data.employeeNumber}`, {
      x: 350,
      y: height - 120,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Underline for Number field
    page.drawLine({
      start: { x: 400, y: height - 125 },
      end: { x: 520, y: height - 125 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Week Ending: ${data.weekEnding}`, {
      x: 50,
      y: height - 150,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Underline for Week Ending field
    page.drawLine({
      start: { x: 140, y: height - 155 },
      end: { x: 280, y: height - 155 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    // Signature line
    page.drawText('Signature:', {
      x: 50,
      y: height - 180,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Signature underline
    page.drawLine({
      start: { x: 110, y: height - 185 },
      end: { x: 280, y: height - 185 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    // Table headers - positioned exactly like template
    const tableStartY = height - 220;
    
    // Draw table border (top border)
    page.drawLine({
      start: { x: 40, y: tableStartY + 15 },
      end: { x: 520, y: tableStartY + 15 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    // Draw vertical lines for table columns
    page.drawLine({
      start: { x: 40, y: tableStartY + 15 },
      end: { x: 40, y: tableStartY - 200 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawLine({
      start: { x: 120, y: tableStartY + 15 },
      end: { x: 120, y: tableStartY - 200 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawLine({
      start: { x: 190, y: tableStartY + 15 },
      end: { x: 190, y: tableStartY - 200 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawLine({
      start: { x: 280, y: tableStartY + 15 },
      end: { x: 280, y: tableStartY - 200 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawLine({
      start: { x: 370, y: tableStartY + 15 },
      end: { x: 370, y: tableStartY - 200 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawLine({
      start: { x: 520, y: tableStartY + 15 },
      end: { x: 520, y: tableStartY - 200 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Date', {
      x: 130,
      y: tableStartY,
      size: 11,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Start Time', {
      x: 200,
      y: tableStartY,
      size: 11,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('End Time', {
      x: 290,
      y: tableStartY,
      size: 11,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Total Hours', {
      x: 380,
      y: tableStartY,
      size: 11,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Draw header separator line
    page.drawLine({
      start: { x: 40, y: tableStartY - 10 },
      end: { x: 520, y: tableStartY - 10 },
      thickness: 1,
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
    
    days.forEach((day, index) => {
      // Day name - left aligned like template
      page.drawText(day.name, {
        x: 50,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      // Date, times, and hours - positioned to match template columns
      page.drawText(day.date || '', {
        x: 130,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(formatTimeForPDF(day.start), {
        x: 200,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(formatTimeForPDF(day.end), {
        x: 290,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(formatHoursForPDF(day.total), {
        x: 380,
        y: currentY,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      // Draw horizontal line between rows
      if (index < days.length - 1) {
        page.drawLine({
          start: { x: 40, y: currentY - 12 },
          end: { x: 520, y: currentY - 12 },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
      }
      
      currentY -= 25; // Spacing between days
    });
    
    // Draw table bottom border
    page.drawLine({
      start: { x: 40, y: currentY + 10 },
      end: { x: 520, y: currentY + 10 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    // Total hours section - positioned exactly like template
    currentY -= 20;
    page.drawText('Total Hours for Week', {
      x: 250,
      y: currentY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(formatHoursForPDF(data.totalWeeklyHours), {
      x: 400,
      y: currentY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('0', {
      x: 450,
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
    const coverageDays = [
      { name: "Monday", covered: data.rescueCoverageMonday, x: 100 },
      { name: "Tuesday", covered: data.rescueCoverageTuesday, x: 200 },
      { name: "Wednesday", covered: data.rescueCoverageWednesday, x: 300 },
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
          y: height - 195,
          width: 100,
          height: 25,
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
