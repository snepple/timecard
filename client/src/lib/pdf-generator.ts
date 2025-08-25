import jsPDF from "jspdf";

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
    const pdf = new jsPDF();
    
    // Set up the document
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    
    // Header
    pdf.text("Oakland Fire-Rescue", 20, 20);
    pdf.setFontSize(14);
    pdf.text("Weekly Time Sheet", 20, 30);
    
    // Employee Information
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Name: ${data.employeeName}`, 20, 50);
    pdf.text(`Number: ${data.employeeNumber}`, 120, 50);
    pdf.text(`Week Ending: ${data.weekEnding}`, 20, 60);
    
    // Signature line
    pdf.text("Signature: ___________________________", 20, 80);
    
    // Table headers
    const startY = 100;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    
    // Draw table structure
    pdf.line(20, startY, 190, startY); // Top line
    
    // Column headers
    pdf.text("Date", 50, startY + 10);
    pdf.text("Start Time", 80, startY + 10);
    pdf.text("End Time", 120, startY + 10);
    pdf.text("Total Hours", 150, startY + 10);
    
    pdf.line(20, startY + 15, 190, startY + 15); // Header separator
    
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
    
    pdf.setFont("helvetica", "normal");
    let currentY = startY + 25;
    
    days.forEach((day, index) => {
      pdf.text(day.name, 20, currentY);
      pdf.text(day.date || "", 50, currentY);
      pdf.text(formatTimeForPDF(day.start), 80, currentY);
      pdf.text(formatTimeForPDF(day.end), 120, currentY);
      pdf.text(formatHoursForPDF(day.total), 155, currentY);
      
      if (index < days.length - 1) {
        pdf.line(20, currentY + 5, 190, currentY + 5);
      }
      currentY += 15;
    });
    
    // Bottom line
    pdf.line(20, currentY, 190, currentY);
    
    // Total hours
    currentY += 20;
    pdf.setFont("helvetica", "bold");
    pdf.text("Total Hours for Week", 100, currentY);
    pdf.text(formatHoursForPDF(data.totalWeeklyHours), 155, currentY);
    
    // Weeknight Rescue Coverage
    currentY += 30;
    pdf.setFontSize(12);
    pdf.text("Weeknight Rescue Coverage", 20, currentY);
    
    currentY += 15;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    
    const coverageDays = [
      { name: "Monday", covered: data.rescueCoverageMonday },
      { name: "Tuesday", covered: data.rescueCoverageTuesday },
      { name: "Wednesday", covered: data.rescueCoverageWednesday },
      { name: "Thursday", covered: data.rescueCoverageThursday },
    ];
    
    let xPos = 20;
    coverageDays.forEach((day) => {
      pdf.text(day.name, xPos, currentY);
      pdf.text("1800-0600", xPos, currentY + 10);
      if (day.covered) {
        pdf.text("✓", xPos + 5, currentY + 20);
      }
      xPos += 40;
    });
    
    currentY += 35;
    pdf.text("***Weeknight Rescue Coverage will be paid out in monthly check***", 20, currentY);
    
    // Add signature if provided
    if (data.signatureData && data.signatureData.trim() !== '') {
      try {
        // Ensure the signature data has the proper data URL prefix
        const signatureData = data.signatureData.startsWith('data:') 
          ? data.signatureData 
          : `data:image/png;base64,${data.signatureData}`;
        pdf.addImage(signatureData, "PNG", 20, 75, 60, 15);
      } catch (error) {
        console.warn("Could not add signature to PDF, continuing without signature:", error);
        // Continue without signature rather than failing
      }
    }
    
    // Convert to base64
    const pdfOutput = pdf.output("arraybuffer");
    
    // Use a more memory-efficient method to convert to base64
    const uint8Array = new Uint8Array(pdfOutput);
    let binary = '';
    const chunkSize = 8192; // Process in chunks to avoid call stack issues
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64String = btoa(binary);
    return base64String;
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
