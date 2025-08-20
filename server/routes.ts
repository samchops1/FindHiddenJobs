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
  
  // Add job-specific keywords to improve relevance
  const jobKeywords = " (job OR jobs OR hiring OR career OR position OR opening OR opportunity)";
  
  switch (site) {
    case "boards.greenhouse.io":
      return `site:boards.greenhouse.io "${query}"${locationFilter}${jobKeywords}`;
    case "jobs.lever.co":
      return `site:jobs.lever.co "${query}"${locationFilter}${jobKeywords}`;
    case "jobs.ashbyhq.com":
      return `site:jobs.ashbyhq.com "${query}"${locationFilter}${jobKeywords}`;
    case "jobs.workable.com":
      return `site:jobs.workable.com "${query}"${locationFilter}${jobKeywords}`;
    case "myworkdayjobs.com":
      return `site:myworkdayjobs.com "${query}"${locationFilter}${jobKeywords}`;
    case "adp":
      return `(site:workforcenow.adp.com OR site:myjobs.adp.com) "${query}"${locationFilter}${jobKeywords}`;
    case "careers.*":
      return `"${query}" (inurl:careers OR inurl:career OR inurl:jobs) -inurl:blog -inurl:news${locationFilter}`;
    case "other-pages":
      return `"${query}" (inurl:employment OR inurl:opportunities OR inurl:openings OR inurl:apply) -inurl:blog${locationFilter}`;
    default:
      return `site:${site} "${query}"${locationFilter}${jobKeywords}`;
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

function createFallbackJob(link: string): InsertJob | null {
  try {
    const url = new URL(link);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Try to extract company and job info from URL
    let company = '';
    let title = 'Software Engineer Position';
    let platform = 'Unknown';
    
    // Detect platform
    if (url.hostname.includes('greenhouse.io')) {
      platform = 'Greenhouse';
      company = pathParts[0] || 'Company';
      // Often the job ID or slug is in the path
      if (pathParts.length > 1) {
        const jobSlug = pathParts[pathParts.length - 1];
        // Try to make a readable title from slug
        title = jobSlug.replace(/-/g, ' ').replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        // Remove job IDs if present
        title = title.replace(/\d{5,}/g, '').trim() || 'Software Engineer Position';
      }
    } else if (url.hostname.includes('lever.co')) {
      platform = 'Lever';
      company = pathParts[0] || 'Company';
    } else if (url.hostname.includes('ashbyhq.com')) {
      platform = 'Ashby';
      company = pathParts[0] || 'Company';
    } else if (url.hostname.includes('myworkdayjobs.com')) {
      platform = 'Workday';
      // Extract company from subdomain
      const subdomain = url.hostname.split('.')[0];
      company = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
    } else if (url.hostname.includes('workable.com')) {
      platform = 'Workable';
    } else {
      // Try to extract company from domain
      company = url.hostname.replace('www.', '').split('.')[0];
      company = company.charAt(0).toUpperCase() + company.slice(1);
    }
    
    // Clean up company name
    company = company.replace(/-/g, ' ').replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const cleanCompany = company.replace(/[^a-z0-9]/gi, '').toLowerCase();
    
    return {
      title,
      company: company || 'Company',
      location: 'See job posting',
      description: null,
      url: link,
      logo: cleanCompany ? `https://logo.clearbit.com/${cleanCompany}.com` : null,
      platform,
      tags: ['Software Engineer']
    };
  } catch (error) {
    console.error(`Failed to create fallback job for ${link}:`, error);
    return null;
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
      redirect: 'follow'
    });
    
    if (!response.ok) {
      // For 403/404 errors, return basic info from URL instead of failing completely
      if (response.status === 403 || response.status === 404 || response.status === 410) {
        return createFallbackJob(link);
      }
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
    return createFallbackJob(link);
  } catch (error) {
    console.error(`Error scraping ${link}:`, error);
    // Try to return fallback data instead of null
    return createFallbackJob(link);
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
    console.log(`\n🔍 Scraping platform: ${site}`);
    
    // Use site-specific search query now that API is working
    const searchQuery = buildSearchQuery(query, site, location);
    console.log(`Searching with query: ${searchQuery}`);
    
    // Fetch multiple pages of results (2 pages = 20 results max)
    const allJobLinks: string[] = [];
    
    // First page
    const firstPageLinks = await searchWithGoogleAPI(searchQuery, 1);
    allJobLinks.push(...firstPageLinks);
    
    // Second page if first page had results
    if (firstPageLinks.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between API calls
      const secondPageLinks = await searchWithGoogleAPI(searchQuery, 11);
      allJobLinks.push(...secondPageLinks);
    }
    
    console.log(`Found ${allJobLinks.length} total job links for ${site}`);
    
    if (allJobLinks.length === 0) {
      console.log(`No job links found for ${site}`);
      return [];
    }

    const jobs: InsertJob[] = [];
    // Scrape all available job links, no limit
    const scrapePromises = allJobLinks.map(link => scrapeJobDetails(link));

    const results = await Promise.allSettled(scrapePromises);
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        jobs.push(result.value);
      }
    });

    console.log(`Successfully scraped ${jobs.length} jobs from ${site}`);
    return jobs;
  } catch (error) {
    console.error(`Scraping failed for ${site}:`, error);
    return [];
  }
}
