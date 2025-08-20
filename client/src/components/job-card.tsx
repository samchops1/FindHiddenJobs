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

  const formatDescription = (description: string) => {
    // Remove HTML tags and limit length
    const plainText = description.replace(/<[^>]*>/g, '');
    return plainText.length > 300 ? plainText.substring(0, 300) + '...' : plainText;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Recently posted';
    
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
      <CardContent className="p-8">
        <div className="flex items-start space-x-6">
          {/* Company Logo */}
          <div className="relative">
            <img 
              src={job.logo || 'https://via.placeholder.com/80x80?text=?'}
              alt={`${job.company} logo`}
              className="w-20 h-20 rounded-2xl object-cover border border-border flex-shrink-0 bg-muted group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/80x80?text=?';
              }}
              data-testid={`img-company-logo-${job.id}`}
            />
          </div>
          
          {/* Job Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-200" data-testid={`text-job-title-${job.id}`}>
                  {job.title}
                </h3>
                <p className="text-primary font-semibold text-lg mb-3" data-testid={`text-company-${job.id}`}>
                  {job.company}
                </p>
                <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="font-medium" data-testid={`text-location-${job.id}`}>{job.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{formatDate(job.scrapedAt)}</span>
                  </div>
                </div>
              </div>
              
              {/* Bookmark Button */}
              <Button variant="ghost" size="sm" className="ml-4 p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200">
                <Bookmark className="w-5 h-5" />
              </Button>
            </div>

            {/* Job Description Preview */}
            {job.description && (
              <div className="text-muted-foreground mb-6 leading-relaxed bg-muted/30 p-4 rounded-xl" data-testid={`text-description-${job.id}`}>
                <p className="text-sm">{formatDescription(job.description)}</p>
              </div>
            )}

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
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleApply}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                  data-testid={`button-apply-${job.id}`}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apply Now
                </Button>
                <Button variant="outline" size="sm" className="px-4 py-2 rounded-xl border-border hover:bg-muted">
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
