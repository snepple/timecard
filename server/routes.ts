import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTimesheetSchema, employeeNumbers, insertEmployeeNumberSchema } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import nodemailer from "nodemailer";

interface ScheduleCache {
  data: any;
  lastFetched: string;
}

let scheduleCache: ScheduleCache | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const emailSubmissionSchema = z.object({
  employeeNumber: z.string(),
  employeeEmail: z.string().email(),
  timesheetData: z.object({
    employeeName: z.string(),
    weekEnding: z.string(),
    pdfBuffer: z.string(), // base64 encoded PDF
  }),
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


  // Submit timesheet for approval
  app.post("/api/timesheets/:id/submit", async (req, res) => {
    try {
      const timesheet = await storage.submitTimesheet(req.params.id);
      if (!timesheet) {
        res.status(404).json({ message: "Timesheet not found" });
        return;
      }
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit timesheet" });
    }
  });

  // Get pending timesheets for supervisor approval
  app.get("/api/timesheets/pending", async (req, res) => {
    try {
      const timesheets = await storage.getPendingTimesheets();
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve pending timesheets" });
    }
  });

  // Approve timesheet
  app.post("/api/timesheets/:id/approve", async (req, res) => {
    try {
      const { supervisorName, comments } = req.body;
      if (!supervisorName) {
        res.status(400).json({ message: "Supervisor name is required" });
        return;
      }
      const timesheet = await storage.approveTimesheet(req.params.id, supervisorName, comments);
      if (!timesheet) {
        res.status(404).json({ message: "Timesheet not found" });
        return;
      }
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve timesheet" });
    }
  });

  // Reject timesheet
  app.post("/api/timesheets/:id/reject", async (req, res) => {
    try {
      const { supervisorName, comments } = req.body;
      if (!supervisorName || !comments) {
        res.status(400).json({ message: "Supervisor name and comments are required for rejection" });
        return;
      }
      const timesheet = await storage.rejectTimesheet(req.params.id, supervisorName, comments);
      if (!timesheet) {
        res.status(404).json({ message: "Timesheet not found" });
        return;
      }
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject timesheet" });
    }
  });

  // Get timesheets by status
  app.get("/api/timesheets/status/:status", async (req, res) => {
    try {
      const timesheets = await storage.getTimesheetsByStatus(req.params.status);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve timesheets by status" });
    }
  });

  // Get schedule data (employees and shifts)
  app.get("/api/schedule", async (req, res) => {
    try {
      // Force fresh fetch for debugging - check if cache is valid (less than 24 hours old)
      const now = new Date();
      const forceRefresh = req.query.refresh === 'true';
      if (!forceRefresh && scheduleCache && 
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
      // Week ending 8/24 should include Sunday 8/18 through Saturday 8/24
      const endDate = new Date(weekEnding); 
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6); // Go back 6 days to Sunday

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

  // Employee Numbers Management Routes
  
  // Get all employee numbers
  app.get("/api/employee-numbers", async (req, res) => {
    try {
      const employees = await storage.getEmployeeNumbers();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employee numbers:", error);
      res.status(500).json({ message: "Failed to fetch employee numbers" });
    }
  });

  // Create employee number
  app.post("/api/employee-numbers", async (req, res) => {
    try {
      const validatedData = insertEmployeeNumberSchema.parse(req.body);
      const [employee] = await db.insert(employeeNumbers).values(validatedData).returning();
      res.json(employee);
    } catch (error) {
      console.error("Error creating employee number:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create employee number" });
      }
    }
  });

  // Update employee number
  app.put("/api/employee-numbers/:id", async (req, res) => {
    try {
      const validatedData = insertEmployeeNumberSchema.parse(req.body);
      const [employee] = await db
        .update(employeeNumbers)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(employeeNumbers.id, req.params.id))
        .returning();
      
      if (!employee) {
        res.status(404).json({ message: "Employee number not found" });
        return;
      }
      
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee number:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update employee number" });
      }
    }
  });

  // Delete employee number
  app.delete("/api/employee-numbers/:id", async (req, res) => {
    try {
      const [employee] = await db
        .delete(employeeNumbers)
        .where(eq(employeeNumbers.id, req.params.id))
        .returning();
      
      if (!employee) {
        res.status(404).json({ message: "Employee number not found" });
        return;
      }
      
      res.json({ message: "Employee number deleted successfully" });
    } catch (error) {
      console.error("Error deleting employee number:", error);
      res.status(500).json({ message: "Failed to delete employee number" });
    }
  });

  // Get employee email by employee number
  app.get("/api/employee-numbers/:employeeNumber/email", async (req, res) => {
    try {
      const email = await storage.getEmployeeEmail(req.params.employeeNumber);
      res.json({ email: email || null });
    } catch (error) {
      console.error("Error fetching employee email:", error);
      res.status(500).json({ message: "Failed to fetch employee email" });
    }
  });

  // Update employee email
  app.put("/api/employee-numbers/:employeeNumber/email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        res.status(400).json({ message: "Valid email address is required" });
        return;
      }

      await storage.updateEmployeeEmail(req.params.employeeNumber, email);
      res.json({ message: "Email updated successfully" });
    } catch (error) {
      console.error("Error updating employee email:", error);
      res.status(500).json({ message: "Failed to update employee email" });
    }
  });

  // Email submission endpoint
  app.post("/api/timesheet/submit-email", async (req, res) => {
    try {
      console.log("Email submission request received");
      const validatedData = emailSubmissionSchema.parse(req.body);
      const { employeeNumber, employeeEmail, timesheetData } = validatedData;
      console.log("Email validation passed for employee:", employeeNumber);

      // Store employee email for future use
      await db
        .update(employeeNumbers)
        .set({ email: employeeEmail, updatedAt: new Date() })
        .where(eq(employeeNumbers.employeeNumber, employeeNumber));

      // Get email configuration
      const recipientEmail = await storage.getSetting('timesheet_recipient_email') || 'supervisor@oaklandfire.gov';
      const emailTemplate = await storage.getSetting('timesheet_email_template') || `Subject: Weekly Timesheet Submission - {employeeName}

Dear Supervisor,

A new weekly timesheet has been submitted for your review:

Employee: {employeeName}
Week Ending: {weekEnding}

The completed timesheet is attached as a PDF for your review and approval.

Please review the hours and approve or provide feedback as needed.

Best regards,
Oakland Fire-Rescue Timesheet System`;

      // Parse email template to extract subject and body
      const subjectMatch = emailTemplate.match(/^Subject:\s*(.*)$/m);
      const subject = subjectMatch ? subjectMatch[1] : `Weekly Timesheet Submission - ${timesheetData.employeeName}`;
      const emailBody = emailTemplate.replace(/^Subject:.*$/m, '').trim();

      // Replace placeholders in subject and body
      const processedSubject = subject
        .replace(/\{employeeName\}/g, timesheetData.employeeName)
        .replace(/\{weekEnding\}/g, timesheetData.weekEnding);
      
      const processedBody = emailBody
        .replace(/\{employeeName\}/g, timesheetData.employeeName)
        .replace(/\{weekEnding\}/g, timesheetData.weekEnding);

      // Check if SMTP credentials are configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("SMTP credentials not configured");
        res.status(500).json({ message: "Email service not configured. Please contact administrator." });
        return;
      }

      // Set up email transport
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      console.log("Testing SMTP connection...");
      // Test the connection
      try {
        await transporter.verify();
        console.log("SMTP connection verified successfully");
      } catch (smtpError) {
        console.error("SMTP connection failed:", smtpError);
        res.status(500).json({ message: "Email service unavailable. Please try again later." });
        return;
      }

      // Convert base64 PDF to buffer
      console.log("Converting PDF buffer...");
      const pdfBuffer = Buffer.from(timesheetData.pdfBuffer.replace('data:application/pdf;base64,', ''), 'base64');
      console.log("PDF buffer size:", pdfBuffer.length, "bytes");

      // Send email
      const mailOptions = {
        from: employeeEmail,
        to: recipientEmail,
        cc: employeeEmail,
        subject: processedSubject,
        text: processedBody,
        attachments: [
          {
            filename: `Timesheet_${timesheetData.employeeName.replace(/\s+/g, '_')}_${timesheetData.weekEnding}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ],
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: "Timesheet submitted successfully via email" });
    } catch (error) {
      console.error("Error submitting timesheet via email:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to submit timesheet via email" });
      }
    }
  });

  // Sync employees from schedule
  app.post("/api/employee-numbers/sync", async (req, res) => {
    try {
      // Get current employees from schedule
      const scheduleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/schedule`);
      const scheduleData = await scheduleResponse.json();
      
      if (!scheduleData.employees) {
        res.status(400).json({ message: "No employee data in schedule" });
        return;
      }
      
      // Get existing employee names
      const existingEmployees = await db.select().from(employeeNumbers);
      const existingNames = new Set(existingEmployees.map(emp => emp.employeeName));
      
      // Add employees from schedule who don't exist
      const newEmployees = [];
      for (const emp of scheduleData.employees) {
        const fullName = `${emp.firstName} ${emp.lastName}`;
        if (!existingNames.has(fullName)) {
          try {
            const [newEmployee] = await db
              .insert(employeeNumbers)
              .values({ 
                employeeName: fullName, 
                employeeNumber: "" // Will be filled when they create timesheet
              })
              .returning();
            newEmployees.push(newEmployee);
          } catch (insertError) {
            // Skip if employee already exists (race condition)
            console.log(`Employee ${fullName} already exists, skipping`);
          }
        }
      }
      
      res.json({ 
        message: `Synced ${newEmployees.length} new employees from schedule`,
        newEmployees 
      });
    } catch (error) {
      console.error("Error syncing employees:", error);
      res.status(500).json({ message: "Failed to sync employees from schedule" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { password, type } = req.body;
      
      if (!password || !type) {
        res.status(400).json({ message: "Password and type are required" });
        return;
      }

      const settingKey = type === 'admin' ? 'admin_password' : 'app_password';
      const storedPassword = await storage.getSetting(settingKey);

      if (password === storedPassword) {
        res.json({ success: true, type });
      } else {
        res.status(401).json({ message: "Invalid password" });
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Password management routes (admin only)
  app.get("/api/settings/passwords", async (req, res) => {
    try {
      const appPassword = await storage.getSetting('app_password');
      const adminPassword = await storage.getSetting('admin_password');
      
      res.json({
        app_password: appPassword || '1888',
        admin_password: adminPassword || 'OFDAdmin1888'
      });
    } catch (error) {
      console.error("Error fetching passwords:", error);
      res.status(500).json({ message: "Failed to fetch passwords" });
    }
  });

  app.put("/api/settings/passwords", async (req, res) => {
    try {
      const { app_password, admin_password } = req.body;
      
      if (app_password) {
        await storage.setSetting('app_password', app_password);
      }
      
      if (admin_password) {
        await storage.setSetting('admin_password', admin_password);
      }
      
      res.json({ message: "Passwords updated successfully" });
    } catch (error) {
      console.error("Error updating passwords:", error);
      res.status(500).json({ message: "Failed to update passwords" });
    }
  });

  // Email settings routes (admin only)
  app.get("/api/settings/email", async (req, res) => {
    try {
      const recipientEmail = await storage.getSetting('timesheet_recipient_email');
      const emailTemplate = await storage.getSetting('timesheet_email_template');
      
      res.json({
        recipient_email: recipientEmail || 'supervisor@oaklandfire.gov',
        email_template: emailTemplate || `Subject: Weekly Timesheet Submission - {employeeName}

Dear Supervisor,

A new weekly timesheet has been submitted for your review:

Employee: {employeeName}
Week Ending: {weekEnding}

The completed timesheet is attached as a PDF for your review and approval.

Please review the hours and approve or provide feedback as needed.

Best regards,
Oakland Fire-Rescue Timesheet System`
      });
    } catch (error) {
      console.error("Error fetching email settings:", error);
      res.status(500).json({ message: "Failed to fetch email settings" });
    }
  });

  app.put("/api/settings/email", async (req, res) => {
    try {
      const { recipient_email, email_template } = req.body;
      
      if (recipient_email) {
        await storage.setSetting('timesheet_recipient_email', recipient_email);
      }
      
      if (email_template) {
        await storage.setSetting('timesheet_email_template', email_template);
      }
      
      res.json({ message: "Email settings updated successfully" });
    } catch (error) {
      console.error("Error updating email settings:", error);
      res.status(500).json({ message: "Failed to update email settings" });
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
      const summary = extractFieldServer(event, 'SUMMARY') || '';
      const nameParts = summary.split(' ');
      const fullName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : summary;
      
      const employee = {
        firstName: shift.employeeName.split(' ')[0] || '',
        lastName: shift.employeeName.split(' ')[1] || '',
        fullName: shift.employeeName,
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
    const summary = extractFieldServer(eventData, 'SUMMARY');
    const description = extractFieldServer(eventData, 'DESCRIPTION');
    
    if (!dtStart || !dtEnd || !summary) {
      return null;
    }

    const startTime = parseICSDateTimeServer(dtStart);
    const endTime = parseICSDateTimeServer(dtEnd);
    
    // Extract employee name from summary (e.g., "Tim Dow")
    const nameParts = summary.split(' ');
    if (nameParts.length < 2) {
      return null; // Need at least first and last name
    }
    
    const employeeFirst = nameParts[0];
    const employeeLast = nameParts[1];
    // Generate a simple employee number from name
    const employeeNumber = (employeeFirst + employeeLast).toLowerCase().replace(/[^a-z]/g, '');
    
    // Extract position from description if available, otherwise default
    const positionName = extractFromDescriptionServer(description || '', 'PositionName') || 'Firefighter';
    const duration = 8; // Default 8 hour shift

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
  // Handle multi-line fields in ICS format
  const lines = eventData.split('\n');
  let result = '';
  let inField = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith(`${fieldName}:`)) {
      inField = true;
      result = line.substring(fieldName.length + 1);
    } else if (inField && line.startsWith(' ')) {
      // Continuation line
      result += line.substring(1);
    } else if (inField) {
      // End of field
      break;
    }
  }
  
  return result ? result.trim() : null;
}

function extractFromDescriptionServer(description: string, fieldName: string): string {
  // Handle escaped newlines and other escape sequences
  const cleanDescription = description.replace(/\\n/g, '\n').replace(/\\,/g, ',');
  
  // Try multiple regex patterns for the field format
  const patterns = [
    new RegExp(`\\(${fieldName}:([^)]+)\\)`), // (FieldName:Value)
    new RegExp(`\\(${fieldName}: ([^)]+)\\)`), // (FieldName: Value) - with space
    new RegExp(`${fieldName}:([^)\\n]+)`)    // FieldName:Value without parentheses
  ];
  
  for (const pattern of patterns) {
    const match = cleanDescription.match(pattern);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }
  
  return '';
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
