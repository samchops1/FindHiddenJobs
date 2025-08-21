import { type Job, type InsertJob, type Search, type InsertSearch, type UserPreferences, type SavedJob, type JobApplication, type ResumeAnalysisResult } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getJob(id: string): Promise<Job | undefined>;
  getJobsByQuery(query: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  getSearch(id: string): Promise<Search | undefined>;
  getRecentSearches(): Promise<Search[]>;
  createSearch(search: InsertSearch): Promise<Search>;
  clearOldJobs(): Promise<void>;
  
  // User preferences
  saveUserPreferences(preferences: {
    userId: string;
    jobTypes: string[];
    preferredLocation?: string;
    emailNotifications: boolean;
  }): Promise<void>;
  
  getUserPreferences(userId: string): Promise<{
    userId: string;
    jobTypes: string[];
    preferredLocation?: string;
    emailNotifications: boolean;
  } | undefined>;
  
  // Saved jobs
  saveJob(jobData: {
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    location?: string;
    platform?: string;
    jobData?: any;
  }): Promise<{
    id: string;
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    location?: string;
    platform?: string;
    savedAt: Date;
  }>;
  
  getUserSavedJobs(userId: string): Promise<Array<{
    id: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    location?: string;
    platform?: string;
    savedAt: Date;
    applied: boolean;
  }>>;
  
  // Job applications
  trackApplication(applicationData: {
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    notes?: string;
  }): Promise<{
    id: string;
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    appliedAt: Date;
    notes?: string;
  }>;
  
  getUserApplications(userId: string): Promise<Array<{
    id: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    appliedAt: Date;
    status: string;
    notes?: string;
  }>>;

  getAllApplications?(): Promise<Array<{
    id: string;
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    appliedAt: Date;
    status: string;
    notes?: string;
  }>>;
  
  // Resume analysis
  saveResumeAnalysis(data: {
    userId: string;
    fileName: string;
    fileUrl: string;
    analysis: any;
  }): Promise<{
    id: string;
    userId: string;
    fileName: string;
    fileUrl: string;
    analysis: any;
    analyzedAt: Date;
  }>;
  
  getUserResumeAnalysis(userId: string): Promise<{
    id: string;
    fileName: string;
    fileUrl: string;
    analysis: any;
    analyzedAt: Date;
  } | undefined>;
  
  // Email logs
  logEmailSent(userId: string, emailType: string, jobUrls: string[]): Promise<void>;
  getEmailLogs(userId: string): Promise<{emailType: string, sentAt: Date}[]>;
  
  // Search history
  logSearchHistory(userId: string, query: string, filters: any, resultsCount: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private jobs: Map<string, Job>;
  private searches: Map<string, Search>;
  private userPreferences: Map<string, any>;
  private savedJobs: Map<string, any>;
  private applications: Map<string, any>;
  private resumeAnalyses: Map<string, any>;

  constructor() {
    this.jobs = new Map();
    this.searches = new Map();
    this.userPreferences = new Map();
    this.savedJobs = new Map();
    this.applications = new Map();
    this.resumeAnalyses = new Map();
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobsByQuery(query: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(
      (job) => job.title.toLowerCase().includes(query.toLowerCase()) ||
               job.company.toLowerCase().includes(query.toLowerCase())
    );
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const job: Job = { 
      ...insertJob, 
      id,
      description: insertJob.description || null,
      location: insertJob.location || null,
      logo: insertJob.logo || null,
      tags: Array.isArray(insertJob.tags) ? insertJob.tags as string[] : [],
      postedAt: insertJob.postedAt || null,
      scrapedAt: new Date()
    };
    this.jobs.set(id, job);
    return job;
  }

  async getSearch(id: string): Promise<Search | undefined> {
    return this.searches.get(id);
  }

  async getRecentSearches(): Promise<Search[]> {
    const searchesArray = Array.from(this.searches.values());
    return searchesArray
      .sort((a, b) => (b.searchedAt?.getTime() || 0) - (a.searchedAt?.getTime() || 0))
      .slice(0, 10);
  }

  async createSearch(insertSearch: InsertSearch): Promise<Search> {
    const id = randomUUID();
    const search: Search = {
      ...insertSearch,
      id,
      resultCount: insertSearch.resultCount || null,
      searchedAt: new Date()
    };
    this.searches.set(id, search);
    return search;
  }

  async clearOldJobs(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const entriesToDelete: string[] = [];
    const jobEntries = Array.from(this.jobs.entries());
    for (const [id, job] of jobEntries) {
      if (job.scrapedAt && job.scrapedAt < cutoffTime) {
        entriesToDelete.push(id);
      }
    }
    entriesToDelete.forEach(id => this.jobs.delete(id));
  }

  // User preferences implementation
  async saveUserPreferences(preferences: {
    userId: string;
    jobTypes: string[];
    preferredLocation?: string;
    emailNotifications: boolean;
  }): Promise<void> {
    this.userPreferences.set(preferences.userId, {
      ...preferences,
      updatedAt: new Date()
    });
  }

  async getUserPreferences(userId: string): Promise<{
    userId: string;
    jobTypes: string[];
    preferredLocation?: string;
    emailNotifications: boolean;
  } | undefined> {
    return this.userPreferences.get(userId);
  }

  // Saved jobs implementation
  async saveJob(jobData: {
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    location?: string;
    platform?: string;
    jobData?: any;
  }): Promise<{
    id: string;
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    location?: string;
    platform?: string;
    savedAt: Date;
  }> {
    const id = randomUUID();
    const savedJob = {
      id,
      ...jobData,
      savedAt: new Date(),
      applied: false
    };
    this.savedJobs.set(id, savedJob);
    return savedJob;
  }

  async getUserSavedJobs(userId: string): Promise<Array<{
    id: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    location?: string;
    platform?: string;
    savedAt: Date;
    applied: boolean;
  }>> {
    return Array.from(this.savedJobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
  }

  // Job applications implementation
  async trackApplication(applicationData: {
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    notes?: string;
  }): Promise<{
    id: string;
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    appliedAt: Date;
    notes?: string;
  }> {
    const id = randomUUID();
    const application = {
      id,
      ...applicationData,
      appliedAt: new Date(),
      status: 'applied'
    };
    this.applications.set(id, application);
    
    // Mark corresponding saved job as applied if it exists
    Array.from(this.savedJobs.entries()).forEach(([jobId, savedJob]) => {
      if (savedJob.userId === applicationData.userId && savedJob.jobUrl === applicationData.jobUrl) {
        savedJob.applied = true;
        savedJob.appliedAt = application.appliedAt;
        this.savedJobs.set(jobId, savedJob);
      }
    });
    
    return application;
  }

  async getUserApplications(userId: string): Promise<Array<{
    id: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    appliedAt: Date;
    status: string;
    notes?: string;
  }>> {
    return Array.from(this.applications.values())
      .filter(app => app.userId === userId)
      .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
  }

  // Get all applications (for scheduler use)
  async getAllApplications(): Promise<Array<{
    id: string;
    userId: string;
    jobUrl: string;
    jobTitle: string;
    company: string;
    appliedAt: Date;
    status: string;
    notes?: string;
  }>> {
    return Array.from(this.applications.values())
      .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
  }

  // Resume analysis implementation
  async saveResumeAnalysis(data: {
    userId: string;
    fileName: string;
    fileUrl: string;
    analysis: any;
  }): Promise<{
    id: string;
    userId: string;
    fileName: string;
    fileUrl: string;
    analysis: any;
    analyzedAt: Date;
  }> {
    const id = randomUUID();
    const resumeAnalysis = {
      id,
      ...data,
      analyzedAt: new Date()
    };
    
    // Store with user ID as key so we can easily find the latest analysis per user
    this.resumeAnalyses.set(`${data.userId}_${id}`, resumeAnalysis);
    
    return resumeAnalysis;
  }

  async getUserResumeAnalysis(userId: string): Promise<{
    id: string;
    fileName: string;
    fileUrl: string;
    analysis: any;
    analyzedAt: Date;
  } | undefined> {
    // Find the latest resume analysis for the user
    const userAnalyses = Array.from(this.resumeAnalyses.entries())
      .filter(([key, analysis]) => key.startsWith(`${userId}_`))
      .map(([key, analysis]) => analysis)
      .sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime());
    
    const latest = userAnalyses[0];
    if (!latest) return undefined;
    
    return {
      id: latest.id,
      fileName: latest.fileName,
      fileUrl: latest.fileUrl,
      analysis: latest.analysis,
      analyzedAt: latest.analyzedAt
    };
  }
  
  // Email logs implementation
  async logEmailSent(userId: string, emailType: string, jobUrls: string[]): Promise<void> {
    console.log(`📊 Email logged: ${emailType} sent to user ${userId} with ${jobUrls.length} jobs`);
  }
  
  async getEmailLogs(userId: string): Promise<{emailType: string, sentAt: Date}[]> {
    // In memory storage doesn't persist email logs, so return empty for first-time user behavior
    return [];
  }
  
  // Search history implementation
  async logSearchHistory(userId: string, query: string, filters: any, resultsCount: number): Promise<void> {
    console.log(`🔍 Search logged: ${query} by user ${userId} with ${resultsCount} results`);
  }
  
  async getAllUsersWithPreferences(): Promise<Array<{
    userId: string;
    email: string;
    jobTypes: string[];
    preferredLocation?: string;
    emailNotifications: boolean;
    hasResume: boolean;
  }>> {
    // Get users who have preferences and want email notifications
    const eligibleUsers = [];
    
    for (const [userId, preferences] of Array.from(this.userPreferences.entries())) {
      if (preferences.emailNotifications && 
          (preferences.jobTypes?.length > 0 || 
           Array.from(this.resumeAnalyses.keys()).some(key => key.startsWith(`${userId}_`)))) {
        eligibleUsers.push({
          userId,
          email: `user-${userId}@example.com`, // In real app, get from user table
          jobTypes: preferences.jobTypes || [],
          preferredLocation: preferences.preferredLocation,
          emailNotifications: preferences.emailNotifications,
          hasResume: Array.from(this.resumeAnalyses.keys()).some(key => key.startsWith(`${userId}_`))
        });
      }
    }
    
    console.log(`📊 Found ${eligibleUsers.length} eligible users for recommendations`);
    return eligibleUsers;
  }
}

import { supabaseStorage } from './supabase-storage';

// Use Supabase storage if available, otherwise fall back to in-memory storage
export const storage = process.env.SUPABASE_URL ? supabaseStorage : new MemStorage();
