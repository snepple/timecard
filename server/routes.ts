import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTimesheetSchema } from "@shared/schema";
import { z } from "zod";
import nodemailer from "nodemailer";

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

  const httpServer = createServer(app);
  return httpServer;
}
