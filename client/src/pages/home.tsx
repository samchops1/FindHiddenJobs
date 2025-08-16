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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="main-title">
                  DirectHire
                </h1>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-muted-foreground text-sm">
              <div className="flex items-center space-x-1">
                <Building className="w-4 h-4" />
                <span>Multi-platform</span>
              </div>
              <div className="flex items-center space-x-1">
                <Globe className="w-4 h-4" />
                <span>All locations</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 to-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Find your next opportunity
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Search across all major job platforms simultaneously. Get real-time results from the world's top companies.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10">
        {/* Search Form */}
        <div className="bg-card rounded-3xl shadow-lg border border-border p-8 mb-12">
          <JobSearchForm onSearch={handleSearch} />
        </div>

        {/* Results Section */}
        <div className="space-y-8">
          {/* Results Header */}
          {(searchParams || isLoading) && (
            <div className="flex items-center justify-between bg-card rounded-2xl p-6 border border-border">
              <div>
                <h2 className="text-2xl font-bold text-foreground" data-testid="results-title">
                  Job Opportunities
                </h2>
                <p className="text-muted-foreground mt-1">Find your perfect match</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
                <Clock className="w-4 h-4" />
                <span>Live results</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && <LoadingSkeleton />}

          {/* Error State */}
          {error && (
            <div className="bg-card rounded-2xl border border-destructive/20 p-6" data-testid="error-alert">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Search failed</h3>
                  <p className="text-muted-foreground mb-4">
                    {error instanceof Error ? error.message : "An unexpected error occurred"}
                  </p>
                  <button 
                    onClick={handleRetry}
                    className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-md"
                    data-testid="button-retry"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Retry Search
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Job Results */}
          {jobs.length > 0 && (
            <div className="space-y-4" data-testid="job-results">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {searchParams && !isLoading && !error && jobs.length === 0 && (
            <div className="bg-card rounded-2xl border border-border p-16 text-center" data-testid="empty-state">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">No jobs found</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Try adjusting your search criteria or exploring different platforms. We're constantly indexing new opportunities.
                </p>
                <button 
                  onClick={() => setSearchParams(null)}
                  className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                  data-testid="button-new-search"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Try Different Search
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">DirectHire</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                The professional way to search for opportunities across all major job platforms. Find your next career move.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">
                Supported Platforms
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="hover:text-foreground transition-colors cursor-pointer">Greenhouse</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Lever</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Ashby</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Workday</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Workable</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">
                Resources
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="hover:text-foreground transition-colors cursor-pointer">About</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Help Center</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 mt-12">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-muted-foreground">
                &copy; 2024 DirectHire. All rights reserved.
              </p>
              <div className="flex items-center space-x-3 mt-4 md:mt-0">
                <span className="text-xs text-muted-foreground">Powered by modern web scraping</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
