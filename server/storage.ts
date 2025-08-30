import { type Timesheet, type InsertTimesheet, type EmployeeNumber, type InsertEmployeeNumber, type Setting, type InsertSetting, timesheets, employeeNumbers, settings } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Timesheet operations
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  getTimesheet(id: string): Promise<Timesheet | undefined>;
  getTimesheetsByEmployee(employeeNumber: string): Promise<Timesheet[]>;
  getTimesheetsByWeek(weekEnding: string): Promise<Timesheet[]>;
  updateTimesheet(id: string, timesheet: Partial<InsertTimesheet>): Promise<Timesheet | undefined>;
  
  // Employee number operations
  getEmployeeNumbers(): Promise<EmployeeNumber[]>;
  getEmployeeNumber(id: string): Promise<EmployeeNumber | undefined>;
  getEmployeeByNumber(employeeNumber: string): Promise<EmployeeNumber | undefined>;
  createEmployeeNumber(employee: InsertEmployeeNumber): Promise<EmployeeNumber>;
  updateEmployeeNumber(id: string, employee: Partial<InsertEmployeeNumber>): Promise<EmployeeNumber | undefined>;
  getEmployeeEmail(employeeNumber: string): Promise<string | undefined>;
  updateEmployeeEmail(employeeNumber: string, email: string): Promise<void>;
  
  // Approval workflow operations
  submitTimesheet(id: string): Promise<Timesheet | undefined>;
  getPendingTimesheets(): Promise<Timesheet[]>;
  approveTimesheet(id: string, supervisorName: string, comments?: string): Promise<Timesheet | undefined>;
  rejectTimesheet(id: string, supervisorName: string, comments: string): Promise<Timesheet | undefined>;
  getTimesheetsByStatus(status: string): Promise<Timesheet[]>;
  
  // Delete operations
  deleteEmployeeNumber(id: string): Promise<void>;
  
  // Settings operations
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  initializeDefaultSettings(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, any>;
  private timesheets: Map<string, Timesheet>;

  constructor() {
    this.users = new Map();
    this.timesheets = new Map();
  }

  async getUser(id: string): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<any> {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTimesheet(insertTimesheet: InsertTimesheet): Promise<Timesheet> {
    const id = randomUUID();
    const timesheet: Timesheet = {
      ...insertTimesheet,
      id,
      status: insertTimesheet.status || "draft",
      createdAt: new Date().toISOString(),
    };
    this.timesheets.set(id, timesheet);
    return timesheet;
  }

  async getTimesheet(id: string): Promise<Timesheet | undefined> {
    return this.timesheets.get(id);
  }

  async getTimesheetsByEmployee(employeeNumber: string): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values()).filter(
      (timesheet) => timesheet.employeeNumber === employeeNumber
    );
  }

  async updateTimesheet(id: string, updates: Partial<InsertTimesheet>): Promise<Timesheet | undefined> {
    const existing = this.timesheets.get(id);
    if (!existing) return undefined;
    
    const updated: Timesheet = {
      ...existing,
      ...updates,
    };
    this.timesheets.set(id, updated);
    return updated;
  }

  // Approval workflow operations
  async submitTimesheet(id: string): Promise<Timesheet | undefined> {
    const existing = this.timesheets.get(id);
    if (!existing) return undefined;
    
    const updated: Timesheet = {
      ...existing,
      status: "submitted",
      submittedAt: new Date(),
    };
    this.timesheets.set(id, updated);
    return updated;
  }

  async getPendingTimesheets(): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values()).filter(
      (timesheet) => timesheet.status === "submitted"
    );
  }

  async approveTimesheet(id: string, supervisorName: string, comments?: string): Promise<Timesheet | undefined> {
    const existing = this.timesheets.get(id);
    if (!existing) return undefined;
    
    const updated: Timesheet = {
      ...existing,
      status: "approved",
      approvedBy: supervisorName,
      approvedAt: new Date(),
      supervisorComments: comments || null,
    };
    this.timesheets.set(id, updated);
    return updated;
  }

  async rejectTimesheet(id: string, supervisorName: string, comments: string): Promise<Timesheet | undefined> {
    const existing = this.timesheets.get(id);
    if (!existing) return undefined;
    
    const updated: Timesheet = {
      ...existing,
      status: "rejected",
      approvedBy: supervisorName,
      approvedAt: new Date(),
      supervisorComments: comments,
    };
    this.timesheets.set(id, updated);
    return updated;
  }

  async getTimesheetsByStatus(status: string): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values()).filter(
      (timesheet) => timesheet.status === status
    );
  }

  async getTimesheetsByWeek(weekEnding: string): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values()).filter(
      (timesheet) => timesheet.weekEnding === weekEnding
    );
  }

  async getEmployeeNumbers(): Promise<EmployeeNumber[]> {
    return [];
  }

  async getEmployeeNumber(id: string): Promise<EmployeeNumber | undefined> {
    return undefined;
  }

  async getEmployeeByNumber(employeeNumber: string): Promise<EmployeeNumber | undefined> {
    return undefined;
  }

  async createEmployeeNumber(employee: InsertEmployeeNumber): Promise<EmployeeNumber> {
    const id = randomUUID();
    const newEmployee: EmployeeNumber = {
      ...employee,
      id,
      employeeNumber: employee.employeeNumber || "",
      email: employee.email || null,
      active: employee.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newEmployee;
  }

  async updateEmployeeNumber(id: string, employee: Partial<InsertEmployeeNumber>): Promise<EmployeeNumber | undefined> {
    return undefined;
  }

  async getEmployeeEmail(employeeNumber: string): Promise<string | undefined> {
    // For MemStorage, we don't have persistent employee data, so return undefined
    return undefined;
  }

  async updateEmployeeEmail(employeeNumber: string, email: string): Promise<void> {
    // For MemStorage, we don't persist employee data
    return;
  }

  async deleteEmployeeNumber(id: string): Promise<void> {
    // For MemStorage, no persistent data to delete
    return;
  }

  async getSetting(key: string): Promise<string | undefined> {
    return undefined;
  }

  async setSetting(key: string, value: string): Promise<void> {
    return;
  }

  async initializeDefaultSettings(): Promise<void> {
    return;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<any | undefined> {
    // Auth operations - placeholder for now
    return undefined;
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    // Auth operations - placeholder for now
    return undefined;
  }

  async createUser(user: any): Promise<any> {
    // Auth operations - placeholder for now
    return user;
  }

  // Timesheet operations
  async createTimesheet(insertTimesheet: InsertTimesheet): Promise<Timesheet> {
    const [timesheet] = await db.insert(timesheets).values(insertTimesheet).returning();
    return timesheet;
  }

  async getTimesheet(id: string): Promise<Timesheet | undefined> {
    const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return timesheet;
  }

  async getTimesheetsByEmployee(employeeNumber: string): Promise<Timesheet[]> {
    return await db.select().from(timesheets).where(eq(timesheets.employeeNumber, employeeNumber));
  }

  async updateTimesheet(id: string, updates: Partial<InsertTimesheet>): Promise<Timesheet | undefined> {
    const [updated] = await db.update(timesheets).set(updates).where(eq(timesheets.id, id)).returning();
    return updated;
  }

  // Employee number operations
  async getEmployeeNumbers(): Promise<EmployeeNumber[]> {
    return await db.select().from(employeeNumbers);
  }

  async getEmployeeNumber(id: string): Promise<EmployeeNumber | undefined> {
    const [employee] = await db.select().from(employeeNumbers).where(eq(employeeNumbers.id, id));
    return employee;
  }

  async getEmployeeByNumber(employeeNumber: string): Promise<EmployeeNumber | undefined> {
    const [employee] = await db.select().from(employeeNumbers).where(eq(employeeNumbers.employeeNumber, employeeNumber));
    return employee;
  }

  async createEmployeeNumber(employee: InsertEmployeeNumber): Promise<EmployeeNumber> {
    const [newEmployee] = await db.insert(employeeNumbers).values(employee).returning();
    return newEmployee;
  }

  async updateEmployeeNumber(id: string, employee: Partial<InsertEmployeeNumber>): Promise<EmployeeNumber | undefined> {
    const [updated] = await db.update(employeeNumbers)
      .set({ ...employee, updatedAt: new Date() })
      .where(eq(employeeNumbers.id, id))
      .returning();
    return updated;
  }

  async getEmployeeEmail(employeeNumber: string): Promise<string | undefined> {
    const [employee] = await db.select({ email: employeeNumbers.email })
      .from(employeeNumbers)
      .where(eq(employeeNumbers.employeeNumber, employeeNumber));
    return employee?.email || undefined;
  }

  async updateEmployeeEmail(employeeNumber: string, email: string): Promise<void> {
    await db.update(employeeNumbers)
      .set({ email, updatedAt: new Date() })
      .where(eq(employeeNumbers.employeeNumber, employeeNumber));
  }

  // Approval workflow operations
  async submitTimesheet(id: string): Promise<Timesheet | undefined> {
    const [updated] = await db.update(timesheets)
      .set({ status: "submitted", submittedAt: new Date() })
      .where(eq(timesheets.id, id))
      .returning();
    return updated;
  }

  async getPendingTimesheets(): Promise<Timesheet[]> {
    return await db.select().from(timesheets).where(eq(timesheets.status, "submitted"));
  }

  async approveTimesheet(id: string, supervisorName: string, comments?: string): Promise<Timesheet | undefined> {
    const [updated] = await db.update(timesheets)
      .set({
        status: "approved",
        approvedBy: supervisorName,
        approvedAt: new Date(),
        supervisorComments: comments || null,
      })
      .where(eq(timesheets.id, id))
      .returning();
    return updated;
  }

  async rejectTimesheet(id: string, supervisorName: string, comments: string): Promise<Timesheet | undefined> {
    const [updated] = await db.update(timesheets)
      .set({
        status: "rejected",
        approvedBy: supervisorName,
        approvedAt: new Date(),
        supervisorComments: comments,
      })
      .where(eq(timesheets.id, id))
      .returning();
    return updated;
  }

  async getTimesheetsByStatus(status: string): Promise<Timesheet[]> {
    return await db.select().from(timesheets).where(eq(timesheets.status, status));
  }

  async getTimesheetsByWeek(weekEnding: string): Promise<Timesheet[]> {
    return await db.select().from(timesheets).where(eq(timesheets.weekEnding, weekEnding));
  }

  async deleteEmployeeNumber(id: string): Promise<void> {
    await db.delete(employeeNumbers).where(eq(employeeNumbers.id, id));
  }

  // Settings operations
  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() }
      });
  }

  async initializeDefaultSettings(): Promise<void> {
    // Initialize default passwords if they don't exist
    const appPassword = await this.getSetting('app_password');
    if (!appPassword) {
      await this.setSetting('app_password', '1888');
    }

    const adminPassword = await this.getSetting('admin_password');
    if (!adminPassword) {
      await this.setSetting('admin_password', 'OFDAdmin1888');
    }

    // Initialize default email settings
    const timesheetEmail = await this.getSetting('timesheet_recipient_email');
    if (!timesheetEmail) {
      await this.setSetting('timesheet_recipient_email', 'supervisor@oaklandfire.gov');
    }

    const emailTemplate = await this.getSetting('timesheet_email_template');
    if (!emailTemplate) {
      const defaultTemplate = `Subject: Weekly Timesheet Submission - {employeeName}

Dear Supervisor,

A new weekly timesheet has been submitted for your review:

Employee: {employeeName}
Week Ending: {weekEnding}

The completed timesheet is attached as a PDF for your review and approval.

Please review the hours and approve or provide feedback as needed.

Best regards,
Oakland Fire-Rescue Timesheet System`;
      await this.setSetting('timesheet_email_template', defaultTemplate);
    }
  }
}

export const storage = new DatabaseStorage();
