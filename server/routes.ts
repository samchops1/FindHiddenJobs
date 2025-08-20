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
      const { query, site, location } = searchRequestSchema.parse(req.query);
      
      // Store search history
      await storage.createSearch({
        query,
        platform: site === 'all' ? 'All Platforms' : site,
        resultCount: "0"
      });

      const jobs = await scrapeJobsFromAllPlatforms(query, site, location);
      
      // Store scraped jobs
      for (const jobData of jobs) {
        await storage.createJob(jobData);
      }

      // Update search result count
      const searches = await storage.getRecentSearches();
      const latestSearch = searches[0];
      if (latestSearch) {
        latestSearch.resultCount = jobs.length.toString();
      }

      res.json(jobs);
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
  const locationFilter = location === "remote" ? " remote" : location === "onsite" ? " onsite" : "";
  
  switch (site) {
    case "boards.greenhouse.io":
      return `"${query}" site:boards.greenhouse.io${locationFilter}`;
    case "jobs.lever.co":
      return `"${query}" site:jobs.lever.co${locationFilter}`;
    case "jobs.ashbyhq.com":
      return `"${query}" site:jobs.ashbyhq.com${locationFilter}`;
    case "jobs.workable.com":
      return `"${query}" site:jobs.workable.com${locationFilter}`;
    case "myworkdayjobs.com":
      return `"${query}" site:myworkdayjobs.com${locationFilter}`;
    case "adp":
      return `"${query}" (site:workforcenow.adp.com OR site:myjobs.adp.com)${locationFilter}`;
    case "careers.*":
      return `"${query}" (inurl:careers OR inurl:career)${locationFilter}`;
    case "other-pages":
      return `"${query}" (inurl:employment OR inurl:opportunities OR inurl:openings)${locationFilter}`;
    default:
      return `"${query}" site:${site}${locationFilter}`;
  }
}

async function searchWithGoogleAPI(searchQuery: string): Promise<string[]> {
  const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    console.error('Missing Google Search API credentials');
    return [];
  }
  
  console.log(`API Key exists: ${!!API_KEY}`);
  console.log(`Search Engine ID: ${SEARCH_ENGINE_ID}`);
  
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=10`;
    console.log(`API URL: ${url.replace(API_KEY, 'HIDDEN_KEY')}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Search API error: ${response.status} - ${errorText}`);
      
      // Try a simple test query to check credentials
      if (searchQuery.includes('site:')) {
        console.log('Trying simple test query without site operators...');
        const testUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent('director jobs')}&num=5`;
        const testResponse = await fetch(testUrl);
        if (testResponse.ok) {
          console.log('Simple query works, issue with search operators');
        } else {
          const testError = await testResponse.text();
          console.error(`Test query also failed: ${testResponse.status} - ${testError}`);
        }
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
      if (link && (
        link.includes('jobs.lever.co') || 
        link.includes('boards.greenhouse.io') || 
        link.includes('jobs.ashbyhq.com') ||
        link.includes('myworkdayjobs.com') ||
        link.includes('jobs.workable.com') ||
        link.includes('workforcenow.adp.com') ||
        link.includes('myjobs.adp.com') ||
        link.includes('/careers/') ||
        link.includes('/career/') ||
        link.includes('/employment/') ||
        link.includes('/opportunities/') ||
        link.includes('/openings/')
      )) {
        jobLinks.push(link);
      }
    });
    
    console.log(`Google API returned ${data.items.length} results, ${jobLinks.length} job-related links`);
    return jobLinks;
    
  } catch (error) {
    console.error('Google Search API error:', error);
    return [];
  }
}

async function scrapeJobDetails(link: string): Promise<InsertJob | null> {
  try {
    const response = await fetch(link, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
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
    } else if (link.includes('/careers/') || link.includes('/career/')) {
      platform = 'Career Pages';
      title = $('h1').first().text().trim() || $('.job-title').text().trim();
      company = $('.company-name').text().trim() || $('title').text().split(' - ')[0] || '';
      location = $('.location').text().trim() || $('[class*="location"]').text().trim();
      description = $('.job-description').html() || $('.description').html() || '';
    }

    if (title && company) {
      const cleanCompany = company.replace(/[^a-z0-9]/gi, '').toLowerCase();
      return {
        title,
        company,
        location: location || 'Not specified',
        description: description ? description.substring(0, 1000) : null,
        url: link,
        logo: `https://logo.clearbit.com/${cleanCompany}.com`,
        platform,
        tags: extractTags(title, description || '')
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error scraping ${link}:`, error);
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

  const allJobs: InsertJob[] = [];
  
  for (const platform of platforms) {
    try {
      console.log(`Scraping platform: ${platform}`);
      const jobs = await scrapeJobsFromPlatform(query, platform, location);
      console.log(`Found ${jobs.length} jobs from ${platform}`);
      allJobs.push(...jobs);
      
      // Add delay between platforms to avoid rate limiting
      if (platforms.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to scrape ${platform}:`, error);
      // Continue with other platforms even if one fails
    }
  }
  
  console.log(`Total jobs found before deduplication: ${allJobs.length}`);
  
  // Remove duplicates based on URL
  const uniqueJobs = allJobs.filter((job, index, self) => 
    index === self.findIndex(j => j.url === job.url)
  );
  
  console.log(`Total unique jobs after deduplication: ${uniqueJobs.length}`);
  return uniqueJobs;
}

async function scrapeJobsFromPlatform(query: string, site: string, location: string): Promise<InsertJob[]> {
  try {
    const searchQuery = buildSearchQuery(query, site, location);
    console.log(`Searching with Google API: ${searchQuery}`);
    
    const jobLinks = await searchWithGoogleAPI(searchQuery);
    console.log(`Found ${jobLinks.length} job links for ${site}`);
    
    if (jobLinks.length === 0) {
      console.log(`No job links found for ${site}`);
      return [];
    }

    const jobs: InsertJob[] = [];
    // Scrape all available job links, no limit
    const scrapePromises = jobLinks.map(link => scrapeJobDetails(link));

    const results = await Promise.allSettled(scrapePromises);
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        jobs.push(result.value);
      }
    });

    return jobs;
  } catch (error) {
    console.error(`Scraping failed for ${site}:`, error);
    return [];
  }
}
