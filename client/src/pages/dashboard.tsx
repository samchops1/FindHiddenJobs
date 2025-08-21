import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResumeUpload } from '@/components/resume-upload';
import { FeatureRequest } from '@/components/feature-request';
import { 
  Briefcase, 
  BookmarkCheck, 
  FileCheck, 
  TrendingUp, 
  Calendar,
  ExternalLink,
  MapPin,
  Building,
  Sparkles,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

interface SavedJob {
  id: string;
  jobUrl: string;
  jobTitle: string;
  company: string;
  location?: string;
  platform?: string;
  savedAt: Date;
  applied: boolean;
}

interface Application {
  id: string;
  jobUrl: string;
  jobTitle: string;
  company: string;
  appliedAt: Date;
  status: string;
  notes?: string;
}

interface RecommendedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  platform: string;
  tags: string[];
  logo?: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  
  // Fetch saved jobs
  const { data: savedJobsData } = useQuery({
    queryKey: ['/api/user/saved-jobs', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/user/saved-jobs', {
        headers: {
          'x-user-id': user!.id
        }
      });
      if (!response.ok) throw new Error('Failed to fetch saved jobs');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch applications
  const { data: applicationsData } = useQuery({
    queryKey: ['/api/user/applications', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/user/applications', {
        headers: {
          'x-user-id': user!.id
        }
      });
      if (!response.ok) throw new Error('Failed to fetch applications');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch recommended jobs
  const { data: recommendationsData, isLoading: recommendationsLoading, error: recommendationsError } = useQuery({
    queryKey: ['/api/user/recommendations', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/user/recommendations', {
        headers: {
          'x-user-id': user!.id
        }
      });
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json();
    },
    enabled: !!user,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your personalized dashboard with saved jobs and application tracking.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const savedJobs = savedJobsData?.savedJobs || [];
  const applications = applicationsData?.applications || [];
  const recommendedJobs = recommendationsData?.recommendations || [];
  const recommendationsMessage = recommendationsData?.message;
  const isFirstTimeUser = recommendationsData?.isFirstTime || false;

  // Debug logging
  console.log('Dashboard state:', {
    recommendationsLoading,
    hasRecommendationsData: !!recommendationsData,
    recommendedJobsCount: recommendedJobs.length,
    isFirstTimeUser,
    recommendationsError
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {user.user_metadata?.first_name || user.email?.split('@')[0]}
              </p>
            </div>
            <div className="flex space-x-3">
              <FeatureRequest>
                <Button variant="outline">
                  Feature Request
                </Button>
              </FeatureRequest>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Back to Search
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saved Jobs</p>
                  <p className="text-2xl font-bold text-foreground">{savedJobs.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BookmarkCheck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Applications</p>
                  <p className="text-2xl font-bold text-foreground">{applications.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Application Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {savedJobs.length > 0 ? Math.round((applications.length / savedJobs.length) * 100) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recommendations</p>
                  <p className="text-2xl font-bold text-foreground">
                    {recommendationsLoading ? '...' : recommendedJobs.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="recommendations" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="saved-jobs">Saved Jobs</TabsTrigger>
                <TabsTrigger value="applications">Applications</TabsTrigger>
              </TabsList>

              <TabsContent value="recommendations" className="space-y-4">
                {recommendationsLoading && !recommendationsData ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                      <h3 className="text-xl font-semibold mb-2">
                        Checking Your Profile...
                      </h3>
                      <p className="text-muted-foreground">
                        Analyzing your profile to generate personalized recommendations...
                      </p>
                    </CardContent>
                  </Card>
                ) : recommendationsError ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">Unable to Load Recommendations</h3>
                      <p className="text-muted-foreground mb-4">
                        We're having trouble loading your recommendations right now. Please try refreshing the page.
                      </p>
                      <Button onClick={() => window.location.reload()}>
                        Refresh Page
                      </Button>
                    </CardContent>
                  </Card>
                ) : recommendedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">
                        {isFirstTimeUser ? 'Complete Your Profile' : 'Recommendations Coming Soon'}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {isFirstTimeUser 
                          ? (recommendationsMessage || 'Complete your profile to get personalized recommendations! Upload a resume, set job preferences, or start applying to jobs.')
                          : (recommendationsMessage || 'Your personalized recommendations will be populated daily at 9 PM EST. Check back after 9 PM for your curated job matches!')
                        }
                      </p>
                      <Button onClick={() => window.location.href = '/'}>
                        {isFirstTimeUser ? 'Start Job Search' : 'Browse Jobs'}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-semibold text-foreground">AI-Powered Recommendations</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        These jobs are personally selected for you based on your preferences, resume, and application history. 
                        New recommendations are generated daily at 9PM EST.
                      </p>
                    </div>
                    {recommendedJobs.map((job: RecommendedJob, index: number) => (
                      <Card key={`${job.url}-${index}`} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-start space-x-4">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg text-foreground mb-1">
                                    {job.title}
                                  </h3>
                                  <div className="flex items-center space-x-1 text-primary font-medium mb-2">
                                    <Building className="w-4 h-4" />
                                    <span>{job.company}</span>
                                  </div>
                                  {job.location && (
                                    <div className="flex items-center space-x-1 text-muted-foreground text-sm mb-3">
                                      <MapPin className="w-4 h-4" />
                                      <span>{job.location}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                    <Badge variant="secondary">{job.platform}</Badge>
                                    <Badge variant="outline" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      AI Recommended
                                    </Badge>
                                  </div>
                                  {job.tags && job.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                      {job.tags.slice(0, 3).map((tag, tagIndex) => (
                                        <Badge key={tagIndex} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                      {job.tags.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{job.tags.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(job.url, '_blank')}
                              className="flex items-center space-x-1"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>View</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>

              <TabsContent value="saved-jobs" className="space-y-4">
                {savedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <BookmarkCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">No Saved Jobs</h3>
                      <p className="text-muted-foreground mb-4">
                        Start saving jobs to keep track of opportunities you're interested in.
                      </p>
                      <Button onClick={() => window.location.href = '/'}>
                        Find Jobs
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  savedJobs.map((job: SavedJob) => (
                    <Card key={job.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start space-x-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-foreground mb-1">
                                  {job.jobTitle}
                                </h3>
                                <div className="flex items-center space-x-1 text-primary font-medium mb-2">
                                  <Building className="w-4 h-4" />
                                  <span>{job.company}</span>
                                </div>
                                {job.location && (
                                  <div className="flex items-center space-x-1 text-muted-foreground text-sm mb-3">
                                    <MapPin className="w-4 h-4" />
                                    <span>{job.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Saved {format(new Date(job.savedAt), 'MMM dd, yyyy')}</span>
                                  </div>
                                  {job.platform && (
                                    <Badge variant="secondary">{job.platform}</Badge>
                                  )}
                                  {job.applied && (
                                    <Badge variant="default" className="bg-green-100 text-green-700">
                                      Applied
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(job.jobUrl, '_blank')}
                            className="flex items-center space-x-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>View</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="applications" className="space-y-4">
                {applications.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <FileCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        When you apply to jobs, we'll track them here so you can monitor your progress.
                      </p>
                      <Button onClick={() => window.location.href = '/'}>
                        Start Applying
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  applications.map((app: Application) => (
                    <Card key={app.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-foreground mb-1">
                              {app.jobTitle}
                            </h3>
                            <div className="flex items-center space-x-1 text-primary font-medium mb-2">
                              <Building className="w-4 h-4" />
                              <span>{app.company}</span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>Applied {format(new Date(app.appliedAt), 'MMM dd, yyyy')}</span>
                              </div>
                              <Badge 
                                variant={app.status === 'applied' ? 'default' : 'secondary'}
                                className={
                                  app.status === 'applied' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : ''
                                }
                              >
                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                              </Badge>
                            </div>
                            {app.notes && (
                              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                                {app.notes}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(app.jobUrl, '_blank')}
                            className="flex items-center space-x-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>View</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Resume Upload */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ResumeUpload />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}