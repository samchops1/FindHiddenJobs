import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, boolean, uuid, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  description: text("description"),
  url: text("url").notNull(),
  logo: text("logo"),
  platform: text("platform").notNull(),
  tags: json("tags").$type<string[]>().default([]),
  postedAt: timestamp("posted_at"),
  scrapedAt: timestamp("scraped_at").defaultNow(),
});

export const searches = pgTable("searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  platform: text("platform").notNull(),
  resultCount: text("result_count"),
  searchedAt: timestamp("searched_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User preferences table
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique(),
  jobTypes: jsonb('job_types').$type<string[]>().default([]),
  industries: jsonb('industries').$type<string[]>().default([]),
  locations: jsonb('locations').$type<string[]>().default([]),
  experienceLevel: varchar('experience_level', { length: 50 }),
  desiredSalary: jsonb('desired_salary').$type<{ min?: number; max?: number; currency?: string }>(),
  resumeUrl: text('resume_url'),
  resumeAnalysis: jsonb('resume_analysis').$type<{
    skills?: string[];
    experience?: string[];
    education?: string[];
    keywords?: string[];
  }>(),
  emailNotifications: boolean('email_notifications').default(true),
  notificationTime: varchar('notification_time', { length: 5 }).default('21:00'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Saved jobs table
export const savedJobs = pgTable('saved_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  jobUrl: text('job_url').notNull(),
  jobTitle: text('job_title').notNull(),
  company: text('company').notNull(),
  location: text('location'),
  platform: varchar('platform', { length: 50 }),
  savedAt: timestamp('saved_at').defaultNow(),
  applied: boolean('applied').default(false),
  appliedAt: timestamp('applied_at'),
  applicationStatus: varchar('application_status', { length: 50 }),
  notes: text('notes'),
  jobData: jsonb('job_data').$type<any>()
});

// Job applications table
export const jobApplications = pgTable('job_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  savedJobId: uuid('saved_job_id').references(() => savedJobs.id),
  jobUrl: text('job_url').notNull(),
  jobTitle: text('job_title').notNull(),
  company: text('company').notNull(),
  appliedAt: timestamp('applied_at').defaultNow(),
  status: varchar('status', { length: 50 }).default('applied'),
  followUpDate: timestamp('follow_up_date'),
  interviewDates: jsonb('interview_dates').$type<Date[]>(),
  notes: text('notes')
});

// Email logs table
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  emailType: varchar('email_type', { length: 50 }).notNull(),
  sentAt: timestamp('sent_at').defaultNow(),
  jobsSent: jsonb('jobs_sent').$type<string[]>(),
  opened: boolean('opened').default(false),
  openedAt: timestamp('opened_at'),
  clickedJobs: jsonb('clicked_jobs').$type<string[]>().default([])
});

// User search history for recommendations
export const searchHistory = pgTable('search_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  query: text('query').notNull(),
  filters: jsonb('filters').$type<any>(),
  resultsCount: integer('results_count'),
  clickedJobs: jsonb('clicked_jobs').$type<string[]>().default([]),
  searchedAt: timestamp('searched_at').defaultNow()
});

// Resume analysis results
export const resumeAnalysis = pgTable('resume_analysis', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  analysis: jsonb('analysis').$type<{
    skills: string[];
    experience: {
      title: string;
      company: string;
      duration: string;
      description: string;
    }[];
    education: {
      degree: string;
      school: string;
      year: string;
    }[];
    keywords: string[];
    suggestedJobTitles: string[];
    experienceLevel: string;
  }>().notNull(),
  analyzedAt: timestamp('analyzed_at').defaultNow()
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  scrapedAt: true,
});

export const insertSearchSchema = createInsertSchema(searches).omit({
  id: true,
  searchedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const searchRequestSchema = z.object({
  query: z.string().min(1, "Job title is required"),
  site: z.string().min(1, "Platform is required"),
  location: z.enum(["all", "remote", "onsite", "hybrid", "united-states"]).default("all").optional(),
  timeFilter: z.enum(["all", "h1", "h4", "h8", "h12", "d", "h48", "h72", "w", "m"]).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(25),
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type Search = typeof searches.$inferSelect;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;

// Export types for new tables
export type UserPreferences = typeof userPreferences.$inferSelect;
export type SavedJob = typeof savedJobs.$inferSelect;
export type JobApplication = typeof jobApplications.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type SearchHistoryEntry = typeof searchHistory.$inferSelect;
export type ResumeAnalysisResult = typeof resumeAnalysis.$inferSelect;
