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
    
    return {
      userId,
      jobTypes: preferences?.jobTypes || [],
      preferredLocation: preferences?.preferredLocation,
      skills: resumeAnalysis?.analysis?.skills || [],
      experienceLevel: resumeAnalysis?.analysis?.experienceLevel || 'mid-level',
      appliedJobTitles,
      savedJobTitles,
      recentSearches: [] // Could be populated from search history
    };
  }

  /**
   * Get candidate jobs based on user preferences
   */
  private async getCandidateJobs(userProfile: UserProfile): Promise<any[]> {
    const allJobs: any[] = [];
    const seenUrls = new Set<string>();
    
    // Determine job titles to search - prioritize based on:
    // 1. Applied job titles (what they've shown interest in)
    // 2. Resume suggested titles
    // 3. User preferences
    // 4. Default fallback
    let jobTypesToSearch: string[] = [];
    
    // Get unique job titles from applications (top priority)
    if (userProfile.appliedJobTitles.length > 0) {
      const uniqueAppliedTitles = Array.from(new Set(userProfile.appliedJobTitles))
        .slice(0, 2)
        .map(title => title.toLowerCase());
      jobTypesToSearch.push(...uniqueAppliedTitles);
      console.log(`📝 Using applied job titles: ${uniqueAppliedTitles.join(', ')}`);
    }
    
    // Add resume suggested titles
    const resumeAnalysis = await storage.getUserResumeAnalysis(userProfile.userId);
    if (resumeAnalysis && resumeAnalysis.analysis?.suggestedJobTitles?.length > 0) {
      const resumeTitles = resumeAnalysis.analysis.suggestedJobTitles
        .slice(0, 3)
        .filter((title: string) => !jobTypesToSearch.includes(title.toLowerCase()));
      jobTypesToSearch.push(...resumeTitles);
      console.log(`📄 Adding resume suggested titles: ${resumeTitles.join(', ')}`);
    }
    
    // Add user preferences if we still need more
    if (userProfile.jobTypes.length > 0 && jobTypesToSearch.length < 5) {
      const prefTitles = userProfile.jobTypes
        .slice(0, 2)
        .filter(title => !jobTypesToSearch.includes(title.toLowerCase()));
      jobTypesToSearch.push(...prefTitles);
    }
    
    // Ensure we have at least some titles to search
    if (jobTypesToSearch.length === 0) {
      jobTypesToSearch = ['software engineer', 'developer'];
    }
    
    // Limit to 5 job titles maximum for scalability
    jobTypesToSearch = jobTypesToSearch.slice(0, 5);
    
    console.log(`🔍 Searching for ${jobTypesToSearch.length} job titles: ${jobTypesToSearch.join(', ')}`);
    
    // Search for jobs - limit to 5 results per title for each platform
    for (const jobType of jobTypesToSearch) {
      try {
        const jobs = await scrapeJobsFromAllPlatforms(
          jobType,
          'all', // Search all platforms
          userProfile.preferredLocation?.toLowerCase() || 'all',
          undefined, // No time filter
          true, // Email recommendation mode - use rate limiting
          5 // Limit to 5 results per platform
        );
        
        // Deduplicate and add jobs
        for (const job of jobs) {
          if (!seenUrls.has(job.url)) {
            seenUrls.add(job.url);
            allJobs.push(job);
          }
        }
        
        console.log(`✅ Found ${jobs.length} unique jobs for "${jobType}"`);
        
        // Add delay between searches to respect rate limits
        if (jobTypesToSearch.indexOf(jobType) < jobTypesToSearch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Failed to search for ${jobType}:`, error);
      }
    }
    
    // Skip skill searches for now to speed up recommendations
    /*
    for (const skill of userProfile.skills.slice(0, 2)) { // Limit to top 2 skills
      if (skill.length > 3) { // Only search for substantial skills
        try {
          const jobs = await scrapeJobsFromAllPlatforms(
            skill,
            'all',
            userProfile.preferredLocation?.toLowerCase() || 'all',
            undefined, // No time filter
            true // Email recommendation mode - use 1s rate limiting
          );
          
          allJobs.push(...jobs.slice(0, 10)); // Take top 10 from skill searches
        } catch (error) {
          console.error(`Failed to search for skill ${skill}:`, error);
        }
      }
    }
    */
    
    return allJobs;
  }

  /**
   * Score jobs based on user profile match
   */
  private scoreJobs(jobs: any[], userProfile: UserProfile): JobRecommendation[] {
    return jobs.map(job => {
      let score = 50; // Base score
      const reasons: string[] = [];
      
      // Job type matching
      const jobTitle = job.title.toLowerCase();
      for (const preferredType of userProfile.jobTypes) {
        if (jobTitle.includes(preferredType.toLowerCase())) {
          score += 20;
          reasons.push(`Matches your interest in ${preferredType}`);
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
      
      // Location preference
      if (userProfile.preferredLocation) {
        const prefLocation = userProfile.preferredLocation.toLowerCase();
        const jobLocation = (job.location || '').toLowerCase();
        
        if (jobLocation.includes(prefLocation)) {
          score += 10;
          reasons.push(`Located in your preferred area`);
        } else if (prefLocation.includes('remote') && jobLocation.includes('remote')) {
          score += 15;
          reasons.push(`Remote work as preferred`);
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
  private async getCachedRecommendations(userId: string): Promise<JobRecommendation[] | null> {
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