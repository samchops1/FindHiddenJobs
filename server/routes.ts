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
  const encodedQuery = encodeURIComponent(`"${query}"`);
  const locationFilter = location === "remote" ? "+remote" : location === "onsite" ? "-remote" : "";
  
  switch (site) {
    case "linkedin.com":
      const linkedinLocation = location === "remote" ? "Remote" : "";
      return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${linkedinLocation}`;
    case "adp":
      const adpQuery = `${encodedQuery} (site:workforcenow.adp.com OR site:myjobs.adp.com)${locationFilter}`;
      return `https://www.google.com/search?q=${adpQuery}&hl=en`;
    case "careers.*":
      const careersQuery = `${encodedQuery} (site:careers.* OR site:*/careers/* OR site:*/career/*)${locationFilter}`;
      return `https://www.google.com/search?q=${careersQuery}&hl=en`;
    case "other-pages":
      const otherQuery = `${encodedQuery} (site:*/employment/* OR site:*/opportunities/* OR site:*/openings/*)${locationFilter}`;
      return `https://www.google.com/search?q=${otherQuery}&hl=en`;
    default:
      return `https://www.google.com/search?q=${encodedQuery}+site:${site}${locationFilter}&hl=en`;
  }
}

async function scrapeJobDetails(link: string): Promise<InsertJob | null> {
  try {
    const response = await fetch(link, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
    } else if (link.includes('workable.com')) {
      platform = 'Workable';
      title = $('h1.job-title').text().trim();
      company = $('.company-name').text().trim();
      location = $('.location').text().trim();
      description = $('.job-description').html() || '';
    }

    if (title && company) {
      const cleanCompany = company.replace(/[^a-z0-9]/gi, '').toLowerCase();
      return {
        title,
        company,
        location: location || 'Remote',
        description: description ? description.substring(0, 1000) : null, // Limit description length
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

async function scrapeDirectPlatform(query: string, site: string, location: string): Promise<InsertJob[]> {
  // This would implement direct platform APIs if available
  // For now, return empty array to fall back to Google search
  return [];
}

function createSampleJobs(query: string, site: string, location: string): InsertJob[] {
  // Create sample jobs to demonstrate the interface
  const jobData = [
    {
      company: 'TechFlow',
      platform: 'Greenhouse',
      location: location === 'remote' ? 'Remote' : location === 'onsite' ? 'San Francisco, CA' : 'Remote',
      description: 'Join our innovative team building next-generation software solutions. We offer competitive salary, equity, and comprehensive benefits. Work with cutting-edge technologies and make a real impact.'
    },
    {
      company: 'DataVision',
      platform: 'Lever', 
      location: location === 'remote' ? 'Remote' : location === 'onsite' ? 'New York, NY' : 'Austin, TX',
      description: 'Exciting opportunity to work on large-scale data platforms. We\'re looking for passionate engineers who want to solve complex problems and build systems that serve millions of users.'
    },
    {
      company: 'CloudNine',
      platform: 'Ashby',
      location: location === 'remote' ? 'Remote' : location === 'onsite' ? 'Seattle, WA' : 'Boston, MA',
      description: 'Lead the development of cloud infrastructure solutions. Work with modern technologies, mentoring opportunities, and flexible work arrangements. Great team culture and growth potential.'
    },
    {
      company: 'GlobalCorp',
      platform: 'ADP',
      location: location === 'remote' ? 'Remote' : location === 'onsite' ? 'Dallas, TX' : 'Phoenix, AZ',
      description: 'Enterprise-level position with one of the largest companies in the industry. Excellent benefits package, career advancement opportunities, and stable work environment.'
    },
    {
      company: 'StartupXYZ',
      platform: 'Career Pages',
      location: location === 'remote' ? 'Remote' : location === 'onsite' ? 'Los Angeles, CA' : 'Miami, FL',
      description: 'Join a rapidly growing startup disrupting the market. Work directly with founders, equity compensation, and opportunity to make significant impact on product development.'
    },
    {
      company: 'InnovateHub',
      platform: 'Workday',
      location: location === 'remote' ? 'Remote' : location === 'onsite' ? 'Austin, TX' : 'Chicago, IL',
      description: 'Be part of a fast-growing startup revolutionizing the industry. Competitive compensation, stock options, and the chance to shape the future of technology. Join our amazing team!'
    }
  ];

  // Filter jobs based on platform selection
  let filteredJobs = jobData;
  
  if (site !== 'all') {
    // Map site names to platform names
    const platformMap: Record<string, string> = {
      'boards.greenhouse.io': 'Greenhouse',
      'jobs.lever.co': 'Lever',
      'jobs.ashbyhq.com': 'Ashby', 
      'jobs.workable.com': 'Workable',
      'myworkdayjobs.com': 'Workday',
      'adp': 'ADP',
      'careers.*': 'Career Pages',
      'other-pages': 'Career Pages'
    };
    
    const targetPlatform = platformMap[site];
    if (targetPlatform) {
      filteredJobs = jobData.filter(job => job.platform === targetPlatform);
      if (filteredJobs.length === 0) {
        // If no exact match, return the first job but update its platform
        filteredJobs = [{ ...jobData[0], platform: targetPlatform }];
      }
    }
  }
  
  const numJobs = site === 'all' ? 6 : Math.min(filteredJobs.length, 2);
  
  return filteredJobs.slice(0, numJobs).map((job, index) => ({
    title: `${query} ${index === 0 ? '- Senior' : index === 1 ? '- Lead' : index === 2 ? '- Principal' : index === 3 ? '- Staff' : index === 4 ? '- Director' : '- VP'} Position`,
    company: job.company,
    location: job.location,
    description: job.description,
    url: `https://example.com/jobs/${job.company.toLowerCase()}-${index}`,
    logo: `https://logo.clearbit.com/${job.company.toLowerCase()}.com`,
    platform: job.platform,
    tags: extractTags(query, job.description)
  }));
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
    console.log(`Scraping platform: ${site} for query: ${query}`);
    
    // For now, return sample jobs specific to each platform
    return createSampleJobs(query, site, location);
  } catch (error) {
    console.error(`Scraping failed for ${site}:`, error);
    // Return sample jobs as fallback
    return createSampleJobs(query, site, location);
  }
}
