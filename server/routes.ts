import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTimesheetSchema, employeeNumbers, insertEmployeeNumberSchema } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import nodemailer from "nodemailer";
import * as XLSX from "xlsx";

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

// Helper function to parse shift times from JSON data
function parseShiftTimes(shiftsJson: string | null): string[] {
  if (!shiftsJson) return [];
  
  try {
    const shifts = JSON.parse(shiftsJson);
    if (!Array.isArray(shifts)) return [];
    
    return shifts.map(shift => {
      if (shift.startTime && shift.endTime) {
        return `${shift.startTime} - ${shift.endTime}`;
      }
      return '';
    }).filter(time => time !== '');
  } catch (error) {
    console.error('Error parsing shift times:', error);
    return [];
  }
}

// Helper function to send email notification when employee edits their timesheet
async function sendEmployeeEditNotificationEmail(editedTimesheet: any, originalTimesheet: any, editComments: string) {
  try {
    // Get supervisor email from settings
    const supervisorEmail = await storage.getSetting('timesheet_recipient_email') || 'supervisor@oaklandfire.gov';
    
    if (!supervisorEmail) {
      console.log('No supervisor email configured for employee edit notifications');
      return;
    }

    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("SMTP credentials not configured");
      return;
    }

    // Create email transporter
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Create email content
    const subject = `Employee Edit Alert - ${editedTimesheet.employeeName} - Week Ending ${editedTimesheet.weekEnding}`;
    
    const emailBody = `
Dear Supervisor,

An employee has edited their previously submitted timesheet and requires re-approval:

Employee: ${editedTimesheet.employeeName}
Employee Number: ${editedTimesheet.employeeNumber}
Week Ending: ${editedTimesheet.weekEnding}
Edit Date: ${new Date().toLocaleDateString()}

=== EMPLOYEE EDIT COMMENTS ===
${editComments}
================================

Action Required:
The employee's timesheet has been updated and resubmitted. Please review the changes and provide approval or feedback as needed. The timesheet is now pending your approval again.

The employee's comments above explain what changes were made. Please review these changes carefully along with the updated timesheet data.

You can access the updated timesheet through the supervisor dashboard to review the changes and approve or reject as necessary.

Best regards,
Oakland Fire-Rescue Timesheet System
    `;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: supervisorEmail,
      subject: subject,
      text: emailBody,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Employee edit notification email sent to ${supervisorEmail}`);
  } catch (error) {
    console.error('Error sending employee edit notification email:', error);
    throw error;
  }
}

// Helper function to send edit notification email to employee
async function sendEditNotificationEmail(editedTimesheet: any, originalTimesheet: any, editReason: string) {
  try {
    // Find employee email
    const employees = await storage.getEmployeeNumbers();
    const employee = employees.find(emp => 
      emp.employeeNumber === editedTimesheet.employeeNumber || 
      emp.employeeName === editedTimesheet.employeeName
    );
    
    if (!employee?.email) {
      console.log(`No email found for employee ${editedTimesheet.employeeName}`);
      return;
    }

    // Create email transporter (similar to other email functions in the app)
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // Generate PDF of the edited timesheet
    const { generateTimeSheetPDF } = await import('../client/src/lib/pdf-generator');
    const pdfData = {
      employeeName: editedTimesheet.employeeName,
      employeeNumber: editedTimesheet.employeeNumber,
      weekEnding: editedTimesheet.weekEnding,
      sundayDate: editedTimesheet.sundayDate,
      sundayTotalHours: parseFloat(editedTimesheet.sundayTotalHours || '0'),
      mondayDate: editedTimesheet.mondayDate,
      mondayTotalHours: parseFloat(editedTimesheet.mondayTotalHours || '0'),
      tuesdayDate: editedTimesheet.tuesdayDate,
      tuesdayTotalHours: parseFloat(editedTimesheet.tuesdayTotalHours || '0'),
      wednesdayDate: editedTimesheet.wednesdayDate,
      wednesdayTotalHours: parseFloat(editedTimesheet.wednesdayTotalHours || '0'),
      thursdayDate: editedTimesheet.thursdayDate,
      thursdayTotalHours: parseFloat(editedTimesheet.thursdayTotalHours || '0'),
      fridayDate: editedTimesheet.fridayDate,
      fridayTotalHours: parseFloat(editedTimesheet.fridayTotalHours || '0'),
      saturdayDate: editedTimesheet.saturdayDate,
      saturdayTotalHours: parseFloat(editedTimesheet.saturdayTotalHours || '0'),
      totalWeeklyHours: parseFloat(editedTimesheet.totalWeeklyHours || '0'),
      rescueCoverageMonday: editedTimesheet.rescueCoverageMonday,
      rescueCoverageTuesday: editedTimesheet.rescueCoverageTuesday,
      rescueCoverageWednesday: editedTimesheet.rescueCoverageWednesday,
      rescueCoverageThursday: editedTimesheet.rescueCoverageThursday,
      signatureData: editedTimesheet.signatureData,
      isEdited: true,
      editedBy: editedTimesheet.editedBy,
      editedAt: editedTimesheet.editedAt,
    };

    // Note: In a real implementation, we'd generate the PDF on the server
    // For now, we'll send notification without PDF attachment
    const emailHtml = `
      <h2>Timecard Edited - Oakland Fire Department</h2>
      <p>Dear ${editedTimesheet.employeeName},</p>
      
      <p>Your timecard for the week ending ${editedTimesheet.weekEnding} has been edited by ${editedTimesheet.editedBy}.</p>
      
      <h3>Edit Details:</h3>
      <p><strong>Reason for Edit:</strong> ${editReason}</p>
      <p><strong>Edited by:</strong> ${editedTimesheet.editedBy}</p>
      <p><strong>Edit Date:</strong> ${new Date(editedTimesheet.editedAt).toLocaleString()}</p>
      
      <h3>Updated Hours:</h3>
      <ul>
        <li>Sunday: ${editedTimesheet.sundayTotalHours || 0} hours</li>
        <li>Monday: ${editedTimesheet.mondayTotalHours || 0} hours</li>
        <li>Tuesday: ${editedTimesheet.tuesdayTotalHours || 0} hours</li>
        <li>Wednesday: ${editedTimesheet.wednesdayTotalHours || 0} hours</li>
        <li>Thursday: ${editedTimesheet.thursdayTotalHours || 0} hours</li>
        <li>Friday: ${editedTimesheet.fridayTotalHours || 0} hours</li>
        <li>Saturday: ${editedTimesheet.saturdayTotalHours || 0} hours</li>
      </ul>
      <p><strong>Total Weekly Hours:</strong> ${editedTimesheet.totalWeeklyHours || 0}</p>
      
      <p>Please review the updated timecard in the system. If you have any questions about these changes, please contact your supervisor.</p>
      
      <p>Best regards,<br>Oakland Fire Department</p>
    `;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: employee.email,
      subject: `Timecard Edited - Week Ending ${editedTimesheet.weekEnding}`,
      html: emailHtml,
    });

    console.log(`Edit notification email sent to ${employee.email}`);
  } catch (error) {
    console.error('Error sending edit notification email:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create timesheet
  app.post("/api/timesheets", async (req, res) => {
    try {
      const validatedData = insertTimesheetSchema.parse(req.body);
      const timesheet = await storage.createTimesheet(validatedData);
      
      // Log activity based on who completed the timecard
      try {
        if (timesheet.completedBy === 'supervisor') {
          await storage.createActivityLog({
            timesheetId: timesheet.id,
            activityType: "completed_by_supervisor",
            performedBy: "Fire Chief", // Default supervisor name
            employeeName: timesheet.employeeName,
            weekEnding: timesheet.weekEnding,
            details: "Supervisor completed timecard on behalf of employee"
          });
        } else {
          await storage.createActivityLog({
            timesheetId: timesheet.id,
            activityType: "submitted",
            performedBy: timesheet.employeeName,
            employeeName: timesheet.employeeName,
            weekEnding: timesheet.weekEnding,
            details: "Employee created and submitted timecard"
          });
        }
      } catch (logError) {
        console.error("Failed to log timesheet creation activity:", logError);
      }
      
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

  // Edit timesheet by supervisor
  app.post("/api/timesheets/:id/edit", async (req, res) => {
    try {
      const timesheetId = req.params.id;
      const { supervisorName, editReason, ...timesheetData } = req.body;
      
      if (!supervisorName || !editReason) {
        res.status(400).json({ message: "Supervisor name and edit reason are required" });
        return;
      }

      // Get the original timesheet first
      const originalTimesheet = await storage.getTimesheet(timesheetId);
      if (!originalTimesheet) {
        res.status(404).json({ message: "Timesheet not found" });
        return;
      }

      // Store original data as JSON backup
      const originalData = JSON.stringify(originalTimesheet);
      
      // Update the timesheet with edited data and tracking information
      const editedTimesheet = await storage.updateTimesheet(timesheetId, {
        ...timesheetData,
        isEdited: true,
        editedBy: supervisorName,
        editedAt: new Date(),
        originalTimesheetData: originalData,
      });

      if (!editedTimesheet) {
        res.status(404).json({ message: "Failed to edit timesheet" });
        return;
      }

      // Log edit activity
      try {
        await storage.createActivityLog({
          timesheetId: editedTimesheet.id,
          activityType: "edited",
          performedBy: supervisorName,
          employeeName: editedTimesheet.employeeName,
          weekEnding: editedTimesheet.weekEnding,
          details: `Supervisor edited timecard. Reason: ${editReason}`
        });
      } catch (logError) {
        console.error("Failed to log edit activity:", logError);
      }

      // Send email notification to employee
      try {
        await sendEditNotificationEmail(editedTimesheet, originalTimesheet, editReason);
      } catch (emailError) {
        console.error("Failed to send edit notification email:", emailError);
        // Continue even if email fails
      }

      res.json(editedTimesheet);
    } catch (error) {
      console.error("Error editing timesheet:", error);
      res.status(500).json({ message: "Failed to edit timesheet" });
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
      
      // Log submission activity
      try {
        await storage.createActivityLog({
          timesheetId: timesheet.id,
          activityType: "submitted",
          performedBy: timesheet.employeeName,
          employeeName: timesheet.employeeName,
          weekEnding: timesheet.weekEnding,
          details: "Employee submitted timecard for approval"
        });
      } catch (logError) {
        console.error("Failed to log submission activity:", logError);
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

  // Activity log endpoint
  app.get("/api/timecards/:timesheetId/activity-log", async (req, res) => {
    try {
      const { timesheetId } = req.params;
      const activityLog = await storage.getActivityLogByTimesheet(timesheetId);
      res.json(activityLog);
    } catch (error) {
      console.error("Error fetching activity log:", error);
      res.status(500).json({ error: "Failed to fetch activity log" });
    }
  });

  // Get existing timesheet by employee and week
  app.get("/api/timesheets/employee/:employeeNumber/:weekEnding", async (req, res) => {
    try {
      const { employeeNumber, weekEnding } = req.params;
      const timesheets = await storage.getTimesheetsByEmployee(employeeNumber);
      const existingTimesheet = timesheets.find(ts => ts.weekEnding === weekEnding);
      
      if (existingTimesheet) {
        res.json(existingTimesheet);
      } else {
        res.status(404).json({ message: "No timesheet found for this week" });
      }
    } catch (error) {
      console.error("Error fetching existing timesheet:", error);
      res.status(500).json({ error: "Failed to fetch existing timesheet" });
    }
  });

  // Employee edit endpoint for previously submitted timesheets
  app.post("/api/timesheets/:id/employee-edit", async (req, res) => {
    try {
      const { id } = req.params;
      const { editComments, ...updatedTimesheetData } = req.body;
      
      // Validate edit comments are provided
      if (!editComments || editComments.trim().length === 0) {
        return res.status(400).json({ error: "Edit comments are required" });
      }
      
      // Get the existing timesheet
      const existingTimesheet = await storage.getTimesheetById(id);
      if (!existingTimesheet) {
        return res.status(404).json({ error: "Timesheet not found" });
      }
      
      if (existingTimesheet.status !== 'submitted') {
        return res.status(400).json({ error: "Only submitted timesheets can be edited by employees" });
      }
      
      // Update the timesheet with employee edits
      const updatedTimesheet = await storage.updateTimesheet(id, {
        ...updatedTimesheetData,
        editComments,
        isEditingPreviousSubmission: true,
        employeeEditedAt: new Date().toISOString(),
        originalSubmissionDate: existingTimesheet.submittedAt,
        status: 'submitted', // Keep as submitted, but mark as edited
        submittedAt: new Date().toISOString(), // Update submission time
      });
      
      // Log the employee edit activity
      await storage.createActivityLog({
        timesheetId: id,
        activityType: 'employee_edited',
        performedBy: existingTimesheet.employeeName,
        details: `Employee edited timesheet with comments: ${editComments}`,
        employeeName: existingTimesheet.employeeName,
        weekEnding: existingTimesheet.weekEnding,
      });
      
      // Send email notification to supervisor
      try {
        await sendEmployeeEditNotificationEmail(updatedTimesheet, existingTimesheet, editComments);
      } catch (emailError) {
        console.error("Failed to send employee edit notification email:", emailError);
        // Don't fail the request if email fails
      }
      
      res.json(updatedTimesheet);
    } catch (error) {
      console.error("Error processing employee edit:", error);
      res.status(500).json({ error: "Failed to process employee edit" });
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

  // Employee activity analysis endpoint
  app.post("/api/employee-numbers/analyze-activity", async (req, res) => {
    try {
      console.log('🔍 Starting employee activity analysis...');
      
      // Calculate date ranges
      const now = new Date();
      const oneWeekAhead = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      
      console.log(`📅 Analysis period: ${threeMonthsAgo.toISOString().split('T')[0]} to ${oneWeekAhead.toISOString().split('T')[0]}`);
      
      // Get all employees from database
      const employees = await storage.getEmployeeNumbers();
      
      // Get historical schedule data by fetching calendar with extended range
      const icsUrl = "https://calendar.google.com/calendar/ical/a8849ae98edd64f3a91a66f2c0efc31ab7b867e0637db7f1386ea74e61cdd406%40group.calendar.google.com/public/basic.ics";
      const response = await fetch(icsUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.status}`);
      }
      
      const icsData = await response.text();
      const scheduleData = parseICSDataOnServer(icsData);
      
      // Filter shifts to our analysis period (3 months ago to 1 week ahead)
      const relevantShifts = scheduleData.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= threeMonthsAgo && shiftDate <= oneWeekAhead;
      });
      
      // Analyze each employee's activity
      let activatedCount = 0;
      let deactivatedCount = 0;
      
      for (const employee of employees) {
        const employeeShifts = relevantShifts.filter(shift => 
          shift.employeeNumber === employee.employeeNumber ||
          shift.employeeName === employee.employeeName
        );
        
        // Check for shifts in the next week
        const nextWeekShifts = employeeShifts.filter(shift => {
          const shiftDate = new Date(shift.date);
          return shiftDate >= now && shiftDate <= oneWeekAhead;
        });
        
        // Check for shifts in the last 3 months
        const historicalShifts = employeeShifts.filter(shift => {
          const shiftDate = new Date(shift.date);
          return shiftDate >= threeMonthsAgo && shiftDate < now;
        });
        
        const hasRecentActivity = historicalShifts.length > 0;
        const hasUpcomingShifts = nextWeekShifts.length > 0;
        const shouldBeActive = hasRecentActivity || hasUpcomingShifts;
        
        console.log(`👤 ${employee.employeeName} (${employee.employeeNumber}): Historical=${historicalShifts.length}, Upcoming=${nextWeekShifts.length}, Should be active=${shouldBeActive}, Currently active=${employee.active}`);
        
        // Update employee status if needed
        if (shouldBeActive && employee.active === false) {
          // Reactivate employee
          await db
            .update(employeeNumbers)
            .set({ 
              active: true,
              updatedAt: new Date()
            })
            .where(eq(employeeNumbers.id, employee.id));
          activatedCount++;
          console.log(`✅ Activated ${employee.employeeName} - has upcoming or recent shifts`);
        } else if (!shouldBeActive && employee.active !== false) {
          // Deactivate employee
          await db
            .update(employeeNumbers)
            .set({ 
              active: false,
              updatedAt: new Date()
            })
            .where(eq(employeeNumbers.id, employee.id));
          deactivatedCount++;
          console.log(`❌ Deactivated ${employee.employeeName} - no shifts in last 3 months or next week`);
        }
      }
      
      const message = `Employee activity analysis completed. ${activatedCount} employees activated, ${deactivatedCount} employees deactivated based on scheduling patterns.`;
      console.log(`✅ ${message}`);
      
      res.json({ 
        message,
        analysisParams: {
          startDate: threeMonthsAgo.toISOString().split('T')[0],
          endDate: oneWeekAhead.toISOString().split('T')[0],
          totalEmployees: employees.length,
          relevantShifts: relevantShifts.length
        },
        results: {
          activatedCount,
          deactivatedCount
        }
      });
    } catch (error) {
      console.error('❌ Error during employee activity analysis:', error);
      res.status(500).json({ message: "Failed to analyze employee activity" });
    }
  });

  // Sync employee database with schedule data
  app.post("/api/employee-numbers/sync", async (req, res) => {
    try {
      // Get current schedule data
      const scheduleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/schedule`);
      const scheduleData = await scheduleResponse.json();
      
      // Use employee-based approach to update existing employees
      if (scheduleData.employees) {
        // Use the shifts data to update existing employees only
        const employees = await storage.getEmployeeNumbers();
        const employeeMap = new Map<string, { name: string, number: string }>();
        
        scheduleData.shifts.forEach((shift: any) => {
          // Extract employee number from description if available
          const description = shift.description || '';
          const actualEmployeeNumber = extractFromDescriptionServer(description, 'EmployeeNumber');
          
          // Use actual employee number if found, otherwise use shift's employee number
          const employeeNumber = actualEmployeeNumber || shift.employeeNumber;
          
          if (employeeNumber && shift.employeeName) {
            employeeMap.set(shift.employeeName, {
              name: shift.employeeName,
              number: employeeNumber
            });
          }
        });

        // Update existing employees only, never create new ones
        let syncedCount = 0;
        for (const [employeeName, empData] of employeeMap) {
          try {
            // Find existing employee by name
            const existing = employees.find(emp => emp.employeeName === employeeName);
            
            if (existing && !existing.employeeNumber) {
              // Update employee with extracted number
              await db
                .update(employeeNumbers)
                .set({ 
                  employeeNumber: empData.number,
                  updatedAt: new Date()
                })
                .where(eq(employeeNumbers.id, existing.id));
              syncedCount++;
              console.log(`✅ Updated ${employeeName} with employee number: ${empData.number}`);
            }
          } catch (error) {
            console.error(`Error syncing employee ${employeeName}:`, error);
          }
        }

        res.json({ 
          message: `Employee sync completed. ${syncedCount} employees updated with IDs.`,
          totalEmployees: employeeMap.size,
          syncedCount 
        });
      } else if (scheduleData.employees) {
        // Only update existing employees, never create new ones to avoid duplicates
        const employees = await storage.getEmployeeNumbers();
        
        let syncedCount = 0;
        
        // Try to update employee numbers for existing employees
        for (const emp of scheduleData.employees) {
          const fullName = `${emp.firstName} ${emp.lastName}`;
          const nameBasedId = (emp.firstName + emp.lastName).toLowerCase().replace(/[^a-z]/g, '');
          
          // Find existing employee in database
          const existingEmployee = employees.find(e => e.employeeName === fullName);
          
          if (existingEmployee && !existingEmployee.employeeNumber) {
            try {
              // Get shifts for this employee to try extracting actual employee number
              const shiftResponse = await fetch(`${req.protocol}://${req.get('host')}/api/schedule/employee/${nameBasedId}/week/2025-09-20`);
              if (shiftResponse.ok) {
                const shifts = await shiftResponse.json();
                if (shifts.length > 0) {
                  const shift = shifts[0];
                  const description = shift.description || '';
                  const actualEmployeeNumber = extractFromDescriptionServer(description, 'EmployeeNumber');
                  
                  // Use actual employee number if found, otherwise use name-based as fallback
                  const employeeNumberToUse = actualEmployeeNumber || nameBasedId;
                  
                  if (employeeNumberToUse) {
                    await db
                      .update(employeeNumbers)
                      .set({ 
                        employeeNumber: employeeNumberToUse,
                        updatedAt: new Date()
                      })
                      .where(eq(employeeNumbers.id, existingEmployee.id));
                    console.log(`✅ Updated ${fullName} with employee number: ${employeeNumberToUse}`);
                    syncedCount++;
                  }
                }
              }
            } catch (error) {
              console.log(`⚠️ Could not extract employee number for ${fullName}:`, error);
            }
          }
        }
        
        res.json({ 
          message: `Employee sync completed. ${syncedCount} employees updated with IDs.`,
          totalEmployees: scheduleData.employees.length,
          syncedCount 
        });
      } else {
        res.status(404).json({ message: "No schedule data available" });
      }
    } catch (error) {
      console.error("Error syncing employee data:", error);
      res.status(500).json({ message: "Failed to sync employee data" });
    }
  });

  // Admin timecard summary endpoint
  app.get("/api/admin/timecard-summary/:weekEnding", async (req, res) => {
    try {
      const { weekEnding } = req.params;
      
      // Get overtime threshold setting
      const overtimeThreshold = parseFloat(await storage.getSetting('overtime_threshold') || '42');
      
      // Get all employees from schedule
      const scheduleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/schedule`);
      const scheduleData = await scheduleResponse.json();
      
      // Get all submitted timesheets for this week
      const timesheets = await storage.getTimesheetsByWeek(weekEnding);
      
      // Get scheduled shifts for this week
      const weekStart = new Date(weekEnding);
      weekStart.setDate(weekStart.getDate() - 6); // Get Sunday
      
      const summary = [];
      
      for (const employee of scheduleData.employees) {
        const fullName = `${employee.firstName} ${employee.lastName}`;
        
        // Check if employee has submitted timesheet
        const submittedTimesheet = timesheets.find(ts => 
          ts.employeeNumber === employee.employeeNumber || 
          ts.employeeName === fullName
        );
        
        if (submittedTimesheet) {
          // Employee submitted timesheet - use their data
          const totalHours = parseFloat(submittedTimesheet.totalWeeklyHours || '0');
          const regularHours = Math.min(totalHours, overtimeThreshold);
          const overtimeHours = Math.max(0, totalHours - overtimeThreshold);
          
          summary.push({
            employeeName: fullName,
            employeeNumber: employee.employeeNumber,
            hasTimesheet: true,
            timesheetId: submittedTimesheet.id,
            completedBy: submittedTimesheet.completedBy || 'employee',
            
            // Edit tracking information
            isEdited: submittedTimesheet.isEdited || false,
            editedBy: submittedTimesheet.editedBy,
            editedAt: submittedTimesheet.editedAt,
            
            sunday: submittedTimesheet.sundayTotalHours || 0,
            monday: submittedTimesheet.mondayTotalHours || 0,
            tuesday: submittedTimesheet.tuesdayTotalHours || 0,
            wednesday: submittedTimesheet.wednesdayTotalHours || 0,
            thursday: submittedTimesheet.thursdayTotalHours || 0,
            friday: submittedTimesheet.fridayTotalHours || 0,
            saturday: submittedTimesheet.saturdayTotalHours || 0,
            totalHours: totalHours,
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            shiftTimes: {
              sunday: parseShiftTimes(submittedTimesheet.sundayShifts),
              monday: parseShiftTimes(submittedTimesheet.mondayShifts),
              tuesday: parseShiftTimes(submittedTimesheet.tuesdayShifts),
              wednesday: parseShiftTimes(submittedTimesheet.wednesdayShifts),
              thursday: parseShiftTimes(submittedTimesheet.thursdayShifts),
              friday: parseShiftTimes(submittedTimesheet.fridayShifts),
              saturday: parseShiftTimes(submittedTimesheet.saturdayShifts)
            }
          });
        } else {
          // Employee didn't submit - use scheduled hours
          try {
            const shiftsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/schedule/employee/${employee.employeeNumber}/week/${weekEnding}`);
            const shifts = shiftsResponse.ok ? await shiftsResponse.json() : [];
            
            // Calculate daily totals and times from schedule
            const dailyHours = {
              sunday: 0, monday: 0, tuesday: 0, wednesday: 0, 
              thursday: 0, friday: 0, saturday: 0
            };
            
            const shiftTimes = {
              sunday: [] as string[], monday: [] as string[], tuesday: [] as string[], 
              wednesday: [] as string[], thursday: [] as string[], friday: [] as string[], 
              saturday: [] as string[]
            };
            
            shifts.forEach((shift: any) => {
              // Skip Night Duty shifts
              if (shift.position === 'Night Duty') {
                return;
              }
              
              const shiftDate = new Date(shift.startTime);
              const dayName = shiftDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                timeZone: 'America/New_York'
              }).toLowerCase();
              if (dailyHours.hasOwnProperty(dayName)) {
                dailyHours[dayName as keyof typeof dailyHours] += shift.duration || 0;
                
                // Format shift times (convert from UTC to Eastern Time)
                const startTime = new Date(shift.startTime).toLocaleTimeString('en-US', { 
                  hour: 'numeric', minute: '2-digit', hour12: true,
                  timeZone: 'America/New_York'
                });
                const endTime = new Date(shift.endTime).toLocaleTimeString('en-US', { 
                  hour: 'numeric', minute: '2-digit', hour12: true,
                  timeZone: 'America/New_York'
                });
                shiftTimes[dayName as keyof typeof shiftTimes].push(`${startTime} - ${endTime}`);
              }
            });
            
            const totalScheduled = Object.values(dailyHours).reduce((sum, hours) => sum + hours, 0);
            
            if (totalScheduled > 0) {
              const regularHours = Math.min(totalScheduled, overtimeThreshold);
              const overtimeHours = Math.max(0, totalScheduled - overtimeThreshold);
              
              summary.push({
                employeeName: fullName,
                employeeNumber: employee.employeeNumber,
                hasTimesheet: false,
                timesheetId: null,
                ...dailyHours,
                totalHours: totalScheduled,
                regularHours: regularHours,
                overtimeHours: overtimeHours,
                shiftTimes
              });
            }
          } catch (error) {
            console.error(`Error fetching shifts for ${fullName}:`, error);
          }
        }
      }
      
      res.json({ summary, weekEnding });
    } catch (error) {
      console.error("Error generating timecard summary:", error);
      res.status(500).json({ message: "Failed to generate timecard summary" });
    }
  });

  // Excel export endpoint for timecard summary
  app.get("/api/admin/timecard-summary/:weekEnding/export", async (req, res) => {
    try {
      const { weekEnding } = req.params;
      
      // Get overtime threshold setting
      const overtimeThreshold = parseFloat(await storage.getSetting('overtime_threshold') || '42');
      
      // Get all employees from schedule
      const scheduleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/schedule`);
      const scheduleData = await scheduleResponse.json();
      
      // Get all submitted timesheets for this week
      const timesheets = await storage.getTimesheetsByWeek(weekEnding);
      
      // Calculate week dates for column headers
      const weekEndDate = new Date(weekEnding);
      const weekDates = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(weekEndDate);
        date.setDate(weekEndDate.getDate() - i);
        weekDates.push(date);
      }
      
      const summary = [];
      
      for (const employee of scheduleData.employees) {
        const fullName = `${employee.firstName} ${employee.lastName}`;
        
        // Check if employee has submitted timesheet
        const submittedTimesheet = timesheets.find(ts => 
          ts.employeeNumber === employee.employeeNumber || 
          ts.employeeName === fullName
        );
        
        if (submittedTimesheet) {
          // Employee submitted timesheet - use their data
          const totalHours = parseFloat(submittedTimesheet.totalWeeklyHours || '0');
          const regularHours = Math.min(totalHours, overtimeThreshold);
          const overtimeHours = Math.max(0, totalHours - overtimeThreshold);
          
          summary.push({
            "Employee Name": fullName,
            "Employee Number": employee.employeeNumber,
            "Status": "Submitted",
            [`Sun ${weekDates[0].getMonth() + 1}/${weekDates[0].getDate()}`]: submittedTimesheet.sundayTotalHours || 0,
            [`Mon ${weekDates[1].getMonth() + 1}/${weekDates[1].getDate()}`]: submittedTimesheet.mondayTotalHours || 0,
            [`Tue ${weekDates[2].getMonth() + 1}/${weekDates[2].getDate()}`]: submittedTimesheet.tuesdayTotalHours || 0,
            [`Wed ${weekDates[3].getMonth() + 1}/${weekDates[3].getDate()}`]: submittedTimesheet.wednesdayTotalHours || 0,
            [`Thu ${weekDates[4].getMonth() + 1}/${weekDates[4].getDate()}`]: submittedTimesheet.thursdayTotalHours || 0,
            [`Fri ${weekDates[5].getMonth() + 1}/${weekDates[5].getDate()}`]: submittedTimesheet.fridayTotalHours || 0,
            [`Sat ${weekDates[6].getMonth() + 1}/${weekDates[6].getDate()}`]: submittedTimesheet.saturdayTotalHours || 0,
            "Total Hours": totalHours,
            "Regular Hours": regularHours,
            "Overtime Hours": overtimeHours
          });
        } else {
          // Employee didn't submit - use scheduled hours
          try {
            const shiftsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/schedule/employee/${employee.employeeNumber}/week/${weekEnding}`);
            const shifts = shiftsResponse.ok ? await shiftsResponse.json() : [];
            
            // Calculate daily totals from schedule
            const dailyHours = {
              Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, 
              Thursday: 0, Friday: 0, Saturday: 0
            };
            
            shifts.forEach((shift: any) => {
              // Skip Night Duty shifts
              if (shift.position === 'Night Duty') {
                return;
              }
              
              const shiftDate = new Date(shift.startTime);
              const dayName = shiftDate.toLocaleDateString('en-US', { weekday: 'long' });
              if (dailyHours.hasOwnProperty(dayName)) {
                dailyHours[dayName as keyof typeof dailyHours] += shift.duration || 0;
              }
            });
            
            const totalScheduled = Object.values(dailyHours).reduce((sum, hours) => sum + hours, 0);
            
            if (totalScheduled > 0) {
              const regularHours = Math.min(totalScheduled, overtimeThreshold);
              const overtimeHours = Math.max(0, totalScheduled - overtimeThreshold);
              
              summary.push({
                "Employee Name": fullName,
                "Employee Number": employee.employeeNumber,
                "Status": "Scheduled",
                [`Sun ${weekDates[0].getMonth() + 1}/${weekDates[0].getDate()}`]: dailyHours.Sunday,
                [`Mon ${weekDates[1].getMonth() + 1}/${weekDates[1].getDate()}`]: dailyHours.Monday,
                [`Tue ${weekDates[2].getMonth() + 1}/${weekDates[2].getDate()}`]: dailyHours.Tuesday,
                [`Wed ${weekDates[3].getMonth() + 1}/${weekDates[3].getDate()}`]: dailyHours.Wednesday,
                [`Thu ${weekDates[4].getMonth() + 1}/${weekDates[4].getDate()}`]: dailyHours.Thursday,
                [`Fri ${weekDates[5].getMonth() + 1}/${weekDates[5].getDate()}`]: dailyHours.Friday,
                [`Sat ${weekDates[6].getMonth() + 1}/${weekDates[6].getDate()}`]: dailyHours.Saturday,
                "Total Hours": totalScheduled,
                "Regular Hours": regularHours,
                "Overtime Hours": overtimeHours
              });
            }
          } catch (error) {
            console.error(`Error fetching shifts for ${fullName}:`, error);
          }
        }
      }
      
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(summary);
      
      // Set column widths
      const colWidths = [
        { wch: 20 }, // Employee Name
        { wch: 15 }, // Employee Number
        { wch: 12 }, // Status
        { wch: 10 }, // Sunday
        { wch: 10 }, // Monday
        { wch: 10 }, // Tuesday
        { wch: 12 }, // Wednesday
        { wch: 10 }, // Thursday
        { wch: 10 }, // Friday
        { wch: 10 }, // Saturday
        { wch: 12 }, // Total Hours
        { wch: 12 }, // Regular Hours
        { wch: 13 }  // Overtime Hours
      ];
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      const sheetName = `Timecard Summary ${weekEnding}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate Excel file buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      const fileName = `timecard-summary-${weekEnding}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send the Excel file
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating Excel export:", error);
      res.status(500).json({ message: "Failed to generate Excel export" });
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

  // Overtime threshold settings
  app.get("/api/settings/overtime", async (req, res) => {
    try {
      const overtimeThreshold = await storage.getSetting('overtime_threshold');
      
      res.json({
        overtime_threshold: parseFloat(overtimeThreshold || '42')
      });
    } catch (error) {
      console.error("Error fetching overtime settings:", error);
      res.status(500).json({ message: "Failed to fetch overtime settings" });
    }
  });

  app.put("/api/settings/overtime", async (req, res) => {
    try {
      const { overtime_threshold } = req.body;
      
      if (overtime_threshold !== undefined) {
        await storage.setSetting('overtime_threshold', overtime_threshold.toString());
      }
      
      res.json({ message: "Overtime settings updated successfully" });
    } catch (error) {
      console.error("Error updating overtime settings:", error);
      res.status(500).json({ message: "Failed to update overtime settings" });
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
      
      // Use full name as key to prevent duplicates of the same person
      // If this employee already exists, keep the one with a proper numeric employee number
      const existingEmployee = employeeMap.get(employee.fullName);
      if (existingEmployee) {
        // Keep the employee with a numeric employee number if possible
        const currentIsNumeric = /^\d+$/.test(employee.employeeNumber);
        const existingIsNumeric = /^\d+$/.test(existingEmployee.employeeNumber);
        
        if (currentIsNumeric && !existingIsNumeric) {
          // Replace with the numeric employee number
          employeeMap.set(employee.fullName, employee);
        } else if (!currentIsNumeric && existingIsNumeric) {
          // Keep existing numeric employee number
          // Don't update
        } else {
          // Both are numeric or both are non-numeric, keep the first one
          // Don't update to avoid duplicates
        }
      } else {
        employeeMap.set(employee.fullName, employee);
      }
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
    
    // Extract actual employee number from description (e.g., "(EmployeeNumber:936)")
    const actualEmployeeNumber = extractFromDescriptionServer(description || '', 'EmployeeNumber');
    
    // Use actual employee number if available, otherwise fallback to name-based
    const employeeNumber = actualEmployeeNumber || (employeeFirst + employeeLast).toLowerCase().replace(/[^a-z]/g, '');
    
    // Extract position from description if available, otherwise default
    const positionName = extractFromDescriptionServer(description || '', 'PositionName') || 'Firefighter';
    
    // Extract duration from description (e.g., "(ShiftDuration:14)")
    let duration = parseFloat(extractFromDescriptionServer(description || '', 'ShiftDuration') || '0');
    
    // If ShiftDuration is missing or 0, calculate from start/end times
    if (duration === 0) {
      const diffInMs = endTime.getTime() - startTime.getTime();
      duration = diffInMs / (1000 * 60 * 60); // Convert to hours
    }
    
    // Fallback to 8 hours if calculation failed
    if (duration <= 0 || isNaN(duration)) {
      duration = 8;
    }

    return {
      employeeNumber,
      employeeName: `${employeeFirst} ${employeeLast}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
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

function extractFieldServer(eventData: string, fieldName: string): string | null {
  // Handle multi-line fields in ICS format
  const lines = eventData.split('\n');
  let result = '';
  let inField = false;
  
  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i]; // Keep original line to check for leading space/tab
    const line = lines[i].trim();
    
    if (line.startsWith(`${fieldName}:`)) {
      inField = true;
      result = line.substring(fieldName.length + 1);
    } else if (inField && (originalLine.startsWith(' ') || originalLine.startsWith('\t'))) {
      // Continuation line (starts with space or tab)
      result += originalLine.substring(1); // Remove the leading space/tab
    } else if (inField && originalLine.trim() !== '') {
      // End of field (non-empty line that doesn't start with space/tab)
      break;
    }
  }
  
  
  return result ? result.trim() : null;
}

function extractFromDescriptionServer(description: string, fieldName: string): string {
  // Handle escaped newlines and other escape sequences
  const cleanDescription = description.replace(/\\n/g, '\n').replace(/\\,/g, ',');
  
  // Special handling for EmployeeNumber since it's being split across lines
  if (fieldName === 'EmployeeNumber') {
    // First, try to reconstruct the split pattern
    // Remove newlines but preserve other structure
    let reconstructed = cleanDescription;
    
    // Handle specific case where "Employee" is split as "Emplo\nyeeNumber"
    reconstructed = reconstructed.replace(/Emplo\s*\n\s*yeeNumber/g, 'EmployeeNumber');
    
    // Handle other potential splits
    reconstructed = reconstructed.replace(/Employee\s*\n\s*Number/g, 'EmployeeNumber');
    
    // Now look for the standard pattern
    const empMatch = reconstructed.match(/\(EmployeeNumber:(\d+)\)/);
    if (empMatch) {
      return empMatch[1];
    }
    
    // Alternative approach: look for 3-4 digit numbers after any "emplo" text (case insensitive)
    const patterns = [
      /\([^)]*[Ee]mplo[^)]*:(\d{3,4})\)/,  // (anything with "emplo":908)
      /[Ee]mplo[^:]{0,20}:(\d{3,4})/,      // emplo....:908
      /\(ShiftEmpID:\d+\)[^(]*\([^)]*:(\d{3,4})\)/, // Look after ShiftEmpID
    ];
    
    for (const pattern of patterns) {
      const match = cleanDescription.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Final fallback: look for any 3-4 digit number in parentheses after position data
    const fallbackMatch = cleanDescription.match(/\(PositionName:[^)]+\)[^(]*\([^)]*:(\d{3,4})\)/);
    if (fallbackMatch) {
      return fallbackMatch[1];
    }
  }
  
  // Remove all newlines and extra whitespace to handle fields split across lines
  const singleLineDescription = cleanDescription.replace(/\n/g, '').replace(/\s+/g, ' ');
  
  // Try multiple regex patterns for the field format
  const patterns = [
    new RegExp(`\\(${fieldName}:([^)]+)\\)`), // (FieldName:Value)
    new RegExp(`\\(${fieldName}: ([^)]+)\\)`), // (FieldName: Value) - with space
    new RegExp(`${fieldName}:([^)\\n]+)`)    // FieldName:Value without parentheses
  ];
  
  for (const pattern of patterns) {
    const match = singleLineDescription.match(pattern);
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
