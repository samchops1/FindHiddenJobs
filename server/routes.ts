import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchRequestSchema, type InsertJob } from "@shared/schema";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { recommendationScheduler } from "./scheduler";
import { emailService } from "./email-service";
import { resendEmailService } from "./resend-service";
import { resumeParser } from "./resume-parser";
import { recommendationEngine } from "./recommendation-algorithm";

// Simple in-memory cache for Google API results
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// In-memory cache for full job search results (for pagination)
const jobSearchCache = new Map<string, { jobs: any[]; timestamp: number }>();
const JOB_CACHE_DURATION = 60 * 60 * 1000; // 1 hour - matches Google API cache for scalability

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(pdf|doc|docx)$/i;
    const isValidType = allowedTypes.test(path.extname(file.originalname));
    
    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Test endpoint for manual recommendation generation
  app.post('/api/test/recommendations', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      console.log(`🧪 Manual recommendation test for: ${email}`);
      
      // Import the recommendation engine
      const { recommendationEngine } = await import('./recommendation-algorithm');
      
      // For testing, we'll use a test user ID
      const testUserId = email === 'sameer.s.chopra@gmail.com' ? 'test-sameer-id' : 'test-user-id';
      
      // Clear any existing cache for fresh results
      recommendationEngine.clearCache(testUserId);
      
      // Generate recommendations
      const recommendations = await recommendationEngine.generateRecommendations(testUserId, 10);
      
      console.log(`✅ Generated ${recommendations.length} test recommendations`);
      
      // Log the recommendations to console for testing
      console.log('Test Recommendations:', JSON.stringify(recommendations, null, 2));
      
      // Send test email if Resend is configured
      const { resendEmailService } = await import('./resend-service');
      
      if (process.env.RESEND_API_KEY) {
        await resendEmailService.sendDailyRecommendations(
          email,
          'Sameer',
          recommendations.map(rec => ({
            title: rec.title,
            company: rec.company,
            location: rec.location,
            url: rec.url,
            platform: rec.platform,
            tags: rec.tags || [],
            logo: rec.logo
          })),
          ['Software Engineer', 'Full Stack Developer']
        );
        
        return res.json({ 
          success: true, 
          message: `Email sent to ${email}`,
          recommendationsCount: recommendations.length 
        });
      } else {
        console.log('📧 Test email preview for:', email);
        console.log('Recommendations:', recommendations);
        
        return res.json({ 
          success: true, 
          message: 'Recommendations generated (email not sent - Resend not configured)',
          recommendations: recommendations.slice(0, 3), // Return first 3 for preview
          totalCount: recommendations.length
        });
      }
    } catch (error) {
      console.error('Test recommendation error:', error);
      return res.status(500).json({ error: 'Failed to generate test recommendations' });
    }
  });

  // SEO sitemap endpoint
  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://findhiddenjobs.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  });

  // SEO robots.txt endpoint
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *
Allow: /

# Sitemap
Sitemap: https://findhiddenjobs.com/sitemap.xml

# Crawl-delay for being respectful to search engines
Crawl-delay: 1

