import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { JobSearchForm } from "@/components/job-search-form";
import { JobCard } from "@/components/job-card";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { searchJobs } from "@/lib/job-api";
import { AlertCircle, Clock, Search, Building, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Job, SearchRequest } from "@shared/schema";

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchRequest | null>(null);

  const {
    data: jobs = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["/api/search", searchParams],
    queryFn: () => searchParams ? searchJobs(searchParams) : Promise.resolve([]),
    enabled: !!searchParams,
  });

  const handleSearch = (params: SearchRequest) => {
    setSearchParams(params);
  };

  const handleRetry = () => {
    if (searchParams) {
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-600 to-primary-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2" data-testid="main-title">
                DirectHire
              </h1>
              <p className="text-primary-100 text-lg mb-4">
                Find your next opportunity across all major job platforms
              </p>
              <div className="flex items-center justify-center space-x-6 text-primary-100 text-sm">
                <div className="flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  <span>Real-time scraping</span>
                </div>
                <div className="flex items-center">
                  <Building className="w-4 h-4 mr-2" />
                  <span>8+ ATS platforms</span>
                </div>
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  <span>Remote-first</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <JobSearchForm onSearch={handleSearch} />
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Results Header */}
          {(searchParams || isLoading) && (
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900" data-testid="results-title">
                Job Opportunities
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Updated moments ago</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && <LoadingSkeleton />}

          {/* Error State */}
          {error && (
            <Alert className="bg-red-50 border-red-200" data-testid="error-alert">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium mb-1">Search failed</h3>
                    <p className="mb-3">
                      {error instanceof Error ? error.message : "An unexpected error occurred"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleRetry}
                  className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
                  data-testid="button-retry"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Retry Search
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Job Results */}
          {jobs.length > 0 && (
            <div className="space-y-6" data-testid="job-results">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {searchParams && !isLoading && !error && jobs.length === 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center" data-testid="empty-state">
              <div className="max-w-md mx-auto">
                <Search className="w-16 h-16 mx-auto mb-6 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or exploring different platforms.
                </p>
                <button 
                  onClick={() => setSearchParams(null)}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200"
                  data-testid="button-new-search"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Try Different Search
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">DirectHire</h3>
              <p className="text-gray-600 mb-4 max-w-md">
                The smart way to search for jobs across all major ATS platforms. 
                Get real-time results from Greenhouse, Lever, Ashby, and more.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                Platforms
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Greenhouse</li>
                <li>Lever</li>
                <li>Ashby</li>
                <li>Workday</li>
                <li>Workable</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                Resources
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>API Documentation</li>
                <li>Help Center</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-600">
                &copy; 2024 DirectHire. All rights reserved.
              </p>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <span className="text-sm text-gray-500">Built with</span>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>Express.js</span>
                  <span>•</span>
                  <span>Cheerio</span>
                  <span>•</span>
                  <span>Node.js</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
