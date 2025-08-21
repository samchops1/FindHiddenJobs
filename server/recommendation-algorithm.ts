import { storage } from './storage';
import { scrapeJobsFromAllPlatforms } from './routes';

export interface UserProfile {
  userId: string;
  jobTypes: string[];
  preferredLocation?: string;
  skills: string[];
  experienceLevel: string;
  appliedJobTitles: string[];
  savedJobTitles: string[];
  recentSearches: string[];
  industries: string[];
  desiredSalary?: { min?: number; max?: number; currency?: string };
  resumeSuggestedTitles: string[];
  workPreference: string;
  allPreferredLocations: string[];
}

export interface JobRecommendation {
  title: string;
  company: string;
  location: string;
  url: string;
  platform: string;
  tags: string[];
  logo?: string;
  score: number; // Relevance score 0-100
  reasons: string[]; // Why this job was recommended
}

// Cache for recommendations - store for 24 hours
const recommendationCache = new Map<string, { recommendations: JobRecommendation[], timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class JobRecommendationEngine {
  /**
   * Generate personalized job recommendations for a user
   */
  async generateRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<JobRecommendation[]> {
    try {
      console.log(`🎯 Generating recommendations for user ${userId}`);
      
      // Check if we have cached recommendations from the last 24 hours
      const cachedRecommendations = await this.getCachedRecommendations(userId);
      if (cachedRecommendations && cachedRecommendations.length > 0) {
        console.log(`📦 Using cached recommendations for user ${userId}`);
        return cachedRecommendations.slice(0, limit);
      }
      
      // Get user profile
      const userProfile = await this.buildUserProfile(userId);
      console.log(`👤 User profile: ${JSON.stringify(userProfile, null, 2)}`);
      
      // Get candidate jobs based on preferences
      const candidateJobs = await this.getCandidateJobs(userProfile);
      console.log(`🔍 Found ${candidateJobs.length} candidate jobs`);
      
      // Score and rank jobs
      const scoredJobs = this.scoreJobs(candidateJobs, userProfile);
      console.log(`📊 Scored ${scoredJobs.length} jobs`);
      
      // Filter out already applied/saved jobs and sort by score
      const filteredJobs = this.filterAndDeduplicate(scoredJobs, userProfile);
      
      // Return top recommendations
      const recommendations = filteredJobs
        .sort((a, b) => b.score - a.score)
        .slice(0, 50); // Cache more than needed
        
      // Cache the recommendations for 24 hours
      await this.cacheRecommendations(userId, recommendations);
        
      console.log(`✅ Generated ${recommendations.length} recommendations`);
      return recommendations.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Build comprehensive user profile from preferences, applications, and resume
   */
  private async buildUserProfile(userId: string): Promise<UserProfile> {
    // Get user preferences
    const preferences = await storage.getUserPreferences(userId);
    
    // Get application history
    const applications = await storage.getUserApplications(userId);
    const appliedJobTitles = applications.map(app => app.jobTitle.toLowerCase());
    
    // Get saved jobs
    const savedJobs = await storage.getUserSavedJobs(userId);
    const savedJobTitles = savedJobs.map(job => job.jobTitle.toLowerCase());
    
    // Get resume analysis if available
    const resumeAnalysis = await storage.getUserResumeAnalysis(userId);
    
    // Get search history for additional context
    const searchHistory = await storage.getSearchHistory?.(userId) || [];
    const recentSearches = searchHistory.slice(0, 5).map(search => search.query.toLowerCase());
    
    return {
      userId,
      jobTypes: preferences?.jobTypes || [],
      preferredLocation: preferences?.locations?.[0] || preferences?.workPreference === 'remote' ? 'remote' : undefined,
      skills: resumeAnalysis?.analysis?.skills || [],
      experienceLevel: preferences?.experienceLevel || resumeAnalysis?.analysis?.experienceLevel || 'mid-level',
      appliedJobTitles,
      savedJobTitles,
      recentSearches,
      // Enhanced fields from onboarding
      industries: preferences?.industries || [],
      desiredSalary: preferences?.desiredSalary,
      resumeSuggestedTitles: resumeAnalysis?.analysis?.suggestedJobTitles || [],
      workPreference: preferences?.workPreference || 'flexible',
      allPreferredLocations: preferences?.locations || []
    };
  }

  /**
   * Get candidate jobs based on comprehensive user preferences
   */
  private async getCandidateJobs(userProfile: UserProfile): Promise<any[]> {
    const allJobs: any[] = [];
    const seenUrls = new Set<string>();
    
    // Build comprehensive job title list from multiple sources
    let jobTypesToSearch: string[] = [];
    
    // Priority 1: Resume-suggested job titles (AI analyzed from resume)
    if (userProfile.resumeSuggestedTitles.length > 0) {
      jobTypesToSearch.push(...userProfile.resumeSuggestedTitles.slice(0, 3));
      console.log(`📄 Using resume-suggested titles: ${userProfile.resumeSuggestedTitles.slice(0, 3).join(', ')}`);
    }
    
    // Priority 2: Recent job applications (showing active interest)
    if (userProfile.appliedJobTitles.length > 0) {
      const uniqueAppliedTitles = Array.from(new Set(userProfile.appliedJobTitles))
        .filter(title => !jobTypesToSearch.some(existing => 
          existing.toLowerCase() === title.toLowerCase()
        ))
        .slice(0, 2);
      jobTypesToSearch.push(...uniqueAppliedTitles);
      console.log(`📝 Adding applied job titles: ${uniqueAppliedTitles.join(', ')}`);
    }
    
    // Priority 3: User preference job types
    if (userProfile.jobTypes.length > 0 && jobTypesToSearch.length < 6) {
      const prefTitles = userProfile.jobTypes
        .filter(title => !jobTypesToSearch.some(existing => 
          existing.toLowerCase().includes(title.toLowerCase())
        ))
        .slice(0, 3);
      jobTypesToSearch.push(...prefTitles);
      console.log(`⚙️ Adding preference job types: ${prefTitles.join(', ')}`);
    }
    
    // Priority 4: Recent searches (showing current interest)
    if (userProfile.recentSearches.length > 0 && jobTypesToSearch.length < 7) {
      const recentTitles = userProfile.recentSearches
        .filter(search => !jobTypesToSearch.some(existing => 
          existing.toLowerCase().includes(search.toLowerCase())
        ))
        .slice(0, 2);
      jobTypesToSearch.push(...recentTitles);
      console.log(`🔍 Adding recent search terms: ${recentTitles.join(', ')}`);
    }
    
    // Fallback if no profile data
    if (jobTypesToSearch.length === 0) {
      jobTypesToSearch = ['software engineer', 'developer'];
      console.log(`🔧 Using fallback titles: ${jobTypesToSearch.join(', ')}`);
    }
    
    // Limit for scalability and rate limiting
    jobTypesToSearch = jobTypesToSearch.slice(0, 8);
    console.log(`🎯 Final search titles (${jobTypesToSearch.length}): ${jobTypesToSearch.join(', ')}`);
    
    // Search for jobs with progressive results allocation
    for (let i = 0; i < jobTypesToSearch.length; i++) {
      const jobTitle = jobTypesToSearch[i];
      
      try {
        // Allocate more results to higher priority sources
        let resultsPerPlatform = 5; // Default
        if (i < 3) resultsPerPlatform = 8; // Higher for first 3 (resume + applications)
        if (i >= 6) resultsPerPlatform = 3; // Lower for later titles
        
        console.log(`🔍 Searching for "${jobTitle}" (${resultsPerPlatform} per platform)...`);
        
        const jobs = await scrapeJobsFromAllPlatforms(
          jobTitle,
          'all', // Search all platforms
          userProfile.preferredLocation?.toLowerCase() || 'all',
          undefined, // No time filter
          true, // Email recommendation mode - use rate limiting
          resultsPerPlatform
        );
        
        // Deduplicate and add jobs with source tracking
        let newJobsCount = 0;
        for (const job of jobs) {
          if (!seenUrls.has(job.url)) {
            seenUrls.add(job.url);
            allJobs.push({
              ...job,
              // Mark the search source for scoring
              searchSource: i < 3 ? 'primary' : 'secondary',
              searchTitle: jobTitle,
              sourceIndex: i
            });
            newJobsCount++;
          }
        }
        
        console.log(`✅ Found ${newJobsCount} new unique jobs for "${jobTitle}"`);
        
        // Progressive delay based on position (more important searches get less delay)
        const delay = i < 3 ? 1500 : 2000;
        if (i < jobTypesToSearch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Stop early if we have enough jobs for processing
        if (allJobs.length >= 200) {
          console.log(`🛑 Stopping search early - reached ${allJobs.length} candidate jobs`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Failed to search for "${jobTitle}":`, error);
      }
    }
    
    console.log(`📊 Total candidate jobs found: ${allJobs.length}`);
    return allJobs;
  }

  /**
   * Score jobs based on user profile match
   */
  private scoreJobs(jobs: any[], userProfile: UserProfile): JobRecommendation[] {
    return jobs.map(job => {
      let score = 50; // Base score
      const reasons: string[] = [];
      
      // Job type matching - check user preferences AND resume suggested titles
      const jobTitle = job.title.toLowerCase();
      
      // Check against user's preferred job types
      for (const preferredType of userProfile.jobTypes) {
        if (jobTitle.includes(preferredType.toLowerCase())) {
          score += 20;
          reasons.push(`Matches your interest in ${preferredType}`);
          break;
        }
      }
      
      // Check against resume-suggested titles (higher weight as they're AI-analyzed)
      for (const suggestedTitle of userProfile.resumeSuggestedTitles) {
        if (jobTitle.includes(suggestedTitle.toLowerCase())) {
          score += 25;
          reasons.push(`Matches resume-suggested role: ${suggestedTitle}`);
          break;
        }
      }
      
      // Check against recent searches (shows active interest)
      for (const searchTerm of userProfile.recentSearches) {
        if (jobTitle.includes(searchTerm.toLowerCase())) {
          score += 15;
          reasons.push(`Matches your recent search for ${searchTerm}`);
          break;
        }
      }
      
      // Skills matching
      const jobDescription = (job.description || '').toLowerCase();
      const jobTags = (job.tags || []).map((tag: string) => tag.toLowerCase());
      
      let skillMatches = 0;
      for (const skill of userProfile.skills) {
        const skillLower = skill.toLowerCase();
        if (jobTitle.includes(skillLower) || 
            jobDescription.includes(skillLower) ||
            jobTags.includes(skillLower)) {
          skillMatches++;
          if (skillMatches <= 3) { // Only add reason for first few skills
            reasons.push(`Uses ${skill} (from your resume)`);
          }
        }
      }
      score += Math.min(skillMatches * 8, 30); // Up to 30 points for skills
      
      // Industry matching
      if (userProfile.industries.length > 0) {
        const jobInfo = `${jobTitle} ${jobDescription} ${job.company.toLowerCase()}`.toLowerCase();
        for (const industry of userProfile.industries) {
          if (jobInfo.includes(industry.toLowerCase())) {
            score += 12;
            reasons.push(`Matches your ${industry} industry interest`);
            break;
          }
        }
      }
      
      // Search source priority (primary AI-optimized titles score higher)
      if (job.searchSource === 'primary') {
        score += 8;
        reasons.push(`High relevance match for "${job.searchTitle}"`);
      } else if (job.searchSource === 'secondary') {
        score += 4;
      }
      
      // Location and work preference matching
      const jobLocation = (job.location || '').toLowerCase();
      const workPref = userProfile.workPreference.toLowerCase();
      const allLocations = userProfile.allPreferredLocations.map(loc => loc.toLowerCase());
      
      // Work preference matching
      if (workPref === 'remote' && jobLocation.includes('remote')) {
        score += 20;
        reasons.push(`Remote work as preferred`);
      } else if (workPref === 'hybrid' && (jobLocation.includes('hybrid') || jobLocation.includes('remote'))) {
        score += 15;
        reasons.push(`Hybrid/remote work option available`);
      } else if (workPref === 'onsite' && !jobLocation.includes('remote')) {
        score += 10;
        reasons.push(`On-site position as preferred`);
      } else if (workPref === 'flexible') {
        score += 5; // Small boost for flexible users
      }
      
      // Specific location matching
      for (const prefLocation of allLocations) {
        if (jobLocation.includes(prefLocation)) {
          score += 12;
          reasons.push(`Located in ${prefLocation}`);
          break;
        }
      }
      
      // Experience level matching (basic heuristic)
      if (userProfile.experienceLevel) {
        const levelLower = userProfile.experienceLevel.toLowerCase();
        if (levelLower === 'senior' && (jobTitle.includes('senior') || jobTitle.includes('lead'))) {
          score += 10;
          reasons.push('Matches your experience level');
        } else if (levelLower === 'mid-level' && !jobTitle.includes('senior') && !jobTitle.includes('junior')) {
          score += 5;
        } else if (levelLower === 'entry-level' && (jobTitle.includes('junior') || jobTitle.includes('entry'))) {
          score += 10;
          reasons.push('Good for your experience level');
        }
      }
      
      // Company diversity - prefer different companies from already applied
      const company = job.company.toLowerCase();
      const hasAppliedToCompany = userProfile.appliedJobTitles.some(title => 
        title.includes(company) // Basic check
      );
      
      if (!hasAppliedToCompany) {
        score += 5;
        reasons.push('New company for you to explore');
      }
      
      // Platform diversity - prefer platforms user hasn't used much
      const platform = job.platform || 'Unknown';
      score += 3; // Small boost for all platforms
      
      // Recent posting boost (if we have posting date)
      if (job.postedAt) {
        const daysSincePosted = Math.floor(
          (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSincePosted <= 1) {
          score += 15;
          reasons.push('Recently posted');
        } else if (daysSincePosted <= 7) {
          score += 8;
          reasons.push('Posted this week');
        }
      }
      
      // Ensure score is within bounds
      score = Math.min(Math.max(score, 0), 100);
      
      // If no specific reasons, add generic one
      if (reasons.length === 0) {
        reasons.push('Matches your search criteria');
      }
      
      return {
        title: job.title,
        company: job.company,
        location: job.location || 'Location not specified',
        url: job.url,
        platform: job.platform || 'Unknown',
        tags: job.tags || [],
        logo: job.logo,
        score,
        reasons
      };
    });
  }

  /**
   * Get cached recommendations for a user
   */
  public async getCachedRecommendations(userId: string): Promise<JobRecommendation[] | null> {
    const cached = recommendationCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`📦 Found valid cached recommendations for user ${userId}`);
      return cached.recommendations;
    }
    return null;
  }

  /**
   * Cache recommendations for a user
   */
  private async cacheRecommendations(userId: string, recommendations: JobRecommendation[]): Promise<void> {
    recommendationCache.set(userId, {
      recommendations,
      timestamp: Date.now()
    });
    console.log(`💾 Cached ${recommendations.length} recommendations for user ${userId}`);
  }

  /**
   * Clear cache for a specific user or all users
   */
  public clearCache(userId?: string): void {
    if (userId) {
      recommendationCache.delete(userId);
      console.log(`🗑️ Cleared cache for user ${userId}`);
    } else {
      recommendationCache.clear();
      console.log(`🗑️ Cleared all recommendation caches`);
    }
  }

  /**
   * Filter out duplicate and already processed jobs
   */
  private filterAndDeduplicate(
    jobs: JobRecommendation[], 
    userProfile: UserProfile
  ): JobRecommendation[] {
    const seen = new Set<string>();
    const filtered: JobRecommendation[] = [];
    
    for (const job of jobs) {
      // Create unique key for deduplication
      const key = `${job.title.toLowerCase()}_${job.company.toLowerCase()}`;
      
      if (seen.has(key)) {
        continue; // Skip duplicate
      }
      
      // Check if user already applied to similar job
      const alreadyApplied = userProfile.appliedJobTitles.some(appliedTitle =>
        this.isSimilarJob(appliedTitle, job.title.toLowerCase())
      );
      
      if (alreadyApplied) {
        continue; // Skip already applied
      }
      
      // Check if user already saved similar job
      const alreadySaved = userProfile.savedJobTitles.some(savedTitle =>
        this.isSimilarJob(savedTitle, job.title.toLowerCase())
      );
      
      if (alreadySaved) {
        // Reduce score for already saved jobs but don't skip completely
        job.score = Math.max(job.score - 20, 10);
      }
      
      seen.add(key);
      filtered.push(job);
    }
    
    return filtered;
  }

  /**
   * Check if two job titles are similar (basic similarity check)
   */
  private isSimilarJob(title1: string, title2: string): boolean {
    // Simple word overlap check
    const words1 = title1.split(/\s+/).filter(w => w.length > 3);
    const words2 = title2.split(/\s+/).filter(w => w.length > 3);
    
    let commonWords = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          commonWords++;
        }
      }
    }
    
    // Consider similar if they share significant words
    return commonWords >= Math.min(words1.length, words2.length) / 2;
  }
}

export const recommendationEngine = new JobRecommendationEngine();