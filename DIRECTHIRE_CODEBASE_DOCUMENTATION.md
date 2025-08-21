# DirectHire (FindHiddenJobs.com) - Complete Codebase Documentation

## Overview

**DirectHire** is a production-ready job search aggregation platform that scrapes real job listings from 30+ ATS platforms and job boards, providing AI-powered recommendations and comprehensive job search management.

**URL**: https://findhiddenjobs.com  
**Primary Purpose**: Aggregate job listings from multiple platforms that aren't always visible on mainstream job boards like LinkedIn or Indeed

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4
- **Styling**: TailwindCSS 3.4 with shadcn/ui components
- **State Management**: TanStack Query v5 for server state
- **Routing**: Wouter v3 (lightweight router)
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with shadcn/ui
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **Web Scraping**: Cheerio for HTML parsing
- **HTTP Client**: node-fetch v3
- **Validation**: Zod schemas shared between client/server
- **File Uploads**: Multer (5MB limit, PDF/DOC/DOCX)
- **Session Management**: express-session with PostgreSQL store

### Database & Storage
- **Primary Database**: PostgreSQL via Drizzle ORM
- **Cloud Database**: Neon Database (serverless PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage Provider**: Supabase Storage
- **Fallback**: In-memory storage when Supabase not configured
- **Schema Management**: Drizzle Kit for migrations

### AI & External Services
- **Resume Analysis**: OpenAI GPT-4o-mini API
- **Email Service**: Resend API (production emails)
- **Email Fallback**: Nodemailer (Gmail SMTP for development)
- **Google Search**: Google Custom Search API for finding job pages
- **PDF Processing**: pdf-extraction, mammoth (for DOCX)

## Core Features

### 1. Multi-Platform Job Search
- **30+ Supported Platforms**:
  - Greenhouse (`boards.greenhouse.io`)
  - Lever (`jobs.lever.co`)
  - Ashby (`jobs.ashbyhq.com`)
  - Workable (`jobs.workable.com`)
  - Workday (`myworkdayjobs.com`)
  - ADP (multiple domains)
  - BambooHR
  - SmartRecruiters
  - Jobvite
  - Taleo
  - iCIMS
  - And more...

- **Search Features**:
  - Real-time streaming results with progress tracking
  - Location filtering (All/Remote/On-site)
  - Time-based filtering (24h/7d/30d/All)
  - Smart deduplication based on job URLs
  - 1-hour cache for performance
  - Pagination (25 jobs per page)

### 2. User Authentication & Management
- **Supabase Integration**:
  - Email/password authentication
  - Email verification
  - Password reset functionality
  - OAuth support ready

- **User Preferences**:
  - Job types (Full-time, Part-time, Contract, etc.)
  - Preferred locations
  - Industries and experience level
  - Email notification settings (daily at 9 PM EST)
  - Salary expectations

### 3. AI-Powered Features

#### Resume Analysis (OpenAI)
```typescript
// Uses GPT-4o-mini for cost-effective analysis
- Extracts skills, experience, education
- Generates keywords for matching
- Suggests relevant job titles
- Determines experience level
- Supports PDF, DOC, DOCX formats
```

#### Recommendation Algorithm
- **Scoring System (0-100)**:
  - Title match: 30 points
  - Skills match: 25 points
  - Experience level: 20 points
  - Location preference: 15 points
  - Industry match: 10 points

- **Smart Filtering**:
  - Excludes already applied jobs
  - Excludes saved jobs
  - Prioritizes recent postings
  - Considers user search history

### 4. Job Management Dashboard
- **Saved Jobs**:
  - One-click save from search results
  - Track application status
  - Add notes and follow-up dates
  - Mark as applied

- **Application Tracking**:
  - Status tracking (Applied, Interview, Offer, Rejected)
  - Interview scheduling
  - Follow-up reminders
  - Application notes

- **Analytics**:
  - Application statistics
  - Response rates
  - Search history
  - Most viewed job types

### 5. Email System (Resend/Nodemailer)

#### Daily Recommendations
- **Schedule**: 9 PM EST daily
- **Content**: AI-matched jobs based on profile
- **Template**: Professional HTML with job cards
- **Tracking**: Email open and click tracking

#### Transactional Emails
- Welcome emails for new users
- Password reset emails
- Application reminders
- Feature request confirmations

### 6. SEO & Performance
- **SEO Features**:
  - Dynamic sitemap.xml
  - Robots.txt configuration
  - Meta tags and canonical URLs
  - Structured data for job listings

- **Performance**:
  - 1-hour cache for search results
  - Streaming SSE for real-time updates
  - Lazy loading for job cards
  - Image optimization

## API Endpoints

### Public Endpoints
```typescript
GET  /api/search         // Search jobs with filters
GET  /api/search/stream  // Streaming search results (SSE)
GET  /sitemap.xml       // SEO sitemap
GET  /robots.txt        // SEO robots file
```

### Authenticated Endpoints
```typescript
// Authentication
POST /api/auth/register     // User registration
POST /api/auth/login        // User login
POST /api/auth/logout       // User logout
GET  /api/auth/me          // Current user info

// User Preferences
GET  /api/user/preferences  // Get user preferences
POST /api/user/preferences  // Update preferences

// Resume
POST /api/resume/upload     // Upload resume (multipart/form-data)
GET  /api/resume/analysis   // Get latest analysis

// Job Management
POST /api/jobs/save         // Save a job
GET  /api/jobs/saved        // Get saved jobs
POST /api/jobs/apply        // Track application
GET  /api/jobs/applications // Get applications

// Recommendations
GET  /api/recommendations   // Get AI recommendations
POST /api/recommendations/feedback // Rate recommendations

// Feature Requests
POST /api/feature-request   // Submit feature request
```

## Data Models

### Core Tables
- `users` - User accounts and authentication
- `user_preferences` - Job search preferences
- `jobs` - Scraped job listings
- `saved_jobs` - User's saved jobs
- `job_applications` - Application tracking
- `resume_analysis` - Parsed resume data
- `search_history` - User search logs
- `email_logs` - Email delivery tracking

## Environment Variables

### Required for Production
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI Services
OPENAI_API_KEY=your_openai_key

# Email
RESEND_API_KEY=your_resend_key
EMAIL_FROM=noreply@yourdomain.com

# Google Search (for job scraping)
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

### Optional Configuration
```bash
# Development Email (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Server
PORT=5000
NODE_ENV=production
```

## Deployment Architecture

### Current Setup
- **Hosting**: Replit (can be deployed anywhere)
- **Database**: Neon Database (serverless PostgreSQL)
- **Auth/Storage**: Supabase
- **Email**: Resend (production) / Gmail (development)
- **Monitoring**: Console logging with timestamps

### Scalability Features
- Horizontal scaling ready (stateless design)
- Caching layer for search results
- Background job scheduler for emails
- Rate limiting for external API calls
- Connection pooling for database

## Security Features
- Password hashing with bcrypt
- JWT token authentication
- Row Level Security (RLS) in Supabase
- Input validation with Zod
- XSS protection
- SQL injection prevention (parameterized queries)
- File upload restrictions (type & size)
- Rate limiting on API endpoints

## Development Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Production
npm run build        # Build for production
npm start           # Start production server

# Database
npm run db:push     # Push schema changes to database

# Type Checking
npm run check       # Run TypeScript compiler
```

## Key Algorithms

### Job Scraping Flow
1. Build platform-specific search URL
2. Query Google Search API for job pages
3. Extract job listing URLs
4. Scrape individual job details
5. Parse and normalize data
6. Store in database with deduplication

### Recommendation Engine
1. Analyze user resume and preferences
2. Search for relevant jobs across platforms
3. Score each job (0-100) based on:
   - Title/skill match
   - Experience alignment
   - Location preferences
   - Industry relevance
4. Filter out applied/saved jobs
5. Return top 10-20 matches

### Email Scheduler
1. Runs daily at 9 PM EST
2. Queries users with email notifications enabled
3. Generates personalized recommendations
4. Sends HTML emails via Resend API
5. Logs delivery status

## Production Status

### ✅ Fully Production Ready
- Multi-platform job search with real scraping
- User authentication and preferences
- AI-powered recommendations
- Application tracking
- Email templates and scheduler
- Dashboard and analytics

### 🔧 Requires Configuration
- **OpenAI API Key**: For resume analysis (falls back to local parser)
- **Resend API Key**: For production emails (falls back to console logging)
- **Supabase Credentials**: For persistent storage (falls back to in-memory)
- **Google Search API**: For finding job pages (required for scraping)

## Monitoring & Maintenance

### Health Checks
- Server startup logs
- API request/response logging
- Scraping success rates
- Email delivery tracking
- Error logging with timestamps

### Regular Maintenance
- Clear old job listings (24+ hours)
- Update platform scraping selectors
- Monitor API rate limits
- Database index optimization
- Security updates

## Support & Contact

- **Feature Requests**: Sent to `sameer.s.chopra@gmail.com`
- **Bug Reports**: Via feature request modal
- **Documentation**: This file and inline code comments
- **Terms of Service**: `/terms` endpoint
- **Privacy Policy**: `/privacy` endpoint

---

*Last Updated: January 2025*  
*Version: 1.0.0*  
*Status: Production Ready with AI Integration*