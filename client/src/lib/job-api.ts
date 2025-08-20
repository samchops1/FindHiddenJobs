import { apiRequest } from "./queryClient";
import type { Job, Search, SearchRequest } from "@shared/schema";

export interface SearchResponse {
  jobs: Job[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalJobs: number;
    jobsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function searchJobs(searchParams: SearchRequest): Promise<SearchResponse> {
  const response = await apiRequest(
    "GET",
    `/api/search?${new URLSearchParams(searchParams as any).toString()}`
  );
  return response.json();
}

export async function getSearchHistory(): Promise<Search[]> {
  const response = await apiRequest("GET", "/api/searches");
  return response.json();
}

export async function cleanupOldJobs(): Promise<void> {
  await apiRequest("DELETE", "/api/jobs/cleanup");
}
