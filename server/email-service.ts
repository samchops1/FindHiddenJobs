import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

// Initialize Supabase client for email functions
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase) {
  console.warn('⚠️ Supabase not configured. Emails will be logged to console only.');
}

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
    if (supabase) {
      console.log('📧 Email service initialized with Supabase');
    } else {
      console.log('📧 Email service in console mode (Supabase not configured)');
    }
  }

  async sendDailyRecommendations(
    userId: string,
    userEmail: string,
    recommendations: JobRecommendation[]
  ): Promise<void> {
    try {
      const user = await storage.getUserPreferences(userId);
      const firstName = userEmail.split('@')[0]; // Fallback name
      
      const emailContent = this.generateRecommendationEmail(
        firstName,
        recommendations,
        user?.jobTypes || []
      );

      const subject = `🎯 Your Daily Job Recommendations - ${new Date().toLocaleDateString()}`;

      await this.sendEmail(userEmail, subject, emailContent);
      
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
      const emailContent = this.generateWelcomeEmail(firstName);
      const subject = '🎉 Welcome to FindHiddenJobs.com!';

      await this.sendEmail(userEmail, subject, emailContent);
      console.log(`✅ Welcome email sent to ${userEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${userEmail}:`, error);
      throw error;
    }
  }

  /**
   * Send email using Supabase Edge Functions
   */
  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<void> {
    if (!supabase) {
      console.log('📧 Email would be sent via Supabase:');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML length: ${htmlContent.length}`);
      return;
    }
    
    try {
      // Call Supabase Edge Function for sending emails
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          subject,
          html: htmlContent,
          from: process.env.EMAIL_FROM || 'noreply@findhiddenjobs.com'
        }
      });
      
      if (error) {
        console.error('❌ Supabase email error:', error);
        throw error;
      }
      
      console.log(`✅ Email sent via Supabase to ${to}`);
    } catch (error) {
      console.error('❌ Failed to send email via Supabase:', error);
      // Fallback to console mode if Supabase fails
      console.log('📧 Fallback: Email would be sent:');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
    }
  }

  private generateRecommendationEmail(
    firstName: string,
    recommendations: JobRecommendation[],
    jobTypes: string[]
  ): string {
    const jobTypesText = jobTypes.length > 0 ? jobTypes.join(', ') : 'your preferences';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Your Daily Job Recommendations</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .job-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 16px 0; }
        .job-title { font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0; }
        .company { color: #3b82f6; font-weight: 500; margin: 0 0 8px 0; }
        .location { color: #6b7280; font-size: 14px; margin: 0 0 12px 0; }
        .tags { margin: 12px 0; }
        .tag { background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 6px; }
        .apply-button { background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; margin-top: 12px; }
        .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; color: #6b7280; }
        .unsubscribe { color: #9ca3af; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🎯 Your Daily Job Recommendations</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Hi ${firstName}! Here are ${recommendations.length} AI-powered job matches based on ${jobTypesText}</p>
          <p style="margin: 8px 0 0 0; opacity: 0.8; font-size: 14px;">✨ Powered by AI to match your skills, experience, and preferences</p>
        </div>
        
        <div class="content">
          ${recommendations.map(job => `
            <div class="job-card">
              <h3 class="job-title">${job.title}</h3>
              <p class="company">${job.company}</p>
              <p class="location">📍 ${job.location}</p>
              ${job.tags && job.tags.length > 0 ? `
                <div class="tags">
                  ${job.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
              ` : ''}
              <a href="${job.url}" class="apply-button" target="_blank" rel="noopener">Apply Now</a>
              <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0 0;">Via ${job.platform}</p>
            </div>
          `).join('')}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0;">Want to see more opportunities?</p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">Our AI continuously learns from your preferences to improve recommendations</p>
            <a href="https://findhiddenjobs.com/dashboard" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Your AI-Powered Dashboard</a>
          </div>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 8px 0;">You're receiving this because you signed up for daily job recommendations.</p>
          <p style="margin: 0;">
            <a href="#" class="unsubscribe">Unsubscribe</a> | 
            <a href="https://findhiddenjobs.com/dashboard" style="color: #6b7280;">Update Preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generateWelcomeEmail(firstName: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to FindHiddenJobs.com</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 40px; border-radius: 12px 12px 0 0; text-align: center; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .cta-button { background: #3b82f6; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; margin: 16px 0; }
        .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to FindHiddenJobs.com!</h1>
          <p style="margin: 16px 0 0 0; opacity: 0.9; font-size: 18px;">Hi ${firstName}!</p>
        </div>
        
        <div class="content">
          <p>Thanks for joining FindHiddenJobs.com! You're now part of a community that discovers opportunities across all major job platforms.</p>
          
          <h3>What's next?</h3>
          <ul style="padding-left: 20px;">
            <li>✨ <strong>AI-powered job matching</strong> - Get personalized recommendations based on your skills and experience</li>
            <li>🔍 <strong>Search across multiple platforms</strong> - Find jobs that aren't on LinkedIn or Indeed</li>
            <li>💾 <strong>Save interesting opportunities</strong> - Keep track of jobs you want to apply to</li>
            <li>📊 <strong>Track your applications</strong> - Monitor your job search progress with AI insights</li>
            <li>📧 <strong>Get daily AI recommendations</strong> - Receive smart job suggestions at 9 PM EST</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://findhiddenjobs.com" class="cta-button">Start Job Searching</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Pro tip: Upload your resume to unlock advanced AI matching based on your specific skills and experience!</p>
        </div>
        
        <div class="footer">
          <p style="margin: 0;">Happy job hunting! 🚀</p>
        </div>
      </div>
    </body>
    </html>
    `;
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