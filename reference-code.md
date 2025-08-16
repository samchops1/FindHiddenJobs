# DirectHire Job Search Platform - Reference Code

This document contains the complete implementation of the DirectHire job search platform that scrapes live job listings from multiple ATS platforms.

## Architecture Overview

The application is a full-stack TypeScript application with:
- **Frontend**: React with Vite, TailwindCSS, and shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Scraping**: Cheerio for HTML parsing and node-fetch for HTTP requests
- **State Management**: TanStack Query for server state
- **Storage**: In-memory storage with interface-based design

## Key Features

1. **Multi-Platform Job Search**: Search across all major ATS platforms simultaneously
2. **Location Filtering**: Filter jobs by All Locations, Remote Only, or On-site Only
3. **Real-Time Scraping**: Live scraping of job listings from company career pages
4. **Smart Deduplication**: Removes duplicate job listings based on URL
5. **Responsive Design**: Mobile-first design with modern UI components

## Implementation Details

### Schema Definition (`shared/schema.ts`)

```typescript
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
  location: z.enum(["all", "remote", "onsite"]).default("all"),
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type Search = typeof searches.$inferSelect;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
```

### Backend Scraping Logic (`server/routes.ts`)

The backend implements sophisticated scraping logic that:
1. Searches multiple ATS platforms simultaneously
2. Extracts job links from Google search results
3. Scrapes detailed job information from each platform
4. Filters results based on location preferences
5. Removes duplicates and stores results

Key functions:
- `scrapeJobsFromAllPlatforms()`: Main function that coordinates scraping across platforms
- `scrapeJobsFromPlatform()`: Scrapes jobs from a single platform
- `scrapeJobDetails()`: Extracts detailed job information from individual job pages
- `buildSearchUrl()`: Constructs platform-specific search URLs with location filters

### Supported ATS Platforms

1. **Greenhouse** (`boards.greenhouse.io`)
2. **Lever** (`jobs.lever.co`) 
3. **Ashby** (`jobs.ashbyhq.com`)
4. **Workable** (`jobs.workable.com`)
5. **Workday** (`myworkdayjobs.com`)
6. **ADP** (various ADP domains)
7. **Career Pages** (generic career page patterns)

### Frontend Components

#### JobSearchForm Component
- Multi-field search form with job title, platform selection, and location filtering
- Real-time validation using Zod schemas
- Quick search buttons for popular job titles
- Responsive grid layout

#### JobCard Component  
- Displays job details including company logo, title, location, and description
- Shows platform source and scraped timestamp
- Includes apply button that opens job listing in new tab
- Tag system for highlighting key skills and requirements

#### Loading States
- Skeleton loading animation during search
- Progress indicators and status messages
- Error handling with retry functionality

### Search Features

1. **Platform Selection**:
   - All Platforms (searches across all supported ATS)
   - Individual platform selection
   - Simultaneous multi-platform searching

2. **Location Filtering**:
   - All Locations (no filter)
   - Remote Only (includes "remote" in search query)
   - On-site Only (excludes "remote" from search query)

3. **Real-Time Results**:
   - Live scraping from company career pages
   - Automatic deduplication of job listings
   - Tag extraction for skills and job types

### Technical Implementation Notes

- **Error Handling**: Graceful error handling with fallbacks for failed platform scrapes
- **Rate Limiting**: Built-in delays and user-agent rotation to avoid blocking
- **Performance**: Parallel scraping with Promise.allSettled for fault tolerance
- **Type Safety**: Full TypeScript coverage with shared schemas
- **Responsive Design**: Mobile-first CSS with TailwindCSS utilities

This implementation provides a production-ready job search platform that can effectively scrape and aggregate job listings from multiple sources while providing a modern, user-friendly interface.