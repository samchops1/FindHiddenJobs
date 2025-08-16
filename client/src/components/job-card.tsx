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

  const getTimeAgo = (date: Date | null) => {
    if (!date) return 'Recently';
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <Card className="bg-white hover:shadow-xl border border-gray-100 transition-all duration-300 hover:transform hover:scale-[1.02]">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Company Logo */}
          <img 
            src={job.logo || 'https://via.placeholder.com/64x64?text=?'}
            alt={`${job.company} logo`}
            className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/64x64?text=?';
            }}
            data-testid={`img-company-logo-${job.id}`}
          />
          
          {/* Job Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-1" data-testid={`text-job-title-${job.id}`}>
                  {job.title}
                </h3>
                <p className="text-primary-600 font-medium mb-2" data-testid={`text-company-${job.id}`}>
                  {job.company}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span data-testid={`text-location-${job.id}`}>{job.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{getTimeAgo(job.scrapedAt)}</span>
                  </div>
                </div>
              </div>
              
              {/* Bookmark Button */}
              <Button variant="ghost" size="sm" className="ml-4 p-2 text-gray-400 hover:text-primary-600">
                <Bookmark className="w-4 h-4" />
              </Button>
            </div>

            {/* Job Description Preview */}
            {job.description && (
              <div className="text-gray-700 mb-4 leading-relaxed" data-testid={`text-description-${job.id}`}>
                <p className="mb-2">{formatDescription(job.description)}</p>
              </div>
            )}

            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {job.tags.map((tag, index) => (
                  <Badge 
                    key={index}
                    variant="secondary"
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-xs"
                    data-testid={`badge-tag-${index}-${job.id}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleApply}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                  data-testid={`button-apply-${job.id}`}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apply Now
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
              
              <div className="text-sm text-gray-500" data-testid={`text-platform-${job.id}`}>
                <span className="inline-flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Via {job.platform}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
