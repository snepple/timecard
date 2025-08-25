import { type Timesheet, type InsertTimesheet } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Timesheet operations
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  getTimesheet(id: string): Promise<Timesheet | undefined>;
  getTimesheetsByEmployee(employeeNumber: string): Promise<Timesheet[]>;
  updateTimesheet(id: string, timesheet: Partial<InsertTimesheet>): Promise<Timesheet | undefined>;
  
  // Employee email operations
  getEmployeeEmail(employeeNumber: string): Promise<string | undefined>;
  updateEmployeeEmail(employeeNumber: string, email: string): Promise<void>;
  
  // Approval workflow operations
  submitTimesheet(id: string): Promise<Timesheet | undefined>;
  getPendingTimesheets(): Promise<Timesheet[]>;
  approveTimesheet(id: string, supervisorName: string, comments?: string): Promise<Timesheet | undefined>;
  rejectTimesheet(id: string, supervisorName: string, comments: string): Promise<Timesheet | undefined>;
  getTimesheetsByStatus(status: string): Promise<Timesheet[]>;
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

  async getEmployeeEmail(employeeNumber: string): Promise<string | undefined> {
    // For MemStorage, we don't have persistent employee data, so return undefined
    return undefined;
  }

  async updateEmployeeEmail(employeeNumber: string, email: string): Promise<void> {
    // For MemStorage, we don't persist employee data
    return;
  }
}

export const storage = new MemStorage();
