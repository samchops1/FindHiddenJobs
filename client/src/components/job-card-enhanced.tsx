import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, MapPin, Calendar, Bookmark, BookmarkCheck, Share, Check, Copy, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Job } from "@shared/schema";

interface JobCardProps {
  job: Job;
  onSave?: (job: Job) => void;
  onApply?: (job: Job) => void;
  isSaved?: boolean;
}

export function JobCardEnhanced({ job, onSave, onApply, isSaved = false }: JobCardProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applicationNotes, setApplicationNotes] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const handleApply = () => {
    // Open job in new tab
    window.open(job.url, '_blank', 'noopener,noreferrer');
    
    // Show dialog if user is logged in
    if (user) {
      setShowApplyDialog(true);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save jobs",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user!.id
        },
        body: JSON.stringify({
          jobUrl: job.url,
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          platform: job.platform,
          jobData: job,
        }),
      });

      if (!response.ok) throw new Error('Failed to save job');

      setSaved(true);
      toast({
        title: "Job saved!",
        description: "You can view your saved jobs in your dashboard",
      });
      
      if (onSave) onSave(job);
    } catch (error) {
      toast({
        title: "Failed to save job",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleConfirmApplication = async () => {
    setIsApplying(true);
    try {
      const response = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user!.id
        },
        body: JSON.stringify({
          jobUrl: job.url,
          jobTitle: job.title,
          company: job.company,
          notes: applicationNotes,
        }),
      });

      if (!response.ok) throw new Error('Failed to track application');

      toast({
        title: "Application tracked!",
        description: "We've recorded your application. Good luck!",
      });
      
      setShowApplyDialog(false);
      if (onApply) onApply(job);
      
      // Automatically save the job if not already saved
      if (!saved) {
        await handleSave();
      }
    } catch (error) {
      toast({
        title: "Failed to track application",
        description: "Your application wasn't tracked, but you can still apply",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(job.url);
      setCopied(true);
      
      toast({
        title: "Link copied!",
        description: "Job application link has been copied to your clipboard.",
        duration: 3000,
      });
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = job.url;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        setCopied(true);
        toast({
          title: "Link copied!",
          description: "Job application link has been copied to your clipboard.",
          duration: 3000,
        });
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        toast({
          title: "Copy failed",
          description: "Please copy the link manually from the address bar.",
          variant: "destructive",
          duration: 3000,
        });
      }
      
      document.body.removeChild(textArea);
    }
  };

  const formatDate = (postedAt: Date | null, scrapedAt: Date | null) => {
    const dateValue = postedAt || scrapedAt;
    if (!dateValue) return 'Recently posted';
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Recently posted';
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just posted';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  return (
    <>
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
              />
            </div>
            
            {/* Job Details */}
            <div className="flex-1 w-full text-center lg:text-left">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 w-full">
                  <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-200 break-words">
                    {job.title}
                  </h3>
                  <p className="text-primary font-semibold text-base lg:text-lg mb-3 break-words">
                    {job.company}
                  </p>
                  <div className="flex flex-col lg:flex-row items-center space-y-2 lg:space-y-0 lg:space-x-6 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="font-medium break-words">{job.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="font-medium whitespace-nowrap">{formatDate(job.postedAt, job.scrapedAt)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Save Button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="lg:ml-4 mt-2 lg:mt-0 p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
                  onClick={handleSave}
                >
                  {saved ? (
                    <BookmarkCheck className="w-5 h-5 text-primary" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
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
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Apply Now
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="px-4 py-2 rounded-xl border-border hover:bg-muted w-full lg:w-auto transition-all duration-200"
                    onClick={handleShare}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share className="w-4 h-4 mr-2" />
                        Share
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
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

      {/* Application Tracking Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Did you apply to this position?</DialogTitle>
            <DialogDescription>
              Let us know if you applied so we can track your applications and improve your recommendations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                <FileText className="w-4 h-4 inline mr-1" />
                Application notes (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="e.g., Applied through company website, referral from John Doe, etc."
                value={applicationNotes}
                onChange={(e) => setApplicationNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApplyDialog(false)}
            >
              Skip
            </Button>
            <Button
              onClick={handleConfirmApplication}
              disabled={isApplying}
            >
              {isApplying ? "Saving..." : "Yes, I applied"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}