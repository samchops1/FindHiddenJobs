import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchRequestSchema, type InsertJob } from "@shared/schema";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function registerRoutes(app: Express): Promise<Server> {
  // Job search endpoint
  app.get('/api/search', async (req, res) => {
    try {
      // Parse query parameters with default pagination values
      const queryParams = {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 25
      };
      
      const { query, site, location, page, limit } = searchRequestSchema.parse(queryParams);
      
      // Store search history
      await storage.createSearch({
        query,
        platform: site === 'all' ? 'All Platforms' : site,
        resultCount: "0"
      });

      const allJobs = await scrapeJobsFromAllPlatforms(query, site, location);
      
      // Store scraped jobs
      for (const jobData of allJobs) {
        await storage.createJob(jobData);
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

      // Update search result count
      const searches = await storage.getRecentSearches();
      const latestSearch = searches[0];
      if (latestSearch) {
        latestSearch.resultCount = totalJobs.toString();
      }

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
      res.status(500).json({ 
        error: 'Failed to search jobs', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
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

  const httpServer = createServer(app);
  return httpServer;
}

function buildSearchQuery(query: string, site: string, location: string = "all"): string {
  // Add location filter to the search query
  let locationFilter = "";
  if (location === "remote") {
    locationFilter = " remote";
  } else if (location === "onsite") {
    locationFilter = " onsite";
  } else if (location === "hybrid") {
    locationFilter = " hybrid";
  }
  
  // Always wrap query in quotes for exact matching
  const quotedQuery = `"${query}"`;
  
  // Detect if this is a leadership/executive search
  const isExecutiveRole = query.toLowerCase().includes('director') || 
                          query.toLowerCase().includes('cto') || 
                          query.toLowerCase().includes('ceo') || 
                          query.toLowerCase().includes('vp') || 
                          query.toLowerCase().includes('head of') ||
                          query.toLowerCase().includes('chief') ||
                          query.toLowerCase().includes('executive') ||
                          query.toLowerCase().includes('lead') ||
                          query.toLowerCase().includes('manager') ||
                          query.toLowerCase().includes('principal');
  
  // Use broader keywords for executive roles, more specific for others
  const jobKeywords = isExecutiveRole ? 
    " (position OR role OR opportunity OR opening)" : 
    " (job OR jobs OR hiring OR career OR position OR opening OR opportunity)";
  
  console.log(`🔍 Building search query: "${quotedQuery}" + location: "${locationFilter}" + keywords: "${jobKeywords}"`);
  
  switch (site) {
    case "boards.greenhouse.io":
      return `site:boards.greenhouse.io ${quotedQuery}${locationFilter}${jobKeywords}`;
    case "jobs.lever.co":
      return `site:jobs.lever.co ${quotedQuery}${locationFilter}${jobKeywords}`;
    case "jobs.ashbyhq.com":
      return `site:jobs.ashbyhq.com ${quotedQuery}${locationFilter}${jobKeywords}`;
    case "jobs.workable.com":
      return `site:jobs.workable.com ${quotedQuery}${locationFilter}${jobKeywords}`;
    case "myworkdayjobs.com":
      return `site:myworkdayjobs.com ${quotedQuery}${locationFilter}${jobKeywords}`;
    case "adp":
      return `(site:workforcenow.adp.com OR site:myjobs.adp.com) ${quotedQuery}${locationFilter}${jobKeywords}`;
    case "careers.*":
      return `${quotedQuery} (inurl:careers OR inurl:career OR inurl:jobs) -inurl:blog -inurl:news${locationFilter}`;
    case "other-pages":
      return `${quotedQuery} (inurl:employment OR inurl:opportunities OR inurl:openings OR inurl:apply) -inurl:blog${locationFilter}`;
    default:
      return `site:${site} ${quotedQuery}${locationFilter}${jobKeywords}`;
  }
}

async function searchWithGoogleAPI(searchQuery: string, startIndex: number = 1): Promise<string[]> {
  const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    console.error('❌ Missing Google Search API credentials');
    console.error(`API Key exists: ${!!API_KEY}`);
    console.error(`Search Engine ID exists: ${!!SEARCH_ENGINE_ID}`);
    return [];
  }
  
  console.log(`✅ API credentials confirmed, searching from index ${startIndex}`);
  
  try {
    // Increase num to 10 (max allowed per request), add start parameter for pagination
    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=10&start=${startIndex}`;
      
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
    
    // Extract job-related URLs from search results
    const jobLinks: string[] = [];
    
    data.items.forEach((item) => {
      const link = item.link;
      const title = item.title?.toLowerCase() || '';
      const snippet = item.snippet?.toLowerCase() || '';
      
      // Check if it's a known job platform
      const isJobPlatform = link && (
        link.includes('jobs.lever.co') || 
        link.includes('boards.greenhouse.io') || 
        link.includes('jobs.ashbyhq.com') ||
        link.includes('myworkdayjobs.com') ||
        link.includes('jobs.workable.com') ||
        link.includes('workforcenow.adp.com') ||
        link.includes('myjobs.adp.com')
      );
      
      // Check if URL suggests a job posting
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
        snippet.includes('apply') ||
        snippet.includes('hiring') ||
        snippet.includes('job description') ||
        snippet.includes('requirements') ||
        snippet.includes('qualifications')
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
      
      if (link && !isExcluded && (isJobPlatform || (hasJobUrl && hasJobIndicators))) {
        jobLinks.push(link);
        console.log(`✅ Added job link: ${link.substring(0, 80)}...`);
      } else if (link && !isExcluded) {
        console.log(`⚠️ Skipped link (no job indicators): ${link.substring(0, 80)}...`);
      }
    });
    
    console.log(`✅ Google API returned ${data.items.length} total results, ${jobLinks.length} job-related links`);
    return jobLinks;
    
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

async function scrapeJobDetails(link: string): Promise<InsertJob | null> {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(link, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
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

    // Smart scraper logic for different ATS platforms
    if (link.includes('boards.greenhouse.io')) {
      platform = 'Greenhouse';
      title = $('#app_title').text().trim();
      company = $('.company-name').text().trim().replace('at ', '');
      location = $('.location').text().trim();
      description = $('#content').html() || '';
    } else if (link.includes('jobs.lever.co')) {
      platform = 'Lever';
      title = $('h2.posting-headline').text().trim();
      const companyFromTitle = $('.main-header-mobile .posting-headline a').text().trim();
      company = companyFromTitle || $('meta[property="og:site_name"]').attr('content') || '';
      location = $('.posting-categories .location').text().trim();
      description = $('div[data-qa="job-description"]').html() || '';
    } else if (link.includes('jobs.ashbyhq.com')) {
      platform = 'Ashby';
      title = $('h1[class*="_title_"]').text().trim();
      company = $('a[class*="_companyName_"]').text().trim();
      location = $('div[class*="_location_"]').text().trim();
      description = $('div[class*="_description_"]').html() || '';
    } else if (link.includes('myworkdayjobs.com')) {
      platform = 'Workday';
      title = $('h1[data-automation-id="jobPostingHeader"]').text().trim();
      company = $('span[data-automation-id="jobPostingCompany"]').text().trim();
      location = $('span[data-automation-id="jobPostingLocation"]').text().trim();
      description = $('div[data-automation-id="jobPostingDescription"]').html() || '';
    } else if (link.includes('jobs.workable.com')) {
      platform = 'Workable';
      title = $('h1.job-title').text().trim();
      company = $('.company-name').text().trim();
      location = $('.location').text().trim();
      description = $('.job-description').html() || '';
    } else if (link.includes('workforcenow.adp.com') || link.includes('myjobs.adp.com')) {
      platform = 'ADP';
      title = $('h1').first().text().trim() || $('.job-title').text().trim();
      company = $('.company-name').text().trim() || $('[class*="company"]').text().trim();
      location = $('.location').text().trim() || $('[class*="location"]').text().trim();
      description = $('.job-description').html() || $('[class*="description"]').html() || '';
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

    // Return job if we have at least a title OR company
    if (title || company) {
      // Use title as fallback for company if needed
      if (!company && title) {
        company = 'Unknown Company';
      }
      // Use a generic title if we only have company
      if (!title && company) {
        title = 'Open Position';
      }
      
      const cleanCompany = (company || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
      return {
        title: title || 'Position Available',
        company: company || 'Company',
        location: location || 'Not specified',
        description: description ? description.substring(0, 1000) : null,
        url: link,
        logo: cleanCompany ? `https://logo.clearbit.com/${cleanCompany}.com` : null,
        platform,
        tags: extractTags(title || '', description || '')
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


async function scrapeJobsFromAllPlatforms(query: string, site: string, location: string): Promise<InsertJob[]> {
  console.log(`Starting search for "${query}" on site "${site}" with location "${location}"`);
  
  const platforms = site === 'all' ? [
    'boards.greenhouse.io',
    'jobs.lever.co', 
    'jobs.ashbyhq.com',
    'jobs.workable.com',
    'myworkdayjobs.com',
    'adp',
    'careers.*',
    'other-pages'
  ] : [site];

  let allJobs: InsertJob[] = [];
  
  // If searching all platforms, run in parallel for better performance
  if (site === 'all') {
    console.log(`🚀 Running parallel search across ${platforms.length} platforms`);
    
    // Run all platform searches in parallel
    const searchPromises = platforms.map(async (platform) => {
      try {
        console.log(`🔍 Starting parallel search on: ${platform}`);
        const jobs = await scrapeJobsFromPlatform(query, platform, location);
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
    
  } else {
    // Single platform search - use existing sequential approach
    console.log(`🔍 Running single platform search on: ${site}`);
    try {
      const jobs = await scrapeJobsFromPlatform(query, site, location);
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

async function scrapeJobsFromPlatform(query: string, site: string, location: string): Promise<InsertJob[]> {
  try {
    console.log(`\n🔍 Scraping platform: ${site}`);
    
    // Use site-specific search query now that API is working
    const searchQuery = buildSearchQuery(query, site, location);
    console.log(`Searching with query: ${searchQuery}`);
    
    // Fetch multiple pages of results to get more jobs
    const allJobLinks: string[] = [];
    
    // Get up to 5 pages (50 results max from Google API)
    for (let page = 1; page <= 5; page++) {
      const startIndex = (page - 1) * 10 + 1;
      const pageLinks = await searchWithGoogleAPI(searchQuery, startIndex);
      
      if (pageLinks.length === 0) {
        console.log(`No more results found on page ${page}, stopping...`);
        break;
      }
      
      allJobLinks.push(...pageLinks);
      
      // Add delay between API calls to respect rate limits
      if (page < 5) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`Found ${allJobLinks.length} total job links for ${site}`);
    
    if (allJobLinks.length === 0) {
      console.log(`No job links found for ${site}`);
      return [];
    }

    const jobs: InsertJob[] = [];
    
    // Process links in smaller batches to avoid overwhelming the system
    const BATCH_SIZE = 5;
    for (let i = 0; i < allJobLinks.length; i += BATCH_SIZE) {
      const batch = allJobLinks.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(link => scrapeJobDetails(link));
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          jobs.push(result.value);
        }
      });
      
      // Small delay between batches to be respectful
      if (i + BATCH_SIZE < allJobLinks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Successfully scraped ${jobs.length} jobs from ${site}`);
    return jobs;
  } catch (error) {
    console.error(`Scraping failed for ${site}:`, error);
    return [];
  }
}
