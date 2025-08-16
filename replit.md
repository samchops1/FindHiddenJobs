# DirectHire - Job Search Aggregator

## Overview

DirectHire is a job search aggregation platform that allows users to search across multiple job platforms from a single interface. The application scrapes job listings from various Applicant Tracking Systems (ATS) and job boards, providing a unified search experience for job seekers looking for remote opportunities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod for validation

The frontend is organized into a clean component structure with reusable UI components, custom hooks, and page-level components. The application uses a mobile-first responsive design approach.

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for job search and history management
- **Web Scraping**: Cheerio for HTML parsing and node-fetch for HTTP requests
- **Request Validation**: Zod schemas for type-safe API validation

The backend implements a modular route system with middleware for logging, error handling, and request processing.

### Data Storage Solutions
- **Primary Database**: PostgreSQL configured via Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema definitions
- **Fallback Storage**: In-memory storage implementation for development/testing
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

The application uses a dual storage approach with an interface-based design allowing for easy switching between storage implementations.

### Job Search and Scraping Logic
- **Multi-Platform Support**: Configurable search across different ATS platforms (Greenhouse, ADP, LinkedIn, etc.)
- **Dynamic URL Generation**: Platform-specific search URL construction based on job titles and remote work filters
- **Search History**: Automatic tracking of user searches with result counts
- **Job Deduplication**: Storage and retrieval of unique job listings

### Development and Build Process
- **Development**: Vite dev server with HMR for fast development cycles
- **Production Build**: ESBuild for server bundling and Vite for client optimization
- **Type Safety**: Shared TypeScript schemas between client and server
- **Code Quality**: Consistent linting and formatting across the codebase

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database (@neondatabase/serverless)
- **Drizzle ORM**: Type-safe database interactions with PostgreSQL dialect

### UI and Styling
- **Radix UI**: Comprehensive set of accessible React components (@radix-ui/*)
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Icon library for consistent iconography

### Data Fetching and Processing
- **TanStack Query**: Server state management with caching and background updates
- **Cheerio**: Server-side HTML parsing for web scraping
- **Node Fetch**: HTTP client for making external requests

### Development Tools
- **Vite**: Build tool with React plugin and development server
- **TypeScript**: Static type checking across the entire codebase
- **Replit Integration**: Runtime error overlays and cartographer for development

### Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: Schema validation for both client and server-side validation
- **Hookform Resolvers**: Integration between React Hook Form and Zod

The application is designed to be easily deployable on Replit with automatic database provisioning and environment configuration.