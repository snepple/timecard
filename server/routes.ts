import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTimesheetSchema } from "@shared/schema";
import { z } from "zod";
import nodemailer from "nodemailer";

interface ScheduleCache {
  data: any;
  lastFetched: string;
}

let scheduleCache: ScheduleCache | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const emailConfigSchema = z.object({
  to: z.string().email(),
  employeeName: z.string(),
  weekEnding: z.string(),
  pdfBuffer: z.string(), // base64 encoded PDF
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create timesheet
  app.post("/api/timesheets", async (req, res) => {
    try {
      const validatedData = insertTimesheetSchema.parse(req.body);
      const timesheet = await storage.createTimesheet(validatedData);
      res.json(timesheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create timesheet" });
      }
    }
  });

  // Get timesheet by ID
  app.get("/api/timesheets/:id", async (req, res) => {
    try {
      const timesheet = await storage.getTimesheet(req.params.id);
      if (!timesheet) {
        res.status(404).json({ message: "Timesheet not found" });
        return;
      }
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve timesheet" });
    }
  });

  // Get timesheets by employee number
  app.get("/api/timesheets/employee/:employeeNumber", async (req, res) => {
    try {
      const timesheets = await storage.getTimesheetsByEmployee(req.params.employeeNumber);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve timesheets" });
    }
  });

  // Update timesheet
  app.patch("/api/timesheets/:id", async (req, res) => {
    try {
      const validatedData = insertTimesheetSchema.partial().parse(req.body);
      const timesheet = await storage.updateTimesheet(req.params.id, validatedData);
      if (!timesheet) {
        res.status(404).json({ message: "Timesheet not found" });
        return;
      }
      res.json(timesheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update timesheet" });
      }
    }
  });

  // Email timesheet
  app.post("/api/timesheets/email", async (req, res) => {
    try {
      const { to, employeeName, weekEnding, pdfBuffer } = emailConfigSchema.parse(req.body);
      
      // Configure nodemailer (you'll need to set up email credentials)
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: to,
        subject: `Weekly Time Sheet - ${employeeName} - Week Ending ${weekEnding}`,
        text: `Please find attached the weekly time sheet for ${employeeName} for the week ending ${weekEnding}.`,
        html: `
          <p>Dear Bonnie,</p>
          <p>Please find attached the weekly time sheet for <strong>${employeeName}</strong> for the week ending <strong>${weekEnding}</strong>.</p>
          <p>Best regards,<br>Oakland Fire-Rescue Timesheet System</p>
        `,
        attachments: [
          {
            filename: `${employeeName}_TimeSheet_${weekEnding.replace(/\//g, '')}.pdf`,
            content: Buffer.from(pdfBuffer, 'base64'),
            contentType: 'application/pdf',
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Email error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid email data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    }
  });

  // Get schedule data (employees and shifts)
  app.get("/api/schedule", async (req, res) => {
    try {
      // Check if cache is valid (less than 24 hours old)
      const now = new Date();
      if (scheduleCache && 
          (now.getTime() - new Date(scheduleCache.lastFetched).getTime()) < CACHE_DURATION) {
        res.json(scheduleCache.data);
        return;
      }

      // Fetch fresh data from calendar
      const icsUrl = "https://calendar.google.com/calendar/ical/a8849ae98edd64f3a91a66f2c0efc31ab7b867e0637db7f1386ea74e61cdd406%40group.calendar.google.com/public/basic.ics";
      const response = await fetch(icsUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.status}`);
      }

      const icsData = await response.text();
      
      // Parse ICS data (we'll need to import the parser here)
      const scheduleData = parseICSDataOnServer(icsData);
      
      // Update cache
      scheduleCache = {
        data: scheduleData,
        lastFetched: now.toISOString(),
      };

      res.json(scheduleData);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      res.status(500).json({ message: "Failed to fetch schedule data" });
    }
  });

  // Get shifts for specific employee and week
  app.get("/api/schedule/employee/:employeeNumber/week/:weekEnding", async (req, res) => {
    try {
      const { employeeNumber, weekEnding } = req.params;
      
      // Get schedule data
      const scheduleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/schedule`);
      const scheduleData = await scheduleResponse.json();
      
      if (!scheduleData.shifts) {
        res.status(404).json({ message: "No schedule data available" });
        return;
      }

      // Filter shifts for employee and week
      const endDate = new Date(weekEnding);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6); // Sunday to Saturday

      const employeeShifts = scheduleData.shifts.filter((shift: any) => {
        const shiftDate = new Date(shift.date);
        return shift.employeeNumber === employeeNumber &&
               shiftDate >= startDate && 
               shiftDate <= endDate;
      });

      res.json(employeeShifts);
    } catch (error) {
      console.error("Error fetching employee shifts:", error);
      res.status(500).json({ message: "Failed to fetch employee shifts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Simple ICS parser for server-side use
function parseICSDataOnServer(icsContent: string) {
  const events = extractVEventsServer(icsContent);
  const shifts: any[] = [];
  const employeeMap = new Map<string, any>();

  for (const event of events) {
    const shift = parseEventServer(event);
    if (shift) {
      shifts.push(shift);
      
      // Extract employee info
      const employee = {
        firstName: extractFromDescriptionServer(extractFieldServer(event, 'DESCRIPTION') || '', 'EmployeeFirst'),
        lastName: extractFromDescriptionServer(extractFieldServer(event, 'DESCRIPTION') || '', 'EmployeeLast'),
        fullName: extractEmployeeNameServer(event),
        employeeNumber: shift.employeeNumber,
      };
      
      employeeMap.set(employee.employeeNumber, employee);
    }
  }

  return {
    employees: Array.from(employeeMap.values()).sort((a: any, b: any) => a.fullName.localeCompare(b.fullName)),
    shifts,
    lastUpdated: new Date().toISOString(),
  };
}

function extractVEventsServer(icsContent: string): string[] {
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

function parseEventServer(eventData: string): any | null {
  try {
    const dtStart = extractFieldServer(eventData, 'DTSTART');
    const dtEnd = extractFieldServer(eventData, 'DTEND');
    const description = extractFieldServer(eventData, 'DESCRIPTION');
    
    if (!dtStart || !dtEnd || !description) return null;

    const startTime = parseICSDateTimeServer(dtStart);
    const endTime = parseICSDateTimeServer(dtEnd);
    const employeeNumber = extractFromDescriptionServer(description, 'EmployeeNumber');
    const employeeFirst = extractFromDescriptionServer(description, 'EmployeeFirst');
    const employeeLast = extractFromDescriptionServer(description, 'EmployeeLast');
    const positionName = extractFromDescriptionServer(description, 'PositionName');
    const duration = parseFloat(extractFromDescriptionServer(description, 'ShiftDuration') || '0');

    if (!employeeNumber || !employeeFirst || !employeeLast) return null;

    return {
      employeeNumber,
      employeeName: `${employeeFirst} ${employeeLast}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      position: positionName || 'Unknown',
      duration,
      date: startTime.toISOString().split('T')[0],
    };
  } catch (error) {
    console.error('Error parsing event:', error);
    return null;
  }
}

function extractFieldServer(eventData: string, fieldName: string): string | null {
  const regex = new RegExp(`^${fieldName}:(.*)$`, 'm');
  const match = eventData.match(regex);
  return match ? match[1].trim() : null;
}

function extractFromDescriptionServer(description: string, fieldName: string): string {
  const regex = new RegExp(`\\(${fieldName}:([^)]+)\\)`);
  const match = description.match(regex);
  return match ? match[1].trim() : '';
}

function extractEmployeeNameServer(eventData: string): string {
  const summary = extractFieldServer(eventData, 'SUMMARY');
  if (!summary) return '';
  
  // Extract name from summary like "Sam Nepple Per-Diem 7am-3pm"
  const parts = summary.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return '';
}

function parseICSDateTimeServer(dateTimeStr: string): Date {
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