# Block certain paths that aren't useful for SEO
Disallow: /api/
Disallow: /src/
Disallow: /node_modules/
Disallow: /*.json$
Disallow: /*.js$
Disallow: /*.css$`);
  });

  // Job search endpoint with better error handling
  app.get('/api/search', async (req, res) => {
    try {
      console.log(`🚀 API /search called with params:`, req.query);
      
      // Parse query parameters with default pagination values
      const queryParams = {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 25
      };
      
      console.log(`🔍 Parsed query params:`, queryParams);
      
      const { query, site, location, timeFilter, page, limit } = searchRequestSchema.parse(queryParams);
      const normalizedTimeFilter = (timeFilter || 'all') as string;
      
      console.log(`✅ Schema validation passed: query="${query}", site="${site}", location="${location}", timeFilter="${normalizedTimeFilter}"`);
      
      // Create cache key for this search (excluding page number)
      const cacheKey = `${query}:${site}:${location}:${normalizedTimeFilter}`;
      const cachedResult = jobSearchCache.get(cacheKey);
      
      let allJobs;
      
      // Check if we have cached results for this search
      if (cachedResult && (Date.now() - cachedResult.timestamp) < JOB_CACHE_DURATION) {
        console.log(`🎯 Using cached results for search: ${cacheKey}`);
        allJobs = cachedResult.jobs;
      } else {
        console.log(`🔍 Performing fresh search for: ${cacheKey}`);
        
        // Store search history only for fresh searches
        await storage.createSearch({
          query,
          platform: site === 'all' ? 'All Platforms' : site,
          resultCount: "0"
        });

        // Use graceful search with rate limit handling
        allJobs = await scrapeJobsFromAllPlatformsGraceful(query, site, location || 'all', normalizedTimeFilter, false);
        
        // Store scraped jobs
        for (const jobData of allJobs) {
          try {
            await storage.createJob(jobData);
          } catch (jobError) {
            console.warn('Failed to store job:', jobError);
          }
        }
        
        // Cache the results even if partial
        jobSearchCache.set(cacheKey, {
          jobs: allJobs,
          timestamp: Date.now()
        });
        
        console.log(`💾 Cached ${allJobs.length} jobs for search: ${cacheKey}`);
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedJobs = allJobs.slice(startIndex, endIndex);
      
      // Calculate pagination metadata
      const totalJobs = allJobs.length;
      const totalPages = Math.ceil(totalJobs / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Update search result count (only for fresh searches)
      if (!cachedResult || (Date.now() - cachedResult.timestamp) >= JOB_CACHE_DURATION) {
        const searches = await storage.getRecentSearches();
        const latestSearch = searches[0];
        if (latestSearch) {
          latestSearch.resultCount = totalJobs.toString();
        }
      }

      // Prevent caching to ensure fresh results
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        jobs: paginatedJobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalJobs,
          jobsPerPage: limit,
          hasNextPage,
          hasPrevPage
        }
      });
    } catch (error) {
      console.error('Search error:', error);
      
      // Return partial results if available
      res.status(500).json({ 
        error: 'Search completed with errors', 
        message: error instanceof Error ? error.message : 'Unknown error',
        jobs: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalJobs: 0,
          jobsPerPage: 25,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }
  });
  
  // Streaming search endpoint
  app.get('/api/search-stream', async (req, res) => {
    try {
      const { query, site, location, timeFilter } = searchRequestSchema.parse(req.query);
      const normalizedTimeFilter = (timeFilter || 'all') as string;
      
      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      sendEvent('start', { message: 'Search started', query, site, location });
      
      const jobs = await scrapeJobsFromAllPlatformsStreaming(
        query, site, location || 'all', normalizedTimeFilter, sendEvent
      );
      
      sendEvent('complete', { totalJobs: jobs.length });
      res.end();
      
    } catch (error) {
      console.error('Streaming search error:', error);
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.end();
    }
  });

  // Serve files from Replit Object Storage
  app.get('/objects/:fileName', async (req, res) => {
    try {
      const fileName = req.params.fileName; // Gets the filename
      
      // Basic security: Check if the file path contains user-specific patterns
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Security: Only allow access to files that belong to the requesting user
      if (!fileName.includes(`${userId}_`)) {
        console.warn(`❌ Security: User ${userId} attempted to access file: ${fileName}`);
        return res.status(403).json({ error: 'Access denied: You can only download your own files' });
      }

      console.log(`📄 Serving file from Replit Object Storage: ${fileName} for user ${userId}`);
      
      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      
      // Download the file from Replit Object Storage
      const fileData = await client.downloadAsBytes(fileName);
      
      // Set appropriate headers for PDF files
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName.split('_').pop()}"`, // Use original filename
        'Cache-Control': 'private, max-age=3600'
      });
      
      // Send the file data
      res.send(fileData);
      
    } catch (error) {
      console.error('Error serving file from Replit Object Storage:', error);
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Get user's PDF resume file (user can only access their own)
  app.get('/api/user/resume/download', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Security: Only get resume analysis for this specific user
      const resumeAnalysis = await storage.getUserResumeAnalysis(userId);
      
      if (!resumeAnalysis) {
        return res.status(404).json({ error: 'No resume found for this user' });
      }

      // Security: Verify the file URL is for this user
      const fileUrl = resumeAnalysis.fileUrl;
      if (fileUrl && fileUrl.startsWith('/objects/') && fileUrl.includes(`${userId}_`)) {
        console.log(`✅ Serving resume file for user ${userId}: ${resumeAnalysis.fileName}`);
        res.redirect(fileUrl);
      } else {
        console.warn(`❌ Security: Invalid file access attempt by user ${userId} for URL: ${fileUrl}`);
        res.status(403).json({ error: 'Access denied: You can only download your own resume' });
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      res.status(500).json({ error: 'Failed to download resume' });
    }
  });

  // Get user's existing resume analysis
  app.get('/api/user/resume/analysis', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      console.log(`🔍 Looking for resume analysis for user: ${userId}`);
      const resumeAnalysis = await storage.getUserResumeAnalysis(userId);
      
      if (resumeAnalysis) {
        res.json({
          hasResume: true,
          fileName: resumeAnalysis.fileName,
          analysis: resumeAnalysis.analysis,
          analyzedAt: resumeAnalysis.analyzedAt
        });
      } else {
        res.json({ hasResume: false });
      }
    } catch (error) {
      console.error('Error fetching resume analysis:', error);
      res.status(500).json({ error: 'Failed to fetch resume analysis' });
    }
  });

  // Simple test endpoint
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working', timestamp: new Date().toISOString() });
  });
  
  // Debug endpoint to test Google API directly
  app.get('/api/debug/google', async (req, res) => {
    try {
      const { query, site, location } = req.query;
      const searchQuery = buildSearchQuery(query as string, site as string, location as string);
      
      console.log(`🐛 Debug: Building search query for query="${query}", site="${site}", location="${location}"`);
      console.log(`🐛 Debug: Final search query: "${searchQuery}"`);
      
      const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
      const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
      const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=5`;
      
      console.log(`🐛 Debug: Google API URL: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json() as {
        searchInformation?: { totalResults?: string };
        items?: Array<{ title: string; link: string; snippet: string }>;
      };
      
      res.json({
        searchQuery,
        encodedQuery: encodeURIComponent(searchQuery),
        totalResults: data.searchInformation?.totalResults || '0',
        items: data.items?.map((item: any) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet
        })) || []
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get recent searches
  app.get('/api/searches', async (req, res) => {
    try {
      const searches = await storage.getRecentSearches();
      res.json(searches);
    } catch (error) {
      console.error('Error fetching searches:', error);
      res.status(500).json({ error: 'Failed to fetch search history' });
    }
  });

  // Clean up old jobs
  app.delete('/api/jobs/cleanup', async (req, res) => {
    try {
      await storage.clearOldJobs();
      res.json({ message: 'Old jobs cleaned up successfully' });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({ error: 'Failed to clean up old jobs' });
    }
  });

  // Get user preferences
  app.get('/api/user/preferences', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        // Return default preferences if none exist
        return res.json({
          jobTypes: ['Software Engineer'],
          preferredLocation: 'Remote',
          emailNotifications: true
        });
      }

      res.json(preferences);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      res.status(500).json({ error: 'Failed to fetch user preferences' });
    }
  });

  // User preferences endpoint
  app.post('/api/user/preferences', async (req, res) => {
    try {
      const { jobTypes, preferredLocation, emailNotifications } = req.body;
      
      // In a real app, you'd get userId from authentication middleware
      // For now, we'll use a placeholder
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Save user preferences to database
      await storage.saveUserPreferences({
        userId,
        jobTypes: jobTypes || [],
        preferredLocation,
        emailNotifications: emailNotifications ?? true
      });

      res.json({ message: 'Preferences saved successfully' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      res.status(500).json({ error: 'Failed to save preferences' });
    }
  });

  // Save job endpoint
  app.post('/api/jobs/save', async (req, res) => {
    try {
      const { jobUrl, jobTitle, company, location, platform, jobData } = req.body;
      
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Save job to database
      const savedJob = await storage.saveJob({
        userId,
        jobUrl,
        jobTitle,
        company,
        location,
        platform,
        jobData
      });

      res.json({ message: 'Job saved successfully', savedJob });
    } catch (error) {
      console.error('Error saving job:', error);
      res.status(500).json({ error: 'Failed to save job' });
    }
  });

  // Track job application
  app.post('/api/jobs/apply', async (req, res) => {
    try {
      const { jobUrl, jobTitle, company, notes } = req.body;
      
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Track application in database
      const application = await storage.trackApplication({
        userId,
        jobUrl,
        jobTitle,
        company,
        notes
      });

      res.json({ message: 'Application tracked successfully', application });
    } catch (error) {
      console.error('Error tracking application:', error);
      res.status(500).json({ error: 'Failed to track application' });
    }
  });

  // Get saved jobs for a user
  app.get('/api/user/saved-jobs', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      const savedJobs = await storage.getUserSavedJobs(userId);
      res.json({ savedJobs });
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      res.status(500).json({ error: 'Failed to fetch saved jobs' });
    }
  });

  // Get job applications for a user
  app.get('/api/user/applications', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      const applications = await storage.getUserApplications(userId);
      res.json({ applications });
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  });

  // Get personalized job recommendations for dashboard
  app.get('/api/user/recommendations', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // First, check if user has resume analysis for immediate recommendations  
      const resumeAnalysis = await storage.getUserResumeAnalysis(userId);
      
      if (resumeAnalysis && resumeAnalysis.analysis) {
        console.log('📋 Resume analysis found:', {
          hasAnalysis: !!resumeAnalysis.analysis,
          hasSuggestedJobTitles: !!resumeAnalysis.analysis.suggestedJobTitles,
          suggestedJobTitles: resumeAnalysis.analysis.suggestedJobTitles?.length || 0,
          hasSkills: !!resumeAnalysis.analysis.skills,
          skillsCount: resumeAnalysis.analysis.skills?.length || 0
        });
      }
      
      if (resumeAnalysis && resumeAnalysis.analysis) {
        console.log('🔮 Generating immediate recommendations based on resume analysis...');
        
        try {
          // Use the recommendation algorithm to generate recommendations based on resume
          const recommendations = await recommendationEngine.generateRecommendations(userId, 10);
          
          if (recommendations.length > 0) {
            console.log(`✅ Generated ${recommendations.length} immediate recommendations`);
            return res.json({
              recommendations: recommendations,
              message: `Found ${recommendations.length} personalized job recommendations based on your resume analysis.`,
              isFirstTime: false,
              source: 'resume_analysis'
            });
          }
        } catch (recError) {
          console.log('⚠️ Error generating immediate recommendations:', recError);
        }
      }

      // Check if user has received daily recommendations before
      // This indicates whether the scheduler has run for this user
      try {
        const emailLogs = await storage.getEmailLogs?.(userId);
        const hasReceivedDailyRecommendations = emailLogs?.some(log => log.emailType === 'daily_recommendations');
        
        if (!hasReceivedDailyRecommendations) {
          // First-time user - show "come back at 9pm EST" message
          return res.json({ 
            recommendations: [], 
            message: 'Your personalized AI job recommendations will be ready after 9 PM EST tonight. We\'ll analyze the job market and curate the best opportunities for you based on your preferences and profile.',
            isFirstTime: true
          });
        }
      } catch (emailLogError) {
        console.log('Could not check email logs, proceeding with recommendation generation');
      }

      // Fallback: check for stored recommendations
      const storedRecommendations = await storage.getUserSavedJobs(userId);
      const recommendations = storedRecommendations || [];
      
      if (recommendations.length === 0) {
        return res.json({ 
          recommendations: [], 
          message: 'No recommendations found. Try setting job preferences, uploading a resume, or applying to jobs to get personalized recommendations.' 
        });
      }

      res.json({ recommendations });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  });

  // Resume upload and analysis endpoint
  app.post('/api/user/resume/upload', upload.single('resume'), async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No resume file uploaded' });
      }

      const filePath = req.file.path;
      const fileName = req.file.originalname;
      
      // Use the resume parser to analyze the uploaded file
      const analysis = await resumeParser.parseResume(filePath, fileName);
      
      // Update user preferences with job titles from resume (only if analysis found valid data)
      try {
        const existingPrefs = await storage.getUserPreferences(userId);
        const jobTypesToUse = (analysis.suggestedJobTitles && analysis.suggestedJobTitles.length > 0) 
          ? analysis.suggestedJobTitles 
          : existingPrefs?.jobTypes || ['Software Engineer'];
        
        // Use upsert-like logic for preferences
        if (existingPrefs) {
          await storage.saveUserPreferences({
            userId,
            jobTypes: jobTypesToUse,
            preferredLocation: existingPrefs.preferredLocation || 'Remote',
            emailNotifications: existingPrefs.emailNotifications ?? true
          });
        } else {
          await storage.saveUserPreferences({
            userId,
            jobTypes: jobTypesToUse,
            preferredLocation: 'Remote',
            emailNotifications: true
          });
        }
        
        console.log(`✅ Updated user preferences with job titles: ${jobTypesToUse.join(', ')}`);
      } catch (prefError) {
        console.log(`ℹ️ Error updating user preferences:`, prefError);
      }

      // Upload PDF to Replit Object Storage
      let publicUrl = filePath; // Fallback to local path
      
      try {
        const { Client } = await import('@replit/object-storage');
        const client = new Client(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!);
        
        const fileBuffer = fs.readFileSync(filePath);
        const fileExtension = path.extname(fileName);
        const uniqueFileName = `uploads/${userId}_${Date.now()}_${fileName}`;
        
        console.log(`📤 Uploading PDF to Replit Object Storage: ${uniqueFileName}`);
        
        // Upload to Replit Object Storage
        await client.uploadFromBytes(uniqueFileName, fileBuffer);
        
        console.log('✅ PDF uploaded successfully to Replit Object Storage');
        
        // Get the object URL - for private objects, we'll serve them through our API
        publicUrl = `/objects/${uniqueFileName}`;
        console.log(`🔗 PDF object path: ${publicUrl}`);
        
      } catch (storageError) {
        console.error('❌ Failed to upload to Replit Object Storage:', storageError);
        console.log('📝 Continuing with local file path as fallback');
      }

      // Now save the resume analysis with the storage URL
      try {
        await storage.saveResumeAnalysis({
          userId,
          fileName,
          fileUrl: publicUrl,
          analysis
        });
        console.log(`✅ Resume analysis saved for user ${userId} with file URL: ${publicUrl}`);
      } catch (resumeError) {
        console.error(`❌ Failed to save resume analysis:`, resumeError);
        // Continue anyway - analysis still worked
      }

      // Clean up uploaded file after analysis and storage
      try {
        fs.unlinkSync(filePath);
        console.log(`🧹 Cleaned up temporary file: ${filePath}`);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }

      res.json({
        message: 'Resume analyzed successfully',
        analysis
      });
    } catch (error) {
      console.error('Error analyzing resume:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to analyze resume';
      if (error instanceof Error) {
        if (error.message.includes('OpenAI')) {
          errorMessage = 'OpenAI API not configured. Please add OPENAI_API_KEY to environment variables.';
        } else if (error.message.includes('extract')) {
          errorMessage = 'Could not read the uploaded file. Please ensure it is a valid PDF, DOC, or DOCX file.';
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Test endpoint to manually trigger daily recommendations
  app.post('/api/test/send-recommendations', async (req, res) => {
    try {
      console.log('🧪 Manual trigger of daily recommendations...');
      await recommendationScheduler.sendTestRecommendations();
      res.json({ message: 'Test recommendations sent successfully' });
    } catch (error) {
      console.error('Error sending test recommendations:', error);
      res.status(500).json({ error: 'Failed to send test recommendations' });
    }
  });

  // Test endpoint to send digest email to sameer.s.chopra@gmail.com
  app.post('/api/test/send-digest-to-sameer', async (req, res) => {
    try {
      console.log('🧪 Sending test digest email to sameer.s.chopra@gmail.com...');
      
      // Create mock job recommendations for testing (without database dependencies)
      const mockRecommendations = [
        {
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          location: 'Remote',
          url: 'https://example.com/job1',
          platform: 'LinkedIn',
          tags: ['TypeScript', 'React', 'Node.js']
        },
        {
          title: 'Full Stack Developer',
          company: 'StartupXYZ',
          location: 'San Francisco, CA',
          url: 'https://example.com/job2', 
          platform: 'Indeed',
          tags: ['JavaScript', 'Express', 'MongoDB']
        },
        {
          title: 'Product Manager',
          company: 'Big Tech Inc',
          location: 'New York, NY',
          url: 'https://example.com/job3',
          platform: 'AngelList',
          tags: ['Product Strategy', 'Analytics', 'Leadership']
        }
      ];
      
      // Send test digest with mock recommendations
      await resendEmailService.sendDailyRecommendations(
        'sameer.s.chopra@gmail.com',
        'Sameer',
        mockRecommendations,
        ['Software Engineer', 'Senior Developer', 'Product Manager']
      );
      
      res.json({ 
        message: 'Test digest email sent successfully to sameer.s.chopra@gmail.com',
        recommendationsCount: mockRecommendations.length
      });
      
    } catch (error) {
      console.error('Error sending test digest:', error);
      res.status(500).json({ 
        error: 'Failed to send test digest',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Feature request endpoint
  app.post('/api/feature-request', async (req, res) => {
    try {
      const { type, title, description, email, name } = req.body;
      
      // Validate required fields
      if (!type || !title || !description || !email || !name) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Send feature request email to your address
      const featureRequestEmail = {
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: 'sameer.s.chopra@gmail.com',
        subject: `Feature Request: ${title}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Feature Request</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .content { background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
              .meta { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
              .type-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
              .feature { background: #dbeafe; color: #1e40af; }
              .bug { background: #fee2e2; color: #dc2626; }
              .improvement { background: #d1fae5; color: #059669; }
              .question { background: #e0e7ff; color: #5b21b6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">New Feature Request</h1>
                <p style="margin: 8px 0 0 0; color: #6b7280;">From FindHiddenJobs.com</p>
              </div>
              
              <div class="content">
                <div class="meta">
                  <p><strong>Type:</strong> <span class="type-badge ${type}">${type.toUpperCase()}</span></p>
                  <p><strong>From:</strong> ${name} (${email})</p>
                  <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <h2>${title}</h2>
                <div style="white-space: pre-wrap; background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                  ${description}
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                
                <p style="font-size: 14px; color: #6b7280;">
                  Reply to this email to respond directly to ${name} at ${email}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Feature Request: ${title}

Type: ${type.toUpperCase()}
From: ${name} (${email})
Date: ${new Date().toLocaleString()}

Description:
${description}

---
Reply to this email to respond directly to ${name} at ${email}
        `,
        replyTo: email // Allow direct reply to the requester
      };

      // Send the email using the email service
      try {
        await emailService.sendFeatureRequest(
          featureRequestEmail.to,
          featureRequestEmail.subject,
          featureRequestEmail.html,
          featureRequestEmail.replyTo
        );
        console.log('✅ Feature request email sent successfully to', featureRequestEmail.to);
      } catch (emailError) {
        console.error('❌ Failed to send feature request email:', emailError);
        // Don't fail the request if email fails, just log it
      }

      res.json({ message: 'Feature request submitted successfully' });
    } catch (error) {
      console.error('Error submitting feature request:', error);
      res.status(500).json({ error: 'Failed to submit feature request' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Resume analysis is now handled by the real OpenAI-powered parser

function buildSearchQuery(query: string, site: string, location: string = "all", timeFilter?: string): string {
  // Build location filter
  let locationFilter = "";
  if (location === "remote") {
    locationFilter = " remote";
  } else if (location === "onsite") {
    locationFilter = " onsite";
  } else if (location === "hybrid") {
    locationFilter = " hybrid";
  } else if (location === "united-states") {
    locationFilter = " united states";
  }
  
  // Use the entire query as a single intext phrase
  const intextQuery = `intext:"${query}"`;
  
  console.log(`🔍 Building search query for site: ${site}, query: "${query}", location: "${locationFilter}", timeFilter: "${timeFilter || 'none'}"`);
  
  let searchQuery = "";
  
  switch (site) {
    // Major ATS Platforms
    case "greenhouse.io":
    case "boards.greenhouse.io":
      searchQuery = `site:greenhouse.io${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "lever.co":
    case "jobs.lever.co":
      searchQuery = `site:lever.co${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "ashbyhq.com":
    case "jobs.ashbyhq.com":
      searchQuery = `site:ashbyhq.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "remoterocketship.com":
      searchQuery = `site:remoterocketship.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "pinpointhq.com":
      searchQuery = `site:pinpointhq.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "jobs.*":
      searchQuery = `site:jobs.*${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "careers.*":
      searchQuery = `(site:careers.* OR site:*/careers/* OR site:*/career/*)${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "people.*":
      searchQuery = `site:people.*${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "talent.*":
      searchQuery = `site:talent.*${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "recruiting.paylocity.com":
      searchQuery = `site:recruiting.paylocity.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "keka.com":
      searchQuery = `site:keka.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "jobs.workable.com":
      searchQuery = `site:jobs.workable.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "breezy.hr":
      searchQuery = `site:breezy.hr${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "wellfound.com":
      searchQuery = `site:wellfound.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "workatastartup.com":
      searchQuery = `site:workatastartup.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "oraclecloud.com":
      searchQuery = `site:oraclecloud.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "myworkdayjobs.com":
      searchQuery = `site:myworkdayjobs.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "recruitee.com":
      searchQuery = `site:recruitee.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "rippling-ats.com":
      searchQuery = `site:rippling-ats.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "jobs.gusto.com":
      searchQuery = `site:jobs.gusto.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "careerpuck.com":
      searchQuery = `site:careerpuck.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "teamtailor.com":
      searchQuery = `site:teamtailor.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "jobs.smartrecruiters.com":
      searchQuery = `site:jobs.smartrecruiters.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "jobappnetwork.com":
      searchQuery = `site:jobappnetwork.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "homerun.co":
      searchQuery = `site:homerun.co${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "gem.com":
      searchQuery = `site:gem.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "trakstar.com":
      searchQuery = `site:trakstar.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "catsone.com":
      searchQuery = `site:catsone.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "applytojob.com":
      searchQuery = `site:applytojob.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "jobvite.com":
      searchQuery = `site:jobvite.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "icims.com":
      searchQuery = `site:icims.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "dover.io":
      searchQuery = `site:dover.io${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "notion.site":
      searchQuery = `site:notion.site${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "builtin.com":
      searchQuery = `site:builtin.com/job/${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "adp":
      searchQuery = `(site:workforcenow.adp.com OR site:myjobs.adp.com)${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "linkedin.com":
      searchQuery = `site:linkedin.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "glassdoor.com":
      searchQuery = `site:glassdoor.com/job-listing/${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "trinethire.com":
      searchQuery = `site:trinethire.com${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "other-pages":
      searchQuery = `(site:*/employment/* OR site:*/opportunities/* OR site:*/openings/* OR site:*/join-us/* OR site:*/work-with-us/*)${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    case "all":
      // For "all", we'll search across the most common platforms
      searchQuery = `(site:greenhouse.io OR site:lever.co OR site:ashbyhq.com OR site:myworkdayjobs.com OR site:jobs.workable.com)${locationFilter} intext:"apply" ${intextQuery}`;
      break;
    default:
      // Default fallback for custom domains
      searchQuery = `site:${site}${locationFilter} intext:"apply" ${intextQuery}`;
      break;
  }
  
  console.log(`🎯 Final search query: ${searchQuery}`);
  return searchQuery;
}

async function searchWithGoogleAPI(searchQuery: string, startIndex: number = 1, timeFilter?: string): Promise<(InsertJob | string)[]> {
  const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  console.log(`🔍 Google API called with query: "${searchQuery}"`);
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    console.error('❌ Missing Google Search API credentials');
    console.error(`API Key exists: ${!!API_KEY}`);
    console.error(`Search Engine ID exists: ${!!SEARCH_ENGINE_ID}`);
    return [];
  }
  
  console.log(`✅ API credentials confirmed, searching from index ${startIndex}`);
  
  try {
    // Build URL with time filter if provided
    let url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=10&start=${startIndex}`;
    
    // Add time filter parameter if specified
    if (timeFilter && timeFilter !== 'all') {
      url += `&tbs=qdr:${timeFilter}`;
    }
    
    // Check cache first
    const cacheKey = url;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`📦 Using cached result for: ${searchQuery}`);
      const data = cached.data;
      
      // Process cached data same as fresh data
      if (!data.items) {
        return [];
      }
      
      // [Rest of processing logic will be here]
    } else {
      console.log(`🌐 Making fresh API call: ${url}`);
      console.log(`🔗 Encoded query: ${encodeURIComponent(searchQuery)}`);
    }
      
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Google Search API error: ${response.status}`);
      console.error(`❌ Error details: ${errorText}`);
      
      // If it's a complex query, try a simple test
      if (searchQuery.includes('site:') || searchQuery.includes('inurl:')) {
        console.log('🔄 Complex query failed, trying simple test query...');
        return await testSimpleQuery(API_KEY, SEARCH_ENGINE_ID);
      }
      
      return [];
    }
    
    const data = await response.json() as {
      items?: Array<{
        link: string;
        title?: string;
        snippet?: string;
      }>;
    };
    
    if (!data.items) {
      console.log('No search results found');
      return [];
    }
    
    // Extract job-related URLs and job objects from search results
    const results: (InsertJob | string)[] = [];
    
    // Separate URLs for traditional scraping
    const urlsForScraping: string[] = [];

    data.items.forEach((item) => {
      const link = item.link;
      const title = item.title?.toLowerCase() || '';
      const snippet = item.snippet?.toLowerCase() || '';
      
      if (!link) return;
      
      // Extract job title from Google search result
      const extractedJobTitle = extractJobTitleFromSearchResult(item.title || '', item.snippet || '', link);
      
      // If we successfully extracted a job title AND it's a direct job URL, add it directly
      if (extractedJobTitle && isDirectJobUrl(link)) {
        // Clean company name for logo fetching
        const cleanCompany = extractedJobTitle.company
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace(/\s+/g, '');
        
        const jobFromSearchResult: InsertJob = {
          title: extractedJobTitle.jobTitle,
          company: extractedJobTitle.company,
          location: extractLocationFromText(item.snippet || item.title || '') || 'Location not specified',
          description: null, // Remove descriptions as requested
          url: link,
          logo: cleanCompany ? `https://logo.clearbit.com/${cleanCompany}.com` : null,
          platform: getPlatformFromUrl(link),
          tags: extractTags(extractedJobTitle.jobTitle, item.snippet || ''),
          postedAt: extractPostingDateFromText(item.snippet || item.title || '')
        };
        
        console.log(`✅ Created job from search result: "${jobFromSearchResult.title}" at ${jobFromSearchResult.company}`);
        results.push(jobFromSearchResult);
        return;
      }
      
      // Fallback: Add to URLs for traditional scraping
      if (link.includes('boards.greenhouse.io')) {
        urlsForScraping.push(link);
        console.log(`🎯 Direct Greenhouse URL (fallback scraping): ${link}`);
        return;
      }
      
      // Handle company career pages with gh_jid as fallback
      if (link.includes('gh_jid=')) {
        const ghJidMatch = link.match(/gh_jid=(\d+)/);
        if (ghJidMatch) {
          const jobId = ghJidMatch[1];
          const domainMatch = link.match(/https?:\/\/(?:www\.)?([^\/]+)/);
          if (domainMatch) {
            const domain = domainMatch[1];
            const companySlug = domain.split('.')[0];
            const directUrl = `https://boards.greenhouse.io/${companySlug}/jobs/${jobId}`;
            urlsForScraping.push(directUrl);
            console.log(`🔄 Converted career page: ${link} -> ${directUrl}`);
            console.log(`   Company slug: ${companySlug}, Job ID: ${jobId}`);
            return;
          }
        } else {
          console.log(`❌ Could not extract job ID from gh_jid URL: ${link}`);
        }
      }
      
      // Check other job platforms - matching Brian's approach
      const isOtherJobPlatform = (
        (link.includes('jobs.lever.co') && link.includes('/posting/')) || 
        link.includes('jobs.ashbyhq.com') ||
        link.includes('myworkdayjobs.com') ||
        link.includes('jobs.workable.com') ||
        link.includes('workforcenow.adp.com') ||
        link.includes('myjobs.adp.com')
      );
      
      // Special logging for ADP URLs
      if (link.includes('workforcenow.adp.com') || link.includes('myjobs.adp.com')) {
        console.log(`🔍 Found ADP URL: ${link}`);
        console.log(`   Title: "${title}"`);
        console.log(`   Snippet: "${snippet}"`);
        console.log(`   isOtherJobPlatform: ${isOtherJobPlatform}`);
      }
      
      // Removed isGreenhouseJobUrl - using wildcard approach above
      
      // Check if URL suggests a job posting (for non-Greenhouse platforms)
      const hasJobUrl = link && (
        link.includes('/careers/') ||
        link.includes('/career/') ||
        link.includes('/jobs/') ||
        link.includes('/job/') ||
        link.includes('/employment/') ||
        link.includes('/opportunities/') ||
        link.includes('/openings/') ||
        link.includes('/apply/') ||
        link.includes('/position/') ||
        link.includes('/vacancy/') ||
        link.includes('/hiring/')
      );
      
      // Check if title/snippet suggests it's a specific job posting
      const hasJobIndicators = (
        title.includes('hiring') ||
        title.includes('job') ||
        title.includes('position') ||
        title.includes('opening') ||
        title.includes('opportunity') ||
        title.includes('director') ||
        snippet.includes('apply') ||
        snippet.includes('hiring') ||
        snippet.includes('job description') ||
        snippet.includes('requirements') ||
        snippet.includes('qualifications') ||
        snippet.includes('director') ||
        snippet.includes('technology')
      );
      
      // Exclude obvious non-job pages
      const isExcluded = link && (
        link.includes('/blog/') ||
        link.includes('/news/') ||
        link.includes('/about/') ||
        link.includes('/contact/') ||
        link.includes('wikipedia.org') ||
        link.includes('linkedin.com/company/') || // Company pages, not job posts
        link.includes('glassdoor.com/Overview/') // Company overview pages
      );
      
      // Accept all URLs from known ATS platforms, or URLs that match job patterns
      if (!isExcluded && (isOtherJobPlatform || (hasJobUrl && hasJobIndicators))) {
        urlsForScraping.push(link);
        const platform = link.includes('workforcenow.adp.com') || link.includes('myjobs.adp.com') ? 'ADP' : 'OTHER';
        console.log(`✅ Added ${platform} job URL: ${link}`);
      } else if (!isExcluded) {
        // Log rejected URLs for debugging
        const isADP = link.includes('workforcenow.adp.com') || link.includes('myjobs.adp.com');
        if (isADP) {
          console.log(`❌ ADP URL rejected: ${link}`);
          console.log(`   isOtherJobPlatform: ${isOtherJobPlatform}`);
          console.log(`   hasJobUrl: ${hasJobUrl}`);
          console.log(`   hasJobIndicators: ${hasJobIndicators}`);
        }
      }
    });
    
    // Add URLs for scraping to results
    results.push(...urlsForScraping);
    
    console.log(`📊 Search results: ${results.filter(r => typeof r === 'object').length} jobs from search results, ${urlsForScraping.length} URLs for scraping`);
    console.log(`✅ Google API returned ${data.items.length} total results, ${results.length} total items`);
    
    // Log all URLs for debugging
    if (data.items && data.items.length > 0) {
      console.log(`🔍 All URLs returned by Google API:`);
      data.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.link}`);
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Google Search API network error:', error);
    return [];
  }
}


async function testSimpleQuery(API_KEY: string, SEARCH_ENGINE_ID: string): Promise<string[]> {
  try {
    console.log('🧪 Testing with very simple query: "jobs"');
    const testUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=jobs&num=3`;
    const testResponse = await fetch(testUrl);
    
    if (testResponse.ok) {
      const testData = await testResponse.json() as { items?: Array<{ link: string }> };
      console.log(`✅ Simple test query succeeded! Found ${testData.items?.length || 0} results`);
      if (testData.items && testData.items.length > 0) {
        console.log(`📋 Sample result: ${testData.items[0].link}`);
      }
      return [];
    } else {
      const testError = await testResponse.text();
      console.error(`❌ Even simple test query failed: ${testResponse.status} - ${testError}`);
      return [];
    }
  } catch (error) {
    console.error('❌ Test query network error:', error);
    return [];
  }
}

function extractLocationFromText(text: string): string | null {
  if (!text) return null;
  
  const locationPatterns = [
    // City, State patterns
    /(?:location|based|office|headquarters).*?([A-Z][a-z]+,\s*[A-Z]{2})/i,
    // Remote work patterns
    /(?:remote|work from home|wfh|distributed)/i,
    // City patterns
    /(?:location|based|office).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    // Address patterns
    /([A-Z][a-z]+,\s*[A-Z]{2}(?:\s+\d{5})?)/,
    // State only patterns
    /(?:location|based|office).*?([A-Z]{2})/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === locationPatterns[1]) { // Remote pattern
        return 'Remote';
      }
      return match[1]?.trim() || null;
    }
  }
  
  return null;
}

function extractPostingDateFromText(text: string): Date | null {
  if (!text) return null;
  
  const datePatterns = [
    // "Posted X days ago" patterns
    /posted\s+(\d+)\s+days?\s+ago/i,
    /(\d+)\s+days?\s+ago/i,
    // "Posted on DATE" patterns
    /posted\s+on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    // Direct date patterns
    /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/,
    // ISO date patterns
    /(\d{4}-\d{2}-\d{2})/
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === datePatterns[0] || pattern === datePatterns[1]) {
        // Days ago format
        const daysAgo = parseInt(match[1]);
        if (!isNaN(daysAgo)) {
          const date = new Date();
          date.setDate(date.getDate() - daysAgo);
          return date;
        }
      } else {
        // Try to parse as date
        const parsedDate = new Date(match[1]);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }
    }
  }
  
  return null;
}

async function scrapeJobDetails(link: string, searchQuery?: string): Promise<InsertJob | null> {
  try {
    console.log(`🔧 Scraping job details from: ${link}`);
    
    // Special handling for ADP URLs - extract from URL params when possible
    if (link.includes('workforcenow.adp.com') || link.includes('myjobs.adp.com')) {
      const jobFromUrl = extractADPJobFromUrl(link, searchQuery);
      if (jobFromUrl) {
        console.log(`✅ Successfully extracted ADP job from URL: "${jobFromUrl.title}"`);
        return jobFromUrl;
      }
    }
    
    // Add longer timeout for JavaScript-heavy sites like ADP
    const isADP = link.includes('workforcenow.adp.com') || link.includes('myjobs.adp.com');
    const controller = new AbortController();
    const timeoutMs = isADP ? 10000 : 5000; // 10 seconds for ADP, 5 for others
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(link, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Don't return fallback data - just return null for failed scrapes
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);

    let title, company, location, description;
    let platform = 'Unknown';
    let postedAt: Date | null = null;
    
    // Try to extract company first from structured data and meta tags
    let metaCompany = $('meta[property="og:site_name"]').attr('content') ||
                      $('meta[name="application-name"]').attr('content') ||
                      '';
    
    // Try to parse JSON-LD structured data for company info
    try {
      const ldJsonScript = $('script[type="application/ld+json"]').text();
      if (ldJsonScript) {
        const ldData = JSON.parse(ldJsonScript);
        if (ldData.hiringOrganization?.name) {
          metaCompany = ldData.hiringOrganization.name;
        } else if (ldData.organizationName) {
          metaCompany = ldData.organizationName;
        } else if (ldData.publisher?.name) {
          metaCompany = ldData.publisher.name;
        }
      }
    } catch (e) {
      // JSON parsing failed, continue
    }

    // Smart scraper logic for different ATS platforms
    if (link.includes('boards.greenhouse.io')) {
      platform = 'Greenhouse';
      
      // Direct Greenhouse URL scraping
      title = $('h1').first().text().trim() || 
              $('[data-automation="jobPostingHeader"]').text().trim() ||
              $('.app-title').text().trim() ||
              $('#header h1').text().trim() ||
              $('h1.job-title').text().trim() ||
              $('.posting-headline').text().trim() ||
              $('title').text().split(' - ')[0].trim();
      
      company = $('.company-name').text().trim().replace(/^at\s+/i, '') ||
                $('[data-automation="jobPostingCompany"]').text().trim() ||
                $('.organization-name').text().trim() ||
                metaCompany ||
                '';
      
      // Extract company from URL if not found in content
      if (!company && link) {
        const urlMatch = link.match(/boards\.greenhouse\.io\/([^/]+)/);
        if (urlMatch) {
          const extracted = urlMatch[1].replace(/[-_]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Only use if it's a real company name
          if (isLikelyCompanyName(extracted)) {
            company = extracted;
          }
        }
      }
      
      location = $('.location').text().trim() ||
                 $('[data-automation="jobPostingLocation"]').text().trim() ||
                 $('.job-location').text().trim() ||
                 $('div:contains("Location")').next().text().trim() ||
                 'Location not specified';
      
      description = $('#content').html() || 
                    $('[data-automation="jobPostingDescription"]').html() ||
                    $('.job-description').html() ||
                    $('#description').html() ||
                    $('.posting-requirements').html() ||
                    $('.posting-description').html() ||
                    $('.content').html() ||
                    '';
      
      // Clean up description for all platforms
      if (description) {
        // Remove all Elementor and page builder content
        description = description
          .replace(/<section[^>]*elementor[^>]*>[\s\S]*?<\/section>/gi, '')
          .replace(/<div[^>]*elementor[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*data-id="[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*data-element[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<aside[\s\S]*?<\/aside>/gi, '')
          .replace(/<form[\s\S]*?<\/form>/gi, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/data-[a-zA-Z-]+=["'][^"']*["']/gi, '')
          .replace(/class="[^"]*elementor[^"]*"/gi, '')
          .replace(/<[^>]*>\s*<\/[^>]*>/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
          
        // If description is still mostly empty or contains unwanted content, try text-only extraction
        const plainText = description.replace(/<[^>]*>/g, '').trim();
        if (plainText.length < 100 || plainText.includes('elementor') || plainText.includes('data-id')) {
          // Try to get plain text from specific elements
          const textContent = $('#content').text().trim() ||
                              $('[data-automation="jobPostingDescription"]').text().trim() ||
                              $('.job-description').text().trim() ||
                              $('.posting-requirements').text().trim() ||
                              $('.posting-description').text().trim();
          
          if (textContent && textContent.length > 50) {
            // Convert plain text back to basic HTML for display
            description = textContent.split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .map(line => `<p>${line}</p>`)
              .join('');
          } else {
            description = null;
          }
        }
      }
      
      // Clean up title - remove company names that might be prepended
      if (title) {
        title = title.replace(/^.*?\s-\s/, '').replace(/\sat\s.*$/, '').trim();
        // Remove common unwanted text
        title = title.replace(/find your future/gi, '').trim();
      }
      
    } else if (link.includes('jobs.lever.co')) {
      platform = 'Lever';
      
      // Lever uses different selectors - try multiple approaches
      title = $('h2.posting-headline').text().trim() ||
              $('.posting-headline').text().trim() ||
              $('h1').first().text().trim() ||
              $('[data-qa="job-title"]').text().trim() ||
              $('.posting-header h2').text().trim();
      
      // Company extraction for Lever
      const companyFromTitle = $('.main-header-mobile .posting-headline a').text().trim();
      company = companyFromTitle || 
                $('.posting-company').text().trim() ||
                $('meta[property="og:site_name"]').attr('content') ||
                $('[data-qa="company-name"]').text().trim() ||
                '';
      
      // Extract company from URL if not found
      if (!company && link) {
        const leverMatch = link.match(/jobs\.lever\.co\/([^/]+)/);
        if (leverMatch) {
          const extracted = leverMatch[1].replace(/[-_]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Only use if it's a real company name
          if (isLikelyCompanyName(extracted)) {
            company = extracted;
          }
        }
      }
      
      // Location for Lever
      location = $('.posting-categories .location').text().trim() ||
                 $('.posting-location').text().trim() ||
                 $('[data-qa="location"]').text().trim() ||
                 $('.location').text().trim() ||
                 'Location not specified';
      
      // Description for Lever
      description = $('div[data-qa="job-description"]').html() ||
                    $('.posting-description').html() ||
                    $('[data-qa="description"]').html() ||
                    $('.content').html() ||
                    '';
    } else if (link.includes('jobs.ashbyhq.com')) {
      platform = 'Ashby';
      
      // Ashby uses CSS modules with dynamic class names
      title = $('h1[class*="_title_"]').text().trim() ||
              $('h1[class*="title"]').text().trim() ||
              $('h1').first().text().trim() ||
              $('.job-title').text().trim() ||
              $('[data-testid="job-title"]').text().trim();
      
      // Company extraction for Ashby
      company = $('a[class*="_companyName_"]').text().trim() ||
                $('[class*="companyName"]').text().trim() ||
                $('[class*="company"]').text().trim() ||
                $('.company-name').text().trim() ||
                $('meta[property="og:site_name"]').attr('content') ||
                '';
      
      // Extract company from URL if not found
      if (!company && link) {
        const ashbyMatch = link.match(/jobs\.ashbyhq\.com\/([^/]+)/);
        if (ashbyMatch) {
          company = ashbyMatch[1].replace(/[-_]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }
      
      // Location for Ashby
      location = $('div[class*="_location_"]').text().trim() ||
                 $('[class*="location"]').text().trim() ||
                 $('.location').text().trim() ||
                 $('[data-testid="location"]').text().trim() ||
                 'Location not specified';
      
      // Description for Ashby
      description = $('div[class*="_description_"]').html() ||
                    $('[class*="description"]').html() ||
                    $('.job-description').html() ||
                    $('[data-testid="job-description"]').html() ||
                    $('.content').html() ||
                    '';
    } else if (link.includes('myworkdayjobs.com')) {
      platform = 'Workday';
      
      // Workday uses data-automation-id attributes
      title = $('h1[data-automation-id="jobPostingHeader"]').text().trim() ||
              $('[data-automation-id="jobTitle"]').text().trim() ||
              $('h1').first().text().trim() ||
              $('.job-title').text().trim() ||
              $('[title]').first().attr('title');
      
      // Company extraction for Workday
      company = $('span[data-automation-id="jobPostingCompany"]').text().trim() ||
                $('[data-automation-id="company"]').text().trim() ||
                $('.company-name').text().trim() ||
                $('meta[property="og:site_name"]').attr('content') ||
                '';
      
      // Extract company from URL if not found
      if (!company && link) {
        const workdayMatch = link.match(/myworkdayjobs\.com\/([^/]+)/);
        if (workdayMatch) {
          company = workdayMatch[1].replace(/[-_]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }
      
      // Location for Workday
      location = $('span[data-automation-id="jobPostingLocation"]').text().trim() ||
                 $('[data-automation-id="location"]').text().trim() ||
                 $('.location').text().trim() ||
                 $('[class*="location"]').text().trim() ||
                 'Location not specified';
      
      // Description for Workday
      description = $('div[data-automation-id="jobPostingDescription"]').html() ||
                    $('[data-automation-id="description"]').html() ||
                    $('.job-description').html() ||
                    $('[class*="description"]').html() ||
                    $('.content').html() ||
                    '';
    } else if (link.includes('jobs.workable.com')) {
      platform = 'Workable';
      
      // Workable selectors
      title = $('h1.job-title').text().trim() ||
              $('h1').first().text().trim() ||
              $('.posting-title').text().trim() ||
              $('[data-ui="job-title"]').text().trim() ||
              $('.title').text().trim();
      
      // Company extraction for Workable
      company = $('.company-name').text().trim() ||
                $('[data-ui="company-name"]').text().trim() ||
                $('.company').text().trim() ||
                $('meta[property="og:site_name"]').attr('content') ||
                '';
      
      // Extract company from URL if not found
      if (!company && link) {
        const workableMatch = link.match(/jobs\.workable\.com\/([^/]+)/);
        if (workableMatch) {
          company = workableMatch[1].replace(/[-_]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }
      
      // Location for Workable
      location = $('.location').text().trim() ||
                 $('[data-ui="location"]').text().trim() ||
                 $('.job-location').text().trim() ||
                 $('[class*="location"]').text().trim() ||
                 'Location not specified';
      
      // Description for Workable
      description = $('.job-description').html() ||
                    $('[data-ui="job-description"]').html() ||
                    $('.description').html() ||
                    $('.content').html() ||
                    $('.posting-content').html() ||
                    '';
    } else if (link.includes('workforcenow.adp.com') || link.includes('myjobs.adp.com') || (link.includes('.adp.com') && !link.includes('www.adp.com'))) {
      platform = 'ADP';
      console.log(`🏢 Scraping ADP URL: ${link}`);
      
      // Try multiple approaches for ADP - content might be JavaScript-rendered
      const allText = $('*').text();
      console.log(`📄 Page content length: ${allText.length} chars`);
      
      // Different selectors for different ADP platforms - try more comprehensive approach
      if (link.includes('myjobs.adp.com')) {
        // MyJobs ADP platform selectors
        title = $('[data-automation-id="jobTitle"]').text().trim() ||
                $('h1[data-automation-id]').text().trim() ||
                $('h1').first().text().trim() ||
                $('.job-title').text().trim() ||
                $('[class*="title"]').first().text().trim() ||
                $('title').text().replace(/\s*-\s*.*$/, '').trim();
        
        company = $('[data-automation-id="company"]').text().trim() ||
                  $('.company-name').text().trim() ||
                  $('[class*="company"]').first().text().trim();
        
        location = $('[data-automation-id="location"]').text().trim() ||
                   $('.location').text().trim() ||
                   $('[class*="location"]').first().text().trim();
        
        description = $('[data-automation-id="jobDescription"]').html() ||
                      $('.job-description').html() ||
                      $('[class*="description"]').first().html();
                      
      } else if (link.includes('workforcenow.adp.com')) {
        // WorkforceNow ADP platform selectors - be more aggressive
        title = $('[data-automation-id="jobPostingHeader"]').text().trim() ||
                $('h1[data-automation-id]').text().trim() ||
                $('.job-posting-title').text().trim() ||
                $('h1').first().text().trim() ||
                $('.title').text().trim() ||
                $('title').text().replace(/\s*-\s*.*$/, '').replace(/Recruitment/gi, '').trim() ||
                (searchQuery ? searchQuery : '');
        
        company = $('[data-automation-id="jobPostingCompany"]').text().trim() ||
                  $('.company-name').text().trim() ||
                  $('[data-automation-id="companyName"]').text().trim();
        
        location = $('[data-automation-id="jobPostingLocation"]').text().trim() ||
                   $('.job-location').text().trim() ||
                   $('[data-automation-id="location"]').text().trim();
        
        description = $('[data-automation-id="jobPostingDescription"]').html() ||
                      $('.job-description').html() ||
                      $('[data-automation-id="description"]').html();
      } else {
        // Generic ADP selectors
        title = $('h1').first().text().trim() ||
                $('.job-title').text().trim() ||
                $('[data-testid="job-title"]').text().trim() ||
                $('.title').text().trim() ||
                $('title').text().replace(/\s*-\s*.*$/, '').trim();
        
        company = $('.company-name').text().trim() ||
                  $('[class*="company"]').text().trim();
        
        location = $('.location').text().trim() ||
                   $('[class*="location"]').text().trim();
        
        description = $('.job-description').html() ||
                      $('[class*="description"]').html();
      }
      
      console.log(`🏢 ADP title extracted: "${title}"`);
      console.log(`🏢 ADP company extracted: "${company}"`);
      
      // If we got nothing from scraping and this is ADP, fall back to URL-based extraction
      if ((!title || title.length < 3) && searchQuery) {
        console.log(`⚠️ ADP page appears to be JavaScript-rendered, falling back to search query`);
        title = searchQuery;
      }
      
      // Extract company from URL if not found in content
      if (!company && link) {
        if (link.includes('myjobs.adp.com')) {
          // Extract from myjobs.adp.com/[company]/cx/
          const match = link.match(/myjobs\.adp\.com\/([^\/]+)/);
          if (match) {
            company = match[1].replace(/careers?$/, '').replace(/[-_]/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        } else if (link.includes('workforcenow.adp.com')) {
          // For workforcenow, try to extract from page content or use generic name
          const titleText = $('title').text();
          if (titleText && titleText !== 'Recruitment' && !titleText.includes('Recruitment')) {
            company = titleText.split(' - ')[0] || 'ADP Client';
          } else {
            company = 'ADP Client';
          }
        }
      }
      
      // Set defaults if still empty
      company = company || 'ADP Client';
      location = location || 'Location not specified';
    } else {
      // Generic scraping for career pages and other job sites
      platform = 'Career Pages';
      
      // Try multiple selectors for title
      title = $('h1').first().text().trim() || 
              $('.job-title').text().trim() || 
              $('[class*="title"]').first().text().trim() ||
              $('meta[property="og:title"]').attr('content') || 
              $('title').text().split(' - ')[0] || '';
      
      // Try to extract company name from various sources
      company = $('.company-name').text().trim() || 
                $('[class*="company"]').first().text().trim() ||
                $('meta[property="og:site_name"]').attr('content') ||
                $('meta[name="author"]').attr('content') ||
                '';
      
      // If no company found, try to extract from domain
      if (!company && link) {
        try {
          const url = new URL(link);
          company = url.hostname.replace('www.', '').split('.')[0];
          company = company.charAt(0).toUpperCase() + company.slice(1);
        } catch {}
      }
      
      // Try multiple selectors for location
      location = $('.location').text().trim() || 
                 $('[class*="location"]').first().text().trim() ||
                 $('[class*="place"]').first().text().trim() ||
                 $('meta[name="geo.placename"]').attr('content') ||
                 '';
      
      // Try multiple selectors for description
      description = $('.job-description').html() || 
                    $('.description').html() || 
                    $('[class*="description"]').first().html() ||
                    $('[class*="details"]').first().html() ||
                    $('[class*="content"]').first().html() ||
                    $('main').html() ||
                    '';
    }

    // No fallback logic - only use real extracted data
    if (!title || title.length < 3 || title.toLowerCase().includes('find your future') || 
        title.toLowerCase().includes('careers') || title.toLowerCase().includes('jobs')) {
      console.log(`❌ No valid title extracted for ${platform}: "${title}" - skipping job`);
      return null;
    }

    // Extract location from description if not found or is "Not specified"
    const fullText = `${title} ${company} ${description || ''}`;
    if (!location || location === 'Not specified' || location.toLowerCase().includes('not specified')) {
      const extractedLocation = extractLocationFromText(fullText);
      if (extractedLocation) {
        location = extractedLocation;
      }
    }
    
    // Extract posting date from description
    postedAt = extractPostingDateFromText(fullText);

    // Only return job if we have BOTH title AND company - strict validation
    if (title && company && title.length > 3 && company.length > 1) {
      const cleanCompany = (company || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
      console.log(`✅ Successfully extracted job: "${title}" at ${company}`);
      return {
        title,
        company,
        location: location || 'Not specified',
        description: description ? description.substring(0, 1000) : null,
        url: link, // Keep original URL for apply button
        logo: cleanCompany ? `https://logo.clearbit.com/${cleanCompany}.com` : null,
        platform,
        tags: extractTags(title, description || ''),
        postedAt
      };
    }
    
    console.log(`❌ Could not extract job details from ${link}`);
    return null;
  } catch (error) {
    console.error(`Error scraping ${link}:`, error);
    // Don't return fallback data - just return null for failed scrapes
    return null;
  }
}

function extractADPJobFromUrl(url: string, searchQuery?: string): InsertJob | null {
  try {
    // Try to extract job information from ADP URL parameters
    const urlObj = new URL(url);
    const jobId = urlObj.searchParams.get('jobId');
    
    if (jobId && searchQuery) {
      console.log(`🔍 Extracting ADP job from URL params: jobId=${jobId}`);
      
      return {
        title: searchQuery,
        company: 'ADP Client',
        location: 'Location not specified',
        description: `Position for ${searchQuery}. Full details available on the company's ADP career portal.`,
        url: url,
        logo: null,
        platform: 'ADP',
        tags: extractTags(searchQuery, ''),
        postedAt: null
      };
    }
    
    return null;
  } catch (error) {
    console.log(`❌ Failed to extract ADP job from URL: ${error}`);
    return null;
  }
}

function isDirectJobUrl(url: string): boolean {
  // Check if URL points to a specific job posting vs general career page
  const directJobPatterns = [
    /\/jobs\/\d+/,           // /jobs/123456
    /\/job\/[a-zA-Z0-9-_]+/, // /job/job-id
    /\/posting\/[a-zA-Z0-9-_]+/, // Lever: /posting/job-id
    /\/applications\/[a-zA-Z0-9-_]+/, // Some ATS: /applications/job-id
    /jobId=/,                // Query parameter: ?jobId=123
    /gh_jid=/,              // Greenhouse: ?gh_jid=123
    /job_id=/               // Query parameter: ?job_id=123
  ];
  
  // Must match at least one direct job pattern
  const hasJobPattern = directJobPatterns.some(pattern => pattern.test(url));
  
  // Exclude obvious generic pages
  const isGenericPage = [
    /\/careers\/?$/,        // ends with /careers or /careers/
    /\/jobs\/?$/,           // ends with /jobs or /jobs/
    /\/opportunities\/?$/,   // ends with /opportunities
    /\/openings\/?$/,       // ends with /openings
    /\/apply\/?$/,          // ends with /apply
    /\/employment\/?$/      // ends with /employment
  ].some(pattern => pattern.test(url));
  
  return hasJobPattern && !isGenericPage;
}

function getPlatformFromUrl(url: string): string {
  if (url.includes('boards.greenhouse.io') || url.includes('greenhouse.io')) return 'Greenhouse';
  if (url.includes('jobs.lever.co') || url.includes('lever.co')) return 'Lever';
  if (url.includes('jobs.ashbyhq.com') || url.includes('ashbyhq.com')) return 'Ashby';
  if (url.includes('myworkdayjobs.com')) return 'Workday';
  if (url.includes('jobs.workable.com')) return 'Workable';
  if (url.includes('workforcenow.adp.com') || url.includes('myjobs.adp.com')) return 'ADP';
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('glassdoor.com')) return 'Glassdoor';
  if (url.includes('/careers/') || url.includes('/career/')) return 'Career Pages';
  return 'Other';
}

function extractJobTitleFromSearchResult(title: string, snippet: string, url: string): { jobTitle: string; company: string } | null {
  if (!title) return null;
  
  // Extract company FIRST with comprehensive matching
  let company = extractCompanyFromMultipleSources(title, snippet, url);
  
  // Clean up the title - remove company names and common suffixes
  let cleanTitle = title;
  
  // Remove company name from title if we found it
  if (company && company !== 'Company') {
    // Create pattern to match company name (case insensitive, handle spaces/punctuation)
    const companyPattern = new RegExp(`\\s*[-|–]?\\s*${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    cleanTitle = cleanTitle.replace(companyPattern, '');
    
    // Also try removing "at Company" pattern
    const atCompanyPattern = new RegExp(`\\s*at\\s+${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    cleanTitle = cleanTitle.replace(atCompanyPattern, '');
  }
  
  // Clean up the title further
  cleanTitle = cleanTitle
    .replace(/\s*\|\s*.+$/, '') // Remove "| Company Name"
    .replace(/\s*-\s*.+$/, '')  // Remove "- Company Name"  
    .replace(/\s*–\s*.+$/, '')  // Remove "– Company Name"
    .replace(/\s*at\s+.+$/i, '') // Remove "at Company"
    .replace(/\s*\(.+\)$/, '')   // Remove "(Location)"
    .replace(/\s*job\s*$/i, '')  // Remove trailing "job"
    .replace(/\s*position\s*$/i, '') // Remove trailing "position"
    .replace(/\s*opening\s*$/i, '') // Remove trailing "opening"
    .trim();
  
  // Basic validation - reject generic titles, but check snippet for actual job content
  const invalidTitles = ['careers', 'jobs', 'opportunities', 'openings', 'apply', 'home', 'about', 'hiring'];
  const hasInvalidTitle = invalidTitles.some(invalid => cleanTitle.toLowerCase().includes(invalid) && cleanTitle.length < 30);
  
  // If title seems generic, try to extract from snippet instead
  if (hasInvalidTitle && snippet) {
    const snippetJobMatch = snippet.match(/(?:director|manager|engineer|analyst|specialist|lead|senior|principal|staff|developer|designer|scientist|architect|consultant)\s+(?:of\s+)?(?:technology|engineering|product|data|marketing|sales|operations|design|security|software|web|mobile|ai|ml)/i);
    if (snippetJobMatch) {
      cleanTitle = snippetJobMatch[0];
      console.log(`🔄 Extracted job title from snippet: "${cleanTitle}" for ${url}`);
    } else {
      return null;
    }
  }
  
  // Must have reasonable length
  if (cleanTitle.length < 3 || cleanTitle.length > 100) {
    return null;
  }
  
  return {
    jobTitle: cleanTitle,
    company: company || 'Company'
  };
}

function extractCompanyFromMultipleSources(title: string, snippet: string, url: string): string {
  let company = '';
  
  // Method 1: Extract from title with various separators
  const titleSeparators = [
    /\|\s*(.+)$/,           // "Job Title | Company"
    /-\s*(.+)$/,            // "Job Title - Company"  
    /–\s*(.+)$/,            // "Job Title – Company"
    /\sat\s+(.+)$/i,        // "Job Title at Company"
    /\swith\s+(.+)$/i,      // "Job Title with Company"
    /\s@\s*(.+)$/,          // "Job Title @ Company"
    /:\s*(.+)$/,            // "Job Title: Company"
  ];
  
  for (const separator of titleSeparators) {
    const match = title.match(separator);
    if (match && match[1]) {
      const extracted = match[1].trim();
      // Validate it's likely a company name (not location, etc.)
      if (isLikelyCompanyName(extracted)) {
        company = cleanCompanyName(extracted);
        console.log(`📝 Extracted company from title separator: "${company}"`);
        break;
      }
    }
  }
  
  // Method 2: Extract from URL patterns
  if (!company) {
    const urlPatterns = [
      { pattern: /boards\.greenhouse\.io\/([^/]+)/, platform: 'Greenhouse' },
      { pattern: /jobs\.lever\.co\/([^/]+)/, platform: 'Lever' },
      { pattern: /jobs\.ashbyhq\.com\/([^/]+)/, platform: 'Ashby' },
      { pattern: /myworkdayjobs\.com\/([^/]+)/, platform: 'Workday' },
      { pattern: /jobs\.workable\.com\/([^/]+)/, platform: 'Workable' },
      { pattern: /myjobs\.adp\.com\/([^/]+)/, platform: 'ADP' },
      { pattern: /careers\.([^.]+)\./, platform: 'Careers Page' },
      { pattern: /([^.]+)\.careers\./, platform: 'Careers Subdomain' },
      { pattern: /jobs\.([^.]+)\./, platform: 'Jobs Page' },
      { pattern: /([^.]+)\.jobs\./, platform: 'Jobs Subdomain' },
    ];
    
    for (const { pattern, platform } of urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        let extracted = match[1];
        
        // Clean up common URL artifacts
        extracted = extracted
          .replace(/careers?$/, '')
          .replace(/jobs?$/, '')
          .replace(/[-_]/g, ' ')
          .trim();
        
        if (extracted && isLikelyCompanyName(extracted)) {
          company = cleanCompanyName(extracted);
          console.log(`🔗 Extracted company from ${platform} URL: "${company}"`);
          break;
        }
      }
    }
  }
  
  // Method 3: Extract from snippet patterns
  if (!company && snippet) {
    const snippetPatterns = [
      /(?:work\s+at|join|hiring\s+at|career\s+at|opportunity\s+at)\s+([A-Z][a-zA-Z\s&.,-]+?)(?:\s|$|\.)/i,
      /([A-Z][a-zA-Z\s&.,-]+?)\s+is\s+(?:hiring|looking|seeking)/i,
      /Apply\s+to\s+([A-Z][a-zA-Z\s&.,-]+?)(?:\s|$|\.)/i,
      /([A-Z][a-zA-Z\s&.,-]+?)\s+(?:job|position|role|opening)/i,
    ];
    
    for (const pattern of snippetPatterns) {
      const match = snippet.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        if (isLikelyCompanyName(extracted)) {
          company = cleanCompanyName(extracted);
          console.log(`📰 Extracted company from snippet: "${company}"`);
          break;
        }
      }
    }
  }
  
  // Method 4: Extract from domain if all else fails
  if (!company) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const parts = hostname.split('.');
      
      // Skip common subdomains and ATS platforms
      const skipDomains = ['boards', 'jobs', 'careers', 'apply', 'greenhouse', 'lever', 'ashby', 'workday', 'workable', 'adp'];
      const mainDomain = parts.find(part => !skipDomains.includes(part)) || parts[0];
      
      if (mainDomain && mainDomain.length > 2) {
        company = cleanCompanyName(mainDomain);
        console.log(`🌐 Extracted company from domain: "${company}"`);
      }
    } catch (e) {
      // URL parsing failed, continue
    }
  }
  
  return company || 'Company';
}

function isLikelyCompanyName(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Exclude obvious non-company patterns
  const excludePatterns = [
    /^\d+$/,                    // Just numbers
    /^(remote|onsite|hybrid)$/i, // Work types
    /^(full.?time|part.?time|contract|freelance)$/i, // Employment types
    /^(ca|ny|tx|fl|wa|ma|il|pa|oh|ga|nc|mi|nj|va|tn|in|az|mo|md|wi|mn|co|al|sc|la|ky|or|ok|ct|ia|ms|ar|ks|ut|nv|nm|ne|wv|id|hi|nh|me|ri|mt|de|sd|nd|ak|dc|vt|wy)$/i, // US states
    /^(united states|usa|us|canada|uk|europe|asia)$/i, // Countries/regions
    /^(new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|san jose|austin|jacksonville|fort worth|columbus|charlotte|san francisco|indianapolis|seattle|denver|washington|boston|el paso|detroit|nashville|portland|memphis|oklahoma city|las vegas|louisville|baltimore|milwaukee|albuquerque|tucson|fresno|sacramento|mesa|kansas city|atlanta|long beach|colorado springs|raleigh|miami|virginia beach|omaha|oakland|minneapolis|tulsa|cleveland|wichita|arlington)$/i, // Major cities
    /^(apply|hiring|careers?|jobs?|opportunities|openings|positions)$/i, // Job-related terms
    /^(am|pm|est|pst|cst|mst|utc|gmt)$/i, // Time zones
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)$/i, // Months
  ];
  
  return !excludePatterns.some(pattern => pattern.test(text.trim()));
}

function cleanCompanyName(company: string): string {
  return company
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTags(title: string, description: string): string[] {
  const content = `${title} ${description}`.toLowerCase();
  const tags: string[] = [];
  
  // Common tech tags
  const techTerms = [
    'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java', 'node.js',
    'aws', 'docker', 'kubernetes', 'sql', 'nosql', 'mongodb', 'postgresql',
    'remote', 'full-time', 'part-time', 'contract', 'senior', 'junior', 'lead'
  ];
  
  techTerms.forEach(term => {
    if (content.includes(term)) {
      tags.push(term.charAt(0).toUpperCase() + term.slice(1));
    }
  });
  
  const uniqueTags = Array.from(new Set(tags));
  return uniqueTags.slice(0, 5); // Limit to 5 unique tags
}


// Graceful version that handles rate limits
export async function scrapeJobsFromAllPlatformsGraceful(query: string, site: string, location: string, timeFilter?: string, isEmailRecommendation?: boolean): Promise<InsertJob[]> {
  try {
    return await scrapeJobsFromAllPlatforms(query, site, location, timeFilter, isEmailRecommendation);
  } catch (error) {
    console.error('❌ Error in scrapeJobsFromAllPlatforms:', error);
    // Return empty array instead of throwing - let the UI handle gracefully
    return [];
  }
}

// Streaming version that sends progress updates
export async function scrapeJobsFromAllPlatformsStreaming(
  query: string, 
  site: string, 
  location: string, 
  timeFilter?: string, 
  sendEvent?: (event: string, data: any) => void
): Promise<InsertJob[]> {
  const allJobs: InsertJob[] = [];
  const platforms = site === 'all' ? [
    'greenhouse.io', 'lever.co', 'ashbyhq.com', 'myworkdayjobs.com', 
    'jobs.workable.com', 'adp', 'icims.com', 'jobvite.com'
  ] : [site];
  
  let processedPlatforms = 0;
  
  for (const platform of platforms.slice(0, 5)) { // Limit to first 5 to avoid quotas
    try {
      sendEvent?.('progress', { 
        platform, 
        processed: processedPlatforms, 
        total: Math.min(platforms.length, 5),
        message: `Searching ${platform}...`
      });
      
      const jobs = await scrapeJobsFromPlatform(query, platform, location, timeFilter, maxResultsPerPlatform);
      allJobs.push(...jobs);
      
      processedPlatforms++;
      
      // Send the jobs found for this platform
      sendEvent?.('jobs', {
        platform,
        jobs: jobs,
        jobsFromPlatform: jobs.length,
        totalJobsSoFar: allJobs.length
      });
      
      sendEvent?.('platform-complete', {
        platform,
        jobsFound: jobs.length,
        totalJobs: allJobs.length
      });
      
      // Add delay between platforms
      if (processedPlatforms < Math.min(platforms.length, 5)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Failed to search ${platform}:`, error);
      sendEvent?.('platform-error', { platform, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
  
  return allJobs;
}

export async function scrapeJobsFromAllPlatforms(query: string, site: string, location: string, timeFilter?: string, isEmailRecommendation?: boolean, maxResultsPerPlatform?: number): Promise<InsertJob[]> {
  console.log(`Starting search for "${query}" on site "${site}" with location "${location}"`);
  
  const platforms = site === 'all' ? [
    // Major ATS Platforms
    'greenhouse.io',
    'lever.co',
    'ashbyhq.com',
    'myworkdayjobs.com',
    'jobs.workable.com',
    'adp',
    'icims.com',
    'jobvite.com',
    
    // Modern Platforms
    'remoterocketship.com',
    'wellfound.com',
    'workatastartup.com',
    'builtin.com',
    'rippling-ats.com',
    'jobs.gusto.com',
    'dover.io',
    
    // HR Systems
    'recruiting.paylocity.com',
    'breezy.hr',
    'applytojob.com',
    'jobs.smartrecruiters.com',
    'trinethire.com',
    'recruitee.com',
    'teamtailor.com',
    'homerun.co',
    
    // Specialized
    'pinpointhq.com',
    'keka.com',
    'oraclecloud.com',
    'careerpuck.com',
    'jobappnetwork.com',
    'gem.com',
    'trakstar.com',
    'catsone.com',
    'notion.site',
    
    // Job Boards
    'linkedin.com',
    'glassdoor.com',
    
    // Generic Patterns (these will cover many more sites)
    'jobs.*',
    'careers.*',
    'people.*',
    'talent.*',
    'other-pages'
  ] : [site];

  let allJobs: InsertJob[] = [];
  
  // Choose search strategy based on context
  if (site === 'all') {
    const delay = isEmailRecommendation ? 1000 : 600; // 1s for emails, 600ms for manual
    console.log(`🚀 Running search across ${platforms.length} platforms (delay: ${delay}ms per platform)`);
    
    if (isEmailRecommendation) {
      // For email recommendations, use sequential search with 1s delays
      console.log('📧 Email recommendation mode: using sequential search with 1s rate limiting');
      
      for (const platform of platforms) {
        try {
          console.log(`🔍 Starting sequential search on: ${platform}`);
          const jobs = await scrapeJobsFromPlatform(query, platform, location, timeFilter, maxResultsPerPlatform);
          console.log(`✅ Found ${jobs.length} jobs from ${platform}`);
          allJobs.push(...jobs);
          
          // Wait 1 second between each platform search
          if (platforms.indexOf(platform) < platforms.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`❌ Failed to scrape ${platform}:`, error);
        }
      }
    } else {
      // For manual searches, use parallel with faster rate limiting
      console.log('⚡ Manual search mode: using optimized parallel search');
      
      const searchPromises = platforms.map(async (platform, index) => {
        // Stagger the start times to respect rate limits
        await new Promise(resolve => setTimeout(resolve, index * 600));
        
        try {
          console.log(`🔍 Starting parallel search on: ${platform}`);
          const jobs = await scrapeJobsFromPlatform(query, platform, location, timeFilter, maxResultsPerPlatform);
          console.log(`✅ Found ${jobs.length} jobs from ${platform}`);
          return jobs;
        } catch (error) {
          console.error(`❌ Failed to scrape ${platform}:`, error);
          return []; // Return empty array on failure
        }
      });
      
      // Wait for all searches to complete
      const results = await Promise.allSettled(searchPromises);
      
      // Collect all successful results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          allJobs.push(...result.value);
          console.log(`📊 Added ${result.value.length} jobs from ${platforms[index]}`);
        } else if (result.status === 'rejected') {
          console.error(`⚠️ Platform ${platforms[index]} search was rejected:`, result.reason);
        }
      });
    }
    
  } else {
    // Single platform search - use existing sequential approach
    console.log(`🔍 Running single platform search on: ${site}`);
    try {
      const jobs = await scrapeJobsFromPlatform(query, site, location, timeFilter, maxResultsPerPlatform);
      console.log(`✅ Found ${jobs.length} jobs from ${site}`);
      allJobs.push(...jobs);
    } catch (error) {
      console.error(`❌ Failed to scrape ${site}:`, error);
    }
  }
  
  console.log(`📈 Total jobs found before deduplication: ${allJobs.length}`);
  
  // Remove duplicates based on URL
  const uniqueJobs = allJobs.filter((job, index, self) => 
    index === self.findIndex(j => j.url === job.url)
  );
  
  console.log(`✨ Total unique jobs after deduplication: ${uniqueJobs.length}`);
  return uniqueJobs;
}

async function scrapeJobsFromPlatform(query: string, site: string, location: string, timeFilter?: string, maxResults?: number): Promise<InsertJob[]> {
  try {
    console.log(`\n🔍 Scraping platform: ${site} for query: "${query}"`);
    
    // Use site-specific search query with time filter
    const searchQuery = buildSearchQuery(query, site, location, timeFilter);
    console.log(`🎯 Final search query: ${searchQuery}`);
    
    // Fetch multiple pages of results to get more jobs
    const allResults: (InsertJob | string)[] = [];
    
    // Get up to 5 pages (50 results max from Google API) or until we hit maxResults
    const maxPages = maxResults ? Math.min(Math.ceil(maxResults / 10), 5) : 5;
    
    for (let page = 1; page <= maxPages; page++) {
      const startIndex = (page - 1) * 10 + 1;
      const pageResults = await searchWithGoogleAPI(searchQuery, startIndex, timeFilter);
      
      if (pageResults.length === 0) {
        console.log(`No more results found on page ${page}, stopping...`);
        break;
      }
      
      allResults.push(...pageResults);
      
      // Check if we've hit the maxResults limit
      if (maxResults && allResults.length >= maxResults) {
        console.log(`Reached max results limit of ${maxResults}`);
        break;
      }
      
      // Add delay between API calls to respect rate limits (shorter delay within same platform)
      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Separate job objects from URLs that need scraping
    const jobsFromSearchResults = allResults.filter((item): item is InsertJob => typeof item === 'object');
    const urlsToScrape = allResults.filter((item): item is string => typeof item === 'string');
    
    console.log(`Found ${jobsFromSearchResults.length} jobs from search results and ${urlsToScrape.length} URLs to scrape for ${site}`);
    
    const jobs: InsertJob[] = [...jobsFromSearchResults];
    
    // Only scrape URLs if we don't have enough jobs from search results
    if (jobsFromSearchResults.length < 10 && urlsToScrape.length > 0) {
      console.log(`Scraping additional URLs since we only have ${jobsFromSearchResults.length} jobs from search results`);
      
      // Process URLs in smaller batches to avoid overwhelming the system
      const BATCH_SIZE = 5;
      for (let i = 0; i < Math.min(urlsToScrape.length, 20); i += BATCH_SIZE) {
        const batch = urlsToScrape.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(link => scrapeJobDetails(link, query));
        
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            jobs.push(result.value);
            console.log(`✅ Successfully scraped job from: ${batch[index]}`);
          } else if (result.status === 'rejected') {
            console.log(`❌ Failed to scrape ${batch[index]}: ${result.reason}`);
          } else {
            console.log(`⚠️ Scraping returned null for: ${batch[index]}`);
          }
        });
        
        // Small delay between batches to be respectful
        if (i + BATCH_SIZE < Math.min(urlsToScrape.length, 20)) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    // Apply maxResults limit if specified
    const finalJobs = maxResults && jobs.length > maxResults ? jobs.slice(0, maxResults) : jobs;
    
    console.log(`Successfully scraped ${finalJobs.length} jobs from ${site}${maxResults ? ` (limited to ${maxResults})` : ''}`);
    return finalJobs;
  } catch (error) {
    console.error(`Scraping failed for ${site}:`, error);
    return [];
  }
}
