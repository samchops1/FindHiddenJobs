import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

interface ResumeUploadProps {
  onAnalysisComplete?: (analysis: any) => void;
}

export function ResumeUpload({ onAnalysisComplete }: ResumeUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load existing resume analysis on mount
  useEffect(() => {
    if (user && !analysisResult) {
      loadExistingResume();
    }
  }, [user]);

  const loadExistingResume = async () => {
    if (!user) return;
    
    setIsLoadingExisting(true);
    try {
      const response = await fetch('/api/user/resume/analysis', {
        headers: {
          'x-user-id': user.id,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.hasResume) {
          setAnalysisResult(data.analysis);
          // Create a mock file object to show in the UI
          const mockFile = new File([''], data.fileName, { type: 'application/pdf' });
          setUploadedFile(mockFile);
          
          if (onAnalysisComplete) {
            onAnalysisComplete(data.analysis);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load existing resume:', error);
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['.pdf', '.doc', '.docx'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF, DOC, or DOCX file.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 5MB.',
          variant: 'destructive',
        });
        return;
      }

      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile || !user) {
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', uploadedFile);

      const response = await fetch('/api/user/resume/upload', {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload resume');
      }

      const result = await response.json();
      setAnalysisResult(result.analysis);
      
      toast({
        title: 'Resume uploaded successfully!',
        description: 'Your resume has been analyzed and preferences updated.',
      });

      if (onAnalysisComplete) {
        onAnalysisComplete(result.analysis);
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Resume Analysis</h3>
          <p className="text-muted-foreground">
            Sign in to upload your resume and get personalized job recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingExisting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Resume Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your resume...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Resume Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedFile ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={triggerFileInput}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Upload your resume</h3>
              <p className="text-muted-foreground mb-4">
                We'll analyze your skills and experience to provide better job recommendations.
              </p>
              <Button variant="outline">Choose File</Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="text-sm text-muted-foreground">
              Supported formats: PDF, DOC, DOCX (max 5MB)
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <File className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!analysisResult ? (
              <Button 
                onClick={handleUpload} 
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Analyzing Resume...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Analyze
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Analysis Complete</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Skills Identified:</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.skills?.slice(0, 8).map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Experience Level:</h4>
                    <span className="text-sm text-muted-foreground">
                      {analysisResult.experienceLevel || 'Not determined'}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Suggested Job Titles:</h4>
                    <div className="text-sm text-muted-foreground">
                      {analysisResult.suggestedJobTitles?.slice(0, 3).join(', ') || 'None suggested'}
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={handleRemoveFile}
                  className="w-full"
                >
                  Upload Different Resume
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}