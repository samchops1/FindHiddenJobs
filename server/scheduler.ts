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

  start(): void {
    if (this.isRunning) {
      console.log('📅 Job recommendation scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting job recommendation scheduler...');

    // Check for users to send recommendations every hour
    this.intervalId = setInterval(() => {
      this.checkAndSendRecommendations();
    }, 60 * 60 * 1000); // Run every hour

    // Also run immediately for testing
    setTimeout(() => {
      this.checkAndSendRecommendations();
    }, 5000); // Run after 5 seconds
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
      const currentMinute = now.getMinutes();
      
      // Check if it's 9 PM EST (21:00) - allow 10-minute window
      const isRecommendationTime = currentHour === 21 && currentMinute < 10;
      
      console.log(`⏰ Checking recommendation time: ${now.toLocaleTimeString()} (Hour: ${currentHour})`);
      
      if (!isRecommendationTime && process.env.NODE_ENV !== 'development') {
        console.log('⏳ Not recommendation time yet, skipping...');
        return;
      }

      console.log('🎯 Starting daily recommendation process...');
      
      // For demonstration purposes, we'll create some mock users with preferences
      // In a real implementation, you'd query actual users from the database
      const mockUsers = [
        {
          id: 'user1',
          email: 'test@example.com',
          preferences: {
            jobTypes: ['Software Engineer', 'Full Stack Developer'],
            emailNotifications: true
          }
        }
      ];

      let sentCount = 0;
      
      for (const user of mockUsers) {
        if (!user.preferences.emailNotifications) {
          console.log(`📧 Skipping user ${user.email} - email notifications disabled`);
          continue;
        }

        try {
          // Generate personalized recommendations
          const recommendations = await generateJobRecommendations(
            user.id,
            user.preferences.jobTypes,
            10
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
          
          // Small delay to avoid overwhelming email service
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Failed to send recommendations to ${user.email}:`, error);
        }
      }

      console.log(`✅ Daily recommendation process completed. Sent ${sentCount} emails.`);
    } catch (error) {
      console.error('❌ Error in recommendation scheduler:', error);
    }
  }

  // Method to manually trigger recommendations (for testing)
  async sendTestRecommendations(): Promise<void> {
    console.log('🧪 Manually triggering test recommendations...');
    await this.checkAndSendRecommendations();
  }
}

export const recommendationScheduler = new JobRecommendationScheduler();