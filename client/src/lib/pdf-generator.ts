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
    
    // Header - centered
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.text("Oakland Fire-Rescue", pageWidth/2, 20, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text("Weekly Time Sheet", pageWidth/2, 35, { align: 'center' });
    
    // Employee Information
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Name: ${data.employeeName}`, 20, 55);
    pdf.text(`Number: ${data.employeeNumber}`, 120, 55);
    pdf.text(`Week Ending: ${data.weekEnding}`, 20, 70);
    
    // Signature line
    pdf.text("Signature: ___________________________", 20, 85);
    
    // Table headers with proper spacing to match the form
    const startY = 105;
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    
    // Column headers - positioned to match the form exactly
    pdf.text("Date", 65, startY);
    pdf.text("Start Time", 105, startY);
    pdf.text("End Time", 140, startY);
    pdf.text("Total Hours", 175, startY);
    
    // Days data with exact positioning to match form
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
    pdf.setFontSize(11);
    let currentY = startY + 20;
    
    days.forEach((day, index) => {
      // Day name - left aligned
      pdf.text(day.name, 20, currentY);
      
      // Date, times, and hours - positioned to match form columns
      pdf.text(day.date || "", 65, currentY);
      pdf.text(formatTimeForPDF(day.start), 105, currentY);
      pdf.text(formatTimeForPDF(day.end), 140, currentY);
      pdf.text(formatHoursForPDF(day.total), 175, currentY);
      
      currentY += 18; // Increased spacing to match form
    });
    
    // Total hours section - positioned to match form exactly  
    currentY += 15;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Total Hours for Week", 100, currentY);
    pdf.text(formatHoursForPDF(data.totalWeeklyHours), 165, currentY);
    pdf.text("0", 180, currentY); // Additional 0 as shown in form
    
    // Weeknight Rescue Coverage - centered like in the form
    currentY += 30;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Weeknight Rescue Coverage", pageWidth/2, currentY, { align: 'center' });
    
    currentY += 20;
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    
    // Position coverage days to match the form layout exactly
    const coverageDays = [
      { name: "Monday", covered: data.rescueCoverageMonday, x: 45 },
      { name: "Tuesday", covered: data.rescueCoverageTuesday, x: 85 },
      { name: "Wednesday", covered: data.rescueCoverageWednesday, x: 125 },
      { name: "Thursday", covered: data.rescueCoverageThursday, x: 170 },
    ];
    
    coverageDays.forEach((day) => {
      pdf.text(day.name, day.x, currentY);
      if (day.covered) {
        pdf.text("✓", day.x + 5, currentY + 15);
      }
    });
    
    currentY += 35;
    pdf.text("***Weeknight Rescue Coverage will be paid out in monthly check***", pageWidth/2, currentY, { align: 'center' });
    
    // Add signature if provided - positioned over the signature line
    if (data.signatureData && data.signatureData.trim() !== '') {
      try {
        // Ensure the signature data has the proper data URL prefix
        const signatureData = data.signatureData.startsWith('data:') 
          ? data.signatureData 
          : `data:image/png;base64,${data.signatureData}`;
        pdf.addImage(signatureData, "PNG", 80, 78, 60, 15); // Positioned over signature line
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
