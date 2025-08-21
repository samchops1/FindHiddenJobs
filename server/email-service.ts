import { storage } from './storage';
import { resendEmailService } from './resend-service';

// Job recommendation interface
interface JobRecommendation {
  title: string;
  company: string;
  location: string;
  url: string;
  platform: string;
  tags?: string[];
  logo?: string;
}

export class EmailService {
  constructor() {
    console.log('📧 Email service initialized with Resend integration');
  }

  async sendDailyRecommendations(
    userId: string,
    userEmail: string,
    recommendations: JobRecommendation[]
  ): Promise<void> {
    try {
      const user = await storage.getUserPreferences(userId);
      const firstName = userEmail.split('@')[0]; // Fallback name
      
      await resendEmailService.sendDailyRecommendations(
        userEmail,
        firstName,
        recommendations,
        user?.jobTypes || []
      );
      
      // Log the email in storage for tracking
      await this.logEmailSent(userId, 'daily_recommendations', recommendations.map(r => r.url));
      
      console.log(`✅ Daily recommendations sent to ${userEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send daily recommendations to ${userEmail}:`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(userEmail: string, firstName: string): Promise<void> {
    try {
      await resendEmailService.sendWelcomeEmail(userEmail, firstName);
      console.log(`✅ Welcome email sent to ${userEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${userEmail}:`, error);
      throw error;
    }
  }


  private async logEmailSent(
    userId: string, 
    emailType: string, 
    jobUrls: string[]
  ): Promise<void> {
    try {
      await storage.logEmailSent(userId, emailType, jobUrls);
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }
}

export const emailService = new EmailService();