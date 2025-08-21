import { pgTable, text, timestamp, uuid, boolean, jsonb, integer, varchar } from 'drizzle-orm/pg-core';

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
  notificationTime: varchar('notification_time', { length: 5 }).default('21:00'), // 9PM EST
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
  applicationStatus: varchar('application_status', { length: 50 }), // applied, interviewing, rejected, offer
  notes: text('notes'),
  jobData: jsonb('job_data').$type<any>() // Store full job data for reference
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
  emailType: varchar('email_type', { length: 50 }).notNull(), // daily_recommendations, welcome, etc
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