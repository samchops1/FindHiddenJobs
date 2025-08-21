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

export interface StreamingSearchEvent {
  type: 'start' | 'progress' | 'jobs' | 'platform-complete' | 'complete' | 'error';
  data: any;
}

export function searchJobsStreaming(
  searchParams: SearchRequest,
  onEvent: (event: StreamingSearchEvent) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `/api/search-stream?${new URLSearchParams(searchParams as any).toString()}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent({ type: event.type as any || 'message', data });
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.addEventListener('start', (event) => {
      const data = JSON.parse(event.data);
      onEvent({ type: 'start', data });
    });

    eventSource.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data);
      onEvent({ type: 'progress', data });
    });

    eventSource.addEventListener('jobs', (event) => {
      const data = JSON.parse(event.data);
      onEvent({ type: 'jobs', data });
    });

    eventSource.addEventListener('platform-complete', (event) => {
      const data = JSON.parse(event.data);
      onEvent({ type: 'platform-complete', data });
    });

    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data);
      onEvent({ type: 'complete', data });
      eventSource.close();
      resolve();
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const data = event.data ? JSON.parse(event.data) : { error: 'Unknown error' };
        onEvent({ type: 'error', data });
        eventSource.close();
        reject(new Error(data.error || 'Search failed'));
      } catch (parseError) {
        onEvent({ type: 'error', data: { error: 'Connection error' } });
        eventSource.close();
        reject(new Error('Connection error'));
      }
    });

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
      reject(new Error('Connection error'));
    };
  });
}
