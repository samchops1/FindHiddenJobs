import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp } from "drizzle-orm/pg-core";
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

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  scrapedAt: true,
});

export const insertSearchSchema = createInsertSchema(searches).omit({
  id: true,
  searchedAt: true,
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
