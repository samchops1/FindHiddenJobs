import { type Job, type InsertJob, type Search, type InsertSearch } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getJob(id: string): Promise<Job | undefined>;
  getJobsByQuery(query: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  getSearch(id: string): Promise<Search | undefined>;
  getRecentSearches(): Promise<Search[]>;
  createSearch(search: InsertSearch): Promise<Search>;
  clearOldJobs(): Promise<void>;
}

export class MemStorage implements IStorage {
  private jobs: Map<string, Job>;
  private searches: Map<string, Search>;

  constructor() {
    this.jobs = new Map();
    this.searches = new Map();
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
}

export const storage = new MemStorage();
