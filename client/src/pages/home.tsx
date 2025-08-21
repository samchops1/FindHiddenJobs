import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { JobSearchForm } from "@/components/job-search-form";
import { JobCardEnhanced } from "@/components/job-card-enhanced";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { searchJobs, type SearchResponse } from "@/lib/job-api";
import { AlertCircle, Clock, Search, Building, Globe, ChevronLeft, ChevronRight, Briefcase, User, LogOut } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/auth-modal";
import { FeatureRequest } from "@/components/feature-request";
import { useAuth } from "@/hooks/useAuth";
import type { Job, SearchRequest } from "@shared/schema";

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const { user, loading, signOut } = useAuth();

  const {
    data: searchResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["/api/search", searchParams, currentPage],
    queryFn: () => searchParams ? searchJobs({ ...searchParams, page: currentPage }) : Promise.resolve({ jobs: [], pagination: { currentPage: 1, totalPages: 0, totalJobs: 0, jobsPerPage: 25, hasNextPage: false, hasPrevPage: false } }),
    enabled: !!searchParams,
    staleTime: 10 * 60 * 1000, // 10 minutes - matches backend cache
    gcTime: 15 * 60 * 1000, // 15 minutes - keep cached pages longer
  });

  const jobs = searchResponse?.jobs || [];
  const pagination = searchResponse?.pagination;

  const handleSearch = (params: SearchRequest) => {
    setSearchParams(params);
    setCurrentPage(1); // Reset to first page for new search
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <a href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-primary">find</span>
                  <span className="text-2xl font-bold text-primary-600">hidden</span>
                  <span className="text-2xl font-bold text-primary-700">jobs</span>
                </div>
                <span className="text-sm text-muted-foreground font-medium">.com</span>
              </div>
            </a>
            <div className="flex items-center space-x-4">
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
              
              {!loading && (
                user ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="w-4 h-4" />
                      <span className="hidden md:inline">{user.user_metadata?.first_name || user.email}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/dashboard'}
                      className="flex items-center space-x-1"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span className="hidden md:inline">Dashboard</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signOut()}
                      className="flex items-center space-x-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden md:inline">Sign out</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthModalOpen(true);
                      }}
                    >
                      Sign in
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAuthMode('register');
                        setAuthModalOpen(true);
                      }}
                    >
                      Sign up
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 to-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Find Jobs That Aren't on LinkedIn or Indeed
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Search across multiple job platforms simultaneously with AI-powered matching. Discover hidden opportunities from company career pages, niche job boards, and specialized platforms.
            </p>
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="flex items-center space-x-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span>✨ AI-Powered Matching</span>
              </div>
              <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Real-time Results</span>
              </div>
            </div>
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
                <h3 className="text-2xl font-bold text-foreground" data-testid="results-title">
                  AI-Matched Job Opportunities
                </h3>
                <p className="text-muted-foreground mt-1">
                  {pagination ? `${pagination.totalJobs} personalized results found` : "AI-powered matching for your perfect job"}
                </p>
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
                <JobCardEnhanced key={job.url} job={job} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.currentPage - 1) * pagination.jobsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.jobsPerPage, pagination.totalJobs)} of {pagination.totalJobs} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      const isCurrentPage = pageNum === pagination.currentPage;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={isCurrentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-10 h-10 ${isCurrentPage ? 'bg-primary text-white' : ''}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    {pagination.totalPages > 5 && (
                      <>
                        {pagination.totalPages > 6 && <span className="px-2 text-muted-foreground">...</span>}
                        <Button
                          variant={pagination.currentPage === pagination.totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pagination.totalPages)}
                          className={`w-10 h-10 ${pagination.currentPage === pagination.totalPages ? 'bg-primary text-white' : ''}`}
                        >
                          {pagination.totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="flex items-center space-x-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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
          <div className="grid md:grid-cols-2 gap-12">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">FindHiddenJobs.com</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                The professional way to search for opportunities across all major job platforms. Find your next career move.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">
                Resources
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="/about" className="hover:text-foreground transition-colors">About</a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
                </li>
                <li>
                  <FeatureRequest>
                    <button className="hover:text-foreground transition-colors text-left">
                      Feature Requests
                    </button>
                  </FeatureRequest>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 mt-12">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                &copy; 2024 FindHiddenJobs.com. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  );
}
