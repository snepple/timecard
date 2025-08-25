import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeName: text("employee_name").notNull(),
  employeeNumber: text("employee_number").notNull(),
  weekEnding: text("week_ending").notNull(),
  
  // Daily time entries
  sundayDate: text("sunday_date"),
  sundayStartTime: text("sunday_start_time"),
  sundayEndTime: text("sunday_end_time"),
  sundayTotalHours: decimal("sunday_total_hours", { precision: 5, scale: 2 }),
  
  mondayDate: text("monday_date"),
  mondayStartTime: text("monday_start_time"),
  mondayEndTime: text("monday_end_time"),
  mondayTotalHours: decimal("monday_total_hours", { precision: 5, scale: 2 }),
  
  tuesdayDate: text("tuesday_date"),
  tuesdayStartTime: text("tuesday_start_time"),
  tuesdayEndTime: text("tuesday_end_time"),
  tuesdayTotalHours: decimal("tuesday_total_hours", { precision: 5, scale: 2 }),
  
  wednesdayDate: text("wednesday_date"),
  wednesdayStartTime: text("wednesday_start_time"),
  wednesdayEndTime: text("wednesday_end_time"),
  wednesdayTotalHours: decimal("wednesday_total_hours", { precision: 5, scale: 2 }),
  
  thursdayDate: text("thursday_date"),
  thursdayStartTime: text("thursday_start_time"),
  thursdayEndTime: text("thursday_end_time"),
  thursdayTotalHours: decimal("thursday_total_hours", { precision: 5, scale: 2 }),
  
  fridayDate: text("friday_date"),
  fridayStartTime: text("friday_start_time"),
  fridayEndTime: text("friday_end_time"),
  fridayTotalHours: decimal("friday_total_hours", { precision: 5, scale: 2 }),
  
  saturdayDate: text("saturday_date"),
  saturdayStartTime: text("saturday_start_time"),
  saturdayEndTime: text("saturday_end_time"),
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
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
});

export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;

// Employee Numbers table for supervisor management
export const employeeNumbers = pgTable("employee_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeName: varchar("employee_name").notNull(),
  employeeNumber: varchar("employee_number").notNull().default(""),
  email: varchar("email"),
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
