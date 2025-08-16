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

function buildSearchUrl(query: string, site: string, location: string = "all"): string {
  // Use quoted search terms for more precise results
  const quotedQuery = encodeURIComponent(`"${query}"`);
  const locationFilter = location === "remote" ? " remote" : location === "onsite" ? " onsite" : "";
  
  switch (site) {
    case "linkedin.com":
      const linkedinLocation = location === "remote" ? "Remote" : "";
      return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${linkedinLocation}`;
    case "adp":
      const adpQuery = `${quotedQuery} site:workforcenow.adp.com OR site:myjobs.adp.com${locationFilter}`;
      return `https://www.google.com/search?q=${adpQuery}&hl=en&num=100`;
    case "careers.*":
      const careersQuery = `${quotedQuery} inurl:careers OR inurl:career${locationFilter}`;
      return `https://www.google.com/search?q=${careersQuery}&hl=en&num=100`;
    case "other-pages":
      const otherQuery = `${quotedQuery} inurl:employment OR inurl:opportunities OR inurl:openings${locationFilter}`;
      return `https://www.google.com/search?q=${otherQuery}&hl=en&num=100`;
    default:
      return `https://www.google.com/search?q=${quotedQuery} site:${site}${locationFilter}&hl=en&num=100`;
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
    const searchUrl = buildSearchUrl(query, site, location);
    console.log(`Searching URL: ${searchUrl}`);
    
    const searchResponse = await fetch(searchUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Search failed: HTTP ${searchResponse.status}`);
    }
    
    const searchHtml = await searchResponse.text();
    const $ = cheerio.load(searchHtml);

    const jobLinks = new Set<string>();
    
    // Extract job links from Google search results - handle multiple formats
    $('a').each((i, element) => {
      const href = $(element).attr('href');
      if (!href) return;
      
      let cleanUrl = '';
      
      // Handle /url?q= format
      if (href.startsWith('/url?q=')) {
        try {
          const url = new URL(`https://google.com${href}`);
          cleanUrl = url.searchParams.get('q') || '';
        } catch (urlError) {
          return;
        }
      }
      // Handle direct URLs (newer Google format)
      else if (href.startsWith('http')) {
        cleanUrl = href;
      }
      // Handle relative URLs
      else if (href.startsWith('/')) {
        return; // Skip internal Google links
      }
      
      // Check if this is a job-related URL
      if (cleanUrl && (
        cleanUrl.includes('jobs.lever.co') || 
        cleanUrl.includes('boards.greenhouse.io') || 
        cleanUrl.includes('jobs.ashbyhq.com') ||
        cleanUrl.includes('myworkdayjobs.com') ||
        cleanUrl.includes('jobs.workable.com') ||
        cleanUrl.includes('workforcenow.adp.com') ||
        cleanUrl.includes('myjobs.adp.com') ||
        cleanUrl.includes('/careers/') ||
        cleanUrl.includes('/career/') ||
        cleanUrl.includes('/employment/') ||
        cleanUrl.includes('/opportunities/') ||
        cleanUrl.includes('/openings/')
      )) {
        // Remove Google tracking parameters
        try {
          const cleanedUrl = new URL(cleanUrl);
          cleanedUrl.searchParams.delete('ved');
          cleanedUrl.searchParams.delete('usg');
          cleanedUrl.searchParams.delete('sa');
          jobLinks.add(cleanedUrl.toString());
        } catch {
          jobLinks.add(cleanUrl);
        }
      }
    });
    
    // Debug: Log first few links found to understand what Google is returning
    if (jobLinks.size === 0) {
      console.log(`No job links found. Checking all links found on page for ${site}:`);
      let linkCount = 0;
      $('a').each((i, element) => {
        if (linkCount >= 10) return false; // Log first 10 for debugging
        const href = $(element).attr('href');
        if (href) {
          console.log(`  Link ${linkCount + 1}: ${href}`);
          linkCount++;
        }
      });
      
      // Also check if Google is blocking us
      const title = $('title').text();
      console.log(`Page title: ${title}`);
      if (title.toLowerCase().includes('unusual traffic') || title.toLowerCase().includes('blocked')) {
        console.log('Google may be blocking our requests due to unusual traffic');
      }
    }

    console.log(`Found ${jobLinks.size} job links for ${site}`);
    
    if (jobLinks.size === 0) {
      console.log(`No job links found for ${site}`);
      return [];
    }

    const jobs: InsertJob[] = [];
    const linksArray = Array.from(jobLinks);
    // Scrape all available job links, no limit
    const scrapePromises = linksArray.map(link => scrapeJobDetails(link));

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
