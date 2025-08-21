import { createClient } from '@supabase/supabase-js';
import type { IStorage } from './storage';
import type { Job, InsertJob, Search, InsertSearch } from '@shared/schema';
import { randomUUID } from 'crypto';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Missing Supabase credentials, falling back to in-memory storage');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export class SupabaseStorage implements IStorage {
  constructor() {
    if (supabase) {
      console.log('✅ Supabase storage initialized');
      this.initializeTables();
    } else {
      console.log('⚠️ Supabase not available, using fallback mode');
    }
  }

  private async initializeTables() {
    if (!supabase) return;
    
    try {
      // Create tables if they don't exist
      const { error: jobsError } = await supabase.rpc('create_jobs_table_if_not_exists');
      const { error: searchesError } = await supabase.rpc('create_searches_table_if_not_exists');
      const { error: prefsError } = await supabase.rpc('create_user_preferences_table_if_not_exists');
      const { error: savedJobsError } = await supabase.rpc('create_saved_jobs_table_if_not_exists');
      const { error: applicationsError } = await supabase.rpc('create_job_applications_table_if_not_exists');
      const { error: resumeError } = await supabase.rpc('create_resume_analysis_table_if_not_exists');
      
      console.log('📚 Supabase tables initialized');
    } catch (error) {
      console.error('❌ Error initializing Supabase tables:', error);
    }
  }

  // Job-related methods
  async getJob(id: string): Promise<Job | undefined> {
    if (!supabase) return undefined;
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching job:', error);
      return undefined;
    }
    
    return data;
  }

  async getJobsByQuery(query: string): Promise<Job[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .or(`title.ilike.%${query}%,company.ilike.%${query}%`)
      .order('scraped_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error searching jobs:', error);
      return [];
    }
    
    return data || [];
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    if (!supabase) {
      // Fallback for when Supabase is not available
      const job: Job = { 
        ...insertJob, 
        id: randomUUID(),
        description: insertJob.description || null,
        location: insertJob.location || null,
        logo: insertJob.logo || null,
        tags: Array.isArray(insertJob.tags) ? insertJob.tags as string[] : [],
        postedAt: insertJob.postedAt || null,
        scrapedAt: new Date()
      };
      return job;
    }
    
    const jobData = {
      id: randomUUID(),
      title: insertJob.title,
      company: insertJob.company,
      location: insertJob.location,
      description: insertJob.description,
      url: insertJob.url,
      logo: insertJob.logo,
      platform: insertJob.platform,
      tags: insertJob.tags,
      posted_at: insertJob.postedAt,
      scraped_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating job:', error);
      throw error;
    }
    
    return {
      id: data.id,
      title: data.title,
      company: data.company,
      location: data.location,
      description: data.description,
      url: data.url,
      logo: data.logo,
      platform: data.platform,
      tags: data.tags,
      postedAt: data.posted_at ? new Date(data.posted_at) : null,
      scrapedAt: new Date(data.scraped_at)
    };
  }

  // Search-related methods
  async getSearch(id: string): Promise<Search | undefined> {
    if (!supabase) return undefined;
    
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return undefined;
    
    return {
      id: data.id,
      query: data.query,
      platform: data.platform,
      resultCount: data.result_count,
      searchedAt: new Date(data.searched_at)
    };
  }

  async getRecentSearches(): Promise<Search[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .order('searched_at', { ascending: false })
      .limit(10);
    
    if (error) return [];
    
    return (data || []).map(item => ({
      id: item.id,
      query: item.query,
      platform: item.platform,
      resultCount: item.result_count,
      searchedAt: new Date(item.searched_at)
    }));
  }

  async createSearch(insertSearch: InsertSearch): Promise<Search> {
    if (!supabase) {
      return {
        ...insertSearch,
        id: randomUUID(),
        resultCount: insertSearch.resultCount || null,
        searchedAt: new Date()
      };
    }
    
    const searchData = {
      id: randomUUID(),
      query: insertSearch.query,
      platform: insertSearch.platform,
      result_count: insertSearch.resultCount,
      searched_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('searches')
      .insert(searchData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating search:', error);
      throw error;
    }
    
    return {
      id: data.id,
      query: data.query,
      platform: data.platform,
      resultCount: data.result_count,
      searchedAt: new Date(data.searched_at)
    };
  }

  async clearOldJobs(): Promise<void> {
    if (!supabase) return;
    
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('jobs')
      .delete()
      .lt('scraped_at', cutoffDate);
    
    if (error) {
      console.error('Error clearing old jobs:', error);
    }
  }

  // User preferences
  async saveUserPreferences(preferences: {
    userId: string;
    jobTypes: string[];
    preferredLocation?: string;
    emailNotifications: boolean;
  }): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: preferences.userId,
        job_types: preferences.jobTypes,
        industries: [], // Add industries field from Drizzle schema
        locations: preferences.preferredLocation ? [preferences.preferredLocation] : [],
        experience_level: null,
        desired_salary: null,
        resume_url: null,
        resume_analysis: null,
        email_notifications: preferences.emailNotifications,
        notification_time: '21:00', // Default 9PM EST
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }
  }

  async getUserPreferences(userId: string) {
    if (!supabase) return undefined;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return undefined;

    return {
      userId: data.user_id,
      jobTypes: data.job_types || [],
      industries: data.industries || [],
      locations: data.locations || [],
      experienceLevel: data.experience_level,
      desiredSalary: data.desired_salary,
      resumeUrl: data.resume_url,
      resumeAnalysis: data.resume_analysis,
      preferredLocation: data.locations?.[0], // For backward compatibility
      emailNotifications: data.email_notifications ?? true,
      notificationTime: data.notification_time || '21:00'
    };
  }

  // Saved jobs
  async saveJob(jobData: {
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    location?: string;
    platform?: string;
    jobData?: any;
  }) {
    if (!supabase) {
      return {
        id: randomUUID(),
        ...jobData,
        savedAt: new Date()
      };
    }

    const savedJobData = {
      user_id: jobData.userId,
      job_url: jobData.jobUrl,
      job_title: jobData.jobTitle,
      company: jobData.company,
      location: jobData.location,
      platform: jobData.platform,
      job_data: jobData.jobData,
      applied: false,
      applied_at: null,
      application_status: null,
      notes: null
    };

    const { data, error } = await supabase
      .from('saved_jobs')
      .insert(savedJobData)
      .select()
      .single();

    if (error) {
      console.error('Error saving job:', error);
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      jobUrl: data.job_url,
      jobTitle: data.job_title,
      company: data.company,
      location: data.location,
      platform: data.platform,
      savedAt: new Date(data.saved_at)
    };
  }

  async getUserSavedJobs(userId: string) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) return [];

    return (data || []).map(item => ({
      id: item.id,
      jobUrl: item.job_url,
      jobTitle: item.job_title,
      company: item.company,
      location: item.location,
      platform: item.platform,
      savedAt: new Date(item.saved_at),
      applied: item.applied || false,
      appliedAt: item.applied_at ? new Date(item.applied_at) : undefined,
      applicationStatus: item.application_status,
      notes: item.notes
    }));
  }

  // Job applications
  async trackApplication(applicationData: {
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    notes?: string;
  }) {
    if (!supabase) {
      return {
        id: randomUUID(),
        ...applicationData,
        appliedAt: new Date()
      };
    }

    const appData = {
      id: randomUUID(),
      user_id: applicationData.userId,
      job_url: applicationData.jobUrl,
      job_title: applicationData.jobTitle,
      company: applicationData.company,
      notes: applicationData.notes,
      applied_at: new Date().toISOString(),
      status: 'applied'
    };

    const { data, error } = await supabase
      .from('job_applications')
      .insert(appData)
      .select()
      .single();

    if (error) {
      console.error('Error tracking application:', error);
      throw error;
    }

    // Also update saved job if it exists
    await supabase
      .from('saved_jobs')
      .update({ 
        applied: true, 
        applied_at: new Date().toISOString() 
      })
      .eq('user_id', applicationData.userId)
      .eq('job_url', applicationData.jobUrl);

    return {
      id: data.id,
      userId: data.user_id,
      jobUrl: data.job_url,
      jobTitle: data.job_title,
      company: data.company,
      appliedAt: new Date(data.applied_at),
      notes: data.notes
    };
  }

  async getUserApplications(userId: string) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

    if (error) return [];

    return (data || []).map(item => ({
      id: item.id,
      jobUrl: item.job_url,
      jobTitle: item.job_title,
      company: item.company,
      appliedAt: new Date(item.applied_at),
      status: item.status || 'applied',
      notes: item.notes
    }));
  }

  async getAllApplications() {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .order('applied_at', { ascending: false });

    if (error) return [];

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      jobUrl: item.job_url,
      jobTitle: item.job_title,
      company: item.company,
      appliedAt: new Date(item.applied_at),
      status: item.status || 'applied',
      notes: item.notes
    }));
  }

  // Resume analysis
  async saveResumeAnalysis(data: {
    userId: string;
    fileName: string;
    fileUrl: string;
    analysis: any;
  }) {
    if (!supabase) {
      return {
        id: randomUUID(),
        ...data,
        analyzedAt: new Date()
      };
    }

    const resumeData = {
      user_id: data.userId,
      file_name: data.fileName,
      file_url: data.fileUrl,
      analysis: data.analysis
    };

    const { data: result, error } = await supabase
      .from('resume_analysis')
      .insert(resumeData)
      .select()
      .single();

    if (error) {
      console.error('Error saving resume analysis:', error);
      throw error;
    }

    // Also update user preferences with resume analysis
    await supabase
      .from('user_preferences')
      .update({
        resume_url: data.fileUrl,
        resume_analysis: data.analysis,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', data.userId);

    return {
      id: result.id,
      userId: result.user_id,
      fileName: result.file_name,
      fileUrl: result.file_url,
      analysis: result.analysis,
      analyzedAt: new Date(result.analyzed_at)
    };
  }

  async getUserResumeAnalysis(userId: string) {
    if (!supabase) return undefined;

    const { data, error } = await supabase
      .from('resume_analysis')
      .select('*')
      .eq('user_id', userId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return undefined;

    return {
      id: data.id,
      fileName: data.file_name,
      analysis: data.analysis,
      analyzedAt: new Date(data.analyzed_at)
    };
  }

  // Email logs functionality
  async logEmailSent(userId: string, emailType: string, jobUrls: string[]): Promise<void> {
    if (!supabase) return;

    const emailLogData = {
      user_id: userId,
      email_type: emailType,
      jobs_sent: jobUrls,
      opened: false,
      clicked_jobs: []
    };

    const { error } = await supabase
      .from('email_logs')
      .insert(emailLogData);

    if (error) {
      console.error('Error logging email:', error);
    }
  }

  async getEmailLogs(userId: string): Promise<{emailType: string, sentAt: Date}[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('email_logs')
      .select('email_type, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching email logs:', error);
      return [];
    }

    return data?.map(log => ({
      emailType: log.email_type,
      sentAt: new Date(log.created_at)
    })) || [];
  }

  // Search history functionality
  async logSearchHistory(userId: string, query: string, filters: any, resultsCount: number): Promise<void> {
    if (!supabase) return;

    const searchData = {
      user_id: userId,
      query: query,
      filters: filters,
      results_count: resultsCount,
      clicked_jobs: []
    };

    const { error } = await supabase
      .from('search_history')
      .insert(searchData);

    if (error) {
      console.error('Error logging search:', error);
    }
  }

  // Get users for email notifications
  async getUsersForNotifications(): Promise<Array<{
    id: string;
    email: string;
    preferences: {
      jobTypes: string[];
      emailNotifications: boolean;
      notificationTime: string;
    };
  }>> {
    if (!supabase) return [];

    // This would require joining with Supabase auth.users table
    // For now, return empty array - this would need proper RLS policies
    const { data, error } = await supabase
      .from('user_preferences')
      .select(`
        user_id,
        job_types,
        email_notifications,
        notification_time
      `)
      .eq('email_notifications', true);

    if (error) return [];

    // Note: In production, you'd need to join with auth.users to get emails
    // This requires proper RLS policies and service role access
    return [];
  }
  
  async getAllUsersWithPreferences(): Promise<Array<{
    userId: string;
    email: string;
    jobTypes: string[];
    preferredLocation?: string;
    emailNotifications: boolean;
    hasResume: boolean;
  }>> {
    if (!supabase) return [];

    try {
      // Get users with preferences and email notifications enabled
      const { data: users, error: usersError } = await supabase
        .from('user_preferences')
        .select(`
          user_id,
          job_types,
          preferred_location,
          email_notifications
        `)
        .eq('email_notifications', true);

      if (usersError) {
        console.error('Error fetching users with preferences:', usersError);
        return [];
      }

      // Check which users have resumes
      const { data: resumes, error: resumesError } = await supabase
        .from('resume_analyses')
        .select('user_id')
        .not('analysis', 'is', null);

      if (resumesError) {
        console.error('Error fetching users with resumes:', resumesError);
      }

      const usersWithResumes = new Set(resumes?.map(r => r.user_id) || []);

      // Filter users who have job types OR resume
      const eligibleUsers = (users || [])
        .filter(user => 
          user.email_notifications && 
          ((user.job_types && user.job_types.length > 0) || usersWithResumes.has(user.user_id))
        )
        .map(user => ({
          userId: user.user_id,
          email: `user-${user.user_id}@example.com`, // TODO: Get real email from users table
          jobTypes: user.job_types || [],
          preferredLocation: user.preferred_location,
          emailNotifications: user.email_notifications,
          hasResume: usersWithResumes.has(user.user_id)
        }));

      console.log(`📊 Supabase: Found ${eligibleUsers.length} eligible users for recommendations`);
      return eligibleUsers;
    } catch (error) {
      console.error('Error in getAllUsersWithPreferences:', error);
      return [];
    }
  }
}

// Create the storage instance
export const supabaseStorage = new SupabaseStorage();