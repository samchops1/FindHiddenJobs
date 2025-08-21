import { storage } from './storage';
import { emailService } from './email-service';
import { recommendationEngine } from './recommendation-algorithm';

// Generate job recommendations using the recommendation engine
async function generateJobRecommendations(userId: string, jobTypes: string[], limit: number = 10) {
  try {
    // Use the AI-powered recommendation engine
    const recommendations = await recommendationEngine.generateRecommendations(userId, limit);
    
    // Convert to the format expected by email service
    return recommendations.map(rec => ({
      title: rec.title,
      company: rec.company,
      location: rec.location,
      url: rec.url,
      platform: rec.platform,
      tags: rec.tags,
      logo: rec.logo
    }));
  } catch (error) {
    console.error('❌ Recommendation engine failed:', error);
    return [];
  }
}

export class JobRecommendationScheduler {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastRunDate: string | null = null;
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;
  private userProcessingDelay: number = 2000; // Dynamic delay between users

  start(): void {
    if (this.isRunning) {
      console.log('📅 Job recommendation scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting job recommendation scheduler...');

    // Check every 15 minutes during 9PM EST hour
    this.intervalId = setInterval(() => {
      this.checkAndSendRecommendations();
    }, 15 * 60 * 1000); // Check every 15 minutes

    // Initial check after 10 seconds
    setTimeout(() => {
      this.checkAndSendRecommendations();
    }, 10000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Job recommendation scheduler stopped');
  }

  private async checkAndSendRecommendations(): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDate = now.toDateString();
      
      // Convert to EST (UTC-5 or UTC-4 depending on DST)
      const estOffset = now.getTimezoneOffset() + (5 * 60); // EST is UTC-5
      const estTime = new Date(now.getTime() - (estOffset * 60 * 1000));
      const estHour = estTime.getHours();
      
      // Check if it's 9 PM EST and we haven't run today
      const isRecommendationTime = estHour === 21;
      const alreadyRanToday = this.lastRunDate === currentDate;
      
      if (!isRecommendationTime) {
        return; // Not 9PM EST, skip silently
      }
      
      if (alreadyRanToday && this.retryCount === 0) {
        return; // Already ran successfully today
      }
      
      console.log(`🎯 Starting daily recommendation process at 9PM EST...`);
      
      // Get real users who want email notifications and have preferences or resumes
      const users = await this.getEligibleUsers();
      
      if (users.length === 0) {
        console.log('📧 No eligible users found for recommendations');
        this.lastRunDate = currentDate;
        this.retryCount = 0;
        return;
      }

      let sentCount = 0;
      let errorCount = 0;
      
      for (const user of users) {
        try {
          // Generate personalized AI recommendations using the algorithm
          // This uses the user's applied jobs, saved jobs, resume, and preferences
          const recommendations = await recommendationEngine.generateRecommendations(
            user.id,
            10 // limit to 10 recommendations
          );

          if (recommendations.length === 0) {
            console.log(`📧 No recommendations for user ${user.email}, skipping...`);
            continue;
          }

          // Send email
          await emailService.sendDailyRecommendations(
            user.id,
            user.email,
            recommendations
          );

          sentCount++;
          console.log(`✅ Sent recommendations to ${user.email}`);
          
          // Dynamic delay between users to respect API rate limits
          if (sentCount < users.length) {
            console.log(`⏱️ Waiting ${this.userProcessingDelay}ms before processing next user...`);
            await new Promise(resolve => setTimeout(resolve, this.userProcessingDelay));
          }
        } catch (error) {
          console.error(`❌ Failed to send recommendations to ${user.email}:`, error);
          errorCount++;
        }
      }

      if (errorCount > 0 && sentCount === 0 && this.retryCount < this.MAX_RETRIES) {
        // If all failed and we haven't hit max retries, try again in 30 minutes
        this.retryCount++;
        console.log(`⚠️ All recommendations failed. Retry ${this.retryCount}/${this.MAX_RETRIES} in 30 minutes...`);
        setTimeout(() => {
          this.checkAndSendRecommendations();
        }, 30 * 60 * 1000);
      } else {
        // Mark as completed for today
        this.lastRunDate = currentDate;
        this.retryCount = 0;
        console.log(`✅ Daily recommendation process completed. Sent ${sentCount} emails, ${errorCount} errors.`);
      }
    } catch (error) {
      console.error('❌ Error in recommendation scheduler:', error);
      
      // Retry logic for system errors
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        console.log(`⚠️ System error. Retry ${this.retryCount}/${this.MAX_RETRIES} in 30 minutes...`);
        setTimeout(() => {
          this.checkAndSendRecommendations();
        }, 30 * 60 * 1000);
      }
    }
  }

  // Method to manually trigger recommendations (for testing)
  async sendTestRecommendations(): Promise<void> {
    console.log('🧪 Manually triggering test recommendations...');
    this.lastRunDate = null; // Reset to allow manual testing
    this.retryCount = 0;
    await this.checkAndSendRecommendations();
  }
  
  /**
   * Get users who are eligible for job recommendations
   * - Have email notifications enabled
   * - Have job preferences OR uploaded resume OR have applied to jobs
   */
  private async getEligibleUsers(): Promise<Array<{id: string, email: string, jobTypes: string[]}>> {
    try {
      const users = await storage.getAllUsersWithPreferences?.() || [];
      
      // Also check for users who have applied to jobs (even without preferences)
      const usersWithApplications = new Set<string>();
      try {
        // Get users who have job applications
        const applications = await storage.getUserApplications?.('*') || []; // Get all applications
        applications.forEach(app => usersWithApplications.add(app.userId));
      } catch (error) {
        console.log('Could not fetch user applications for recommendations');
      }
      
      const eligibleUsers = users
        .filter(user => 
          user.emailNotifications && (
            user.jobTypes?.length > 0 || 
            user.hasResume || 
            usersWithApplications.has(user.userId)
          )
        )
        .map(user => ({
          id: user.userId,
          email: user.email,
          jobTypes: user.jobTypes || []
        }));
      
      console.log(`📊 Found ${eligibleUsers.length} eligible users for AI recommendations`);
      
      // Calculate rate limiting: Google allows 100 requests/minute
      // With 39 platforms * 5 pages = 195 requests per user
      // So we can only process ~1 user every 2 minutes safely
      if (eligibleUsers.length > 1) {
        const totalRequests = eligibleUsers.length * 39 * 5; // Worst case
        const safeInterval = Math.ceil(totalRequests / 90) * 1000; // Leave 10 req/min buffer
        console.log(`⏱️ Scalability: ${eligibleUsers.length} users = ${totalRequests} max requests. Will use ${safeInterval}ms between users.`);
        this.userProcessingDelay = safeInterval;
      } else {
        this.userProcessingDelay = 2000; // 2 second default
      }
      
      return eligibleUsers;
    } catch (error) {
      console.error('Error getting eligible users:', error);
      return [];
    }
  }
}

export const recommendationScheduler = new JobRecommendationScheduler();