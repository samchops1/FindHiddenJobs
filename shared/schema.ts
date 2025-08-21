import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, boolean } from "drizzle-orm/pg-core";
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
  location: z.enum(["all", "remote", "onsite", "hybrid", "united-states"]).default("all"),
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
