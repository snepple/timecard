import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeName: text("employee_name").notNull(),
  employeeNumber: text("employee_number").notNull(),
  weekEnding: text("week_ending").notNull(),
  
  // Daily time entries - now supporting multiple shifts per day
  sundayDate: text("sunday_date"),
  sundayShifts: text("sunday_shifts").default("[]"), // JSON array of shift objects
  sundayTotalHours: decimal("sunday_total_hours", { precision: 5, scale: 2 }),
  
  mondayDate: text("monday_date"),
  mondayShifts: text("monday_shifts").default("[]"), // JSON array of shift objects
  mondayTotalHours: decimal("monday_total_hours", { precision: 5, scale: 2 }),
  
  tuesdayDate: text("tuesday_date"),
  tuesdayShifts: text("tuesday_shifts").default("[]"), // JSON array of shift objects
  tuesdayTotalHours: decimal("tuesday_total_hours", { precision: 5, scale: 2 }),
  
  wednesdayDate: text("wednesday_date"),
  wednesdayShifts: text("wednesday_shifts").default("[]"), // JSON array of shift objects
  wednesdayTotalHours: decimal("wednesday_total_hours", { precision: 5, scale: 2 }),
  
  thursdayDate: text("thursday_date"),
  thursdayShifts: text("thursday_shifts").default("[]"), // JSON array of shift objects
  thursdayTotalHours: decimal("thursday_total_hours", { precision: 5, scale: 2 }),
  
  fridayDate: text("friday_date"),
  fridayShifts: text("friday_shifts").default("[]"), // JSON array of shift objects
  fridayTotalHours: decimal("friday_total_hours", { precision: 5, scale: 2 }),
  
  saturdayDate: text("saturday_date"),
  saturdayShifts: text("saturday_shifts").default("[]"), // JSON array of shift objects
  saturdayTotalHours: decimal("saturday_total_hours", { precision: 5, scale: 2 }),
  
  totalWeeklyHours: decimal("total_weekly_hours", { precision: 6, scale: 2 }),
  
  // Rescue coverage
  rescueCoverageMonday: boolean("rescue_coverage_monday").default(false),
  rescueCoverageTuesday: boolean("rescue_coverage_tuesday").default(false),
  rescueCoverageWednesday: boolean("rescue_coverage_wednesday").default(false),
  rescueCoverageThursday: boolean("rescue_coverage_thursday").default(false),
  
  // Signature
  signatureData: text("signature_data"),
  
  // Approval workflow
  status: text("status").default("draft").notNull(), // draft, submitted, approved, rejected
  submittedAt: timestamp("submitted_at"),
  supervisorComments: text("supervisor_comments"),
  approvedBy: text("approved_by"), // supervisor name/id
  approvedAt: timestamp("approved_at"),
  completedBy: text("completed_by"), // "employee" or "supervisor" - indicates who completed the timecard
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
});

export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;

// Type for individual shift entries within a day
export interface DayShift {
  startTime: string;
  endTime: string;
  hours: number;
}

// Helper type for timesheet form data that includes parsed shifts
export interface TimesheetFormData extends Omit<InsertTimesheet, 
  'sundayShifts' | 'mondayShifts' | 'tuesdayShifts' | 'wednesdayShifts' | 
  'thursdayShifts' | 'fridayShifts' | 'saturdayShifts'> {
  sundayShifts: DayShift[];
  mondayShifts: DayShift[];
  tuesdayShifts: DayShift[];
  wednesdayShifts: DayShift[];
  thursdayShifts: DayShift[];
  fridayShifts: DayShift[];
  saturdayShifts: DayShift[];
}

// Employee Numbers table for supervisor management
export const employeeNumbers = pgTable("employee_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeName: varchar("employee_name").notNull(),
  employeeNumber: varchar("employee_number").notNull().default(""),
  email: varchar("email"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmployeeNumberSchema = createInsertSchema(employeeNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EmployeeNumber = typeof employeeNumbers.$inferSelect;
export type InsertEmployeeNumber = z.infer<typeof insertEmployeeNumberSchema>;

// Settings table for storing app configuration
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: varchar("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
