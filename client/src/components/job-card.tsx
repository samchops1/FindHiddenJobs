import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, MapPin, Calendar, Users, Bookmark, Share } from "lucide-react";
import type { Job } from "@shared/schema";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const handleApply = () => {
    window.open(job.url, '_blank', 'noopener,noreferrer');
  };


  const formatDate = (postedAt: Date | null, scrapedAt: Date | null) => {
    // Use posted date if available, otherwise fall back to scraped date
    const dateValue = postedAt || scrapedAt;
    if (!dateValue) return 'Recently posted';
    
    // Convert to Date object if it's a string
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Recently posted';
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just posted';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    // Show exact date for older posts
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    // Show actual date for week+ old posts
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  return (
    <Card className="bg-card hover:shadow-lg border border-border transition-all duration-300 hover:transform hover:scale-[1.01] group">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-start space-y-4 lg:space-y-0 lg:space-x-6">
          {/* Company Logo */}
          <div className="relative mx-auto sm:mx-0">
            <img 
              src={job.logo || 'https://via.placeholder.com/80x80?text=?'}
              alt={`${job.company} logo`}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl object-cover border border-border flex-shrink-0 bg-muted group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/80x80?text=?';
              }}
              data-testid={`img-company-logo-${job.id}`}
            />
          </div>
          
          {/* Job Details */}
          <div className="flex-1 w-full text-center lg:text-left">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 w-full">
                <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-200 break-words" data-testid={`text-job-title-${job.id}`}>
                  {job.title}
                </h3>
                <p className="text-primary font-semibold text-base lg:text-lg mb-3 break-words" data-testid={`text-company-${job.id}`}>
                  {job.company}
                </p>
                <div className="flex flex-col lg:flex-row items-center space-y-2 lg:space-y-0 lg:space-x-6 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="font-medium break-words" data-testid={`text-location-${job.id}`}>{job.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="font-medium whitespace-nowrap">{formatDate(job.postedAt, job.scrapedAt)}</span>
                  </div>
                </div>
              </div>
              
              {/* Bookmark Button */}
              <Button variant="ghost" size="sm" className="lg:ml-4 mt-2 lg:mt-0 p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200">
                <Bookmark className="w-5 h-5" />
              </Button>
            </div>


            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {job.tags.map((tag, index) => (
                  <Badge 
                    key={index}
                    variant="secondary"
                    className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
                    data-testid={`badge-tag-${index}-${job.id}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col lg:flex-row items-center justify-between pt-4 border-t border-border space-y-3 lg:space-y-0">
              <div className="flex flex-col lg:flex-row items-center space-y-2 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
                <Button
                  onClick={handleApply}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-105 w-full lg:w-auto"
                  data-testid={`button-apply-${job.id}`}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apply Now
                </Button>
                <Button variant="outline" size="sm" className="px-4 py-2 rounded-xl border-border hover:bg-muted w-full lg:w-auto">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground" data-testid={`text-platform-${job.id}`}>
                <span className="inline-flex items-center bg-muted px-3 py-2 rounded-lg">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span className="font-medium">Via {job.platform}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
