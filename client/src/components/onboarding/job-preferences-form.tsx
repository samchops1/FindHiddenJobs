import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Briefcase, MapPin, DollarSign, GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Common job titles for quick selection
const COMMON_JOB_TITLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Product Manager',
  'UX Designer',
  'UI Designer',
  'Marketing Manager',
  'Sales Representative',
  'Business Analyst',
  'Project Manager',
  'Data Analyst',
  'Customer Success Manager',
  'Quality Assurance Engineer',
  'Mobile Developer',
  'Machine Learning Engineer',
  'Technical Writer',
  'HR Manager'
];

// Industries
const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Media',
  'Non-profit',
  'Government',
  'Real Estate',
  'Transportation',
  'Energy',
  'Entertainment',
  'Food & Beverage',
  'Automotive',
  'Aerospace',
  'Telecommunications'
];

// Experience levels
const EXPERIENCE_LEVELS = [
  { value: 'entry-level', label: 'Entry Level (0-2 years)' },
  { value: 'mid-level', label: 'Mid Level (2-5 years)' },
  { value: 'senior', label: 'Senior (5-10 years)' },
  { value: 'staff', label: 'Staff (10+ years)' },
  { value: 'executive', label: 'Executive/Leadership' }
];

// Work preferences
const WORK_TYPES = [
  { value: 'remote', label: 'Remote Only' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'flexible', label: 'Open to All' }
];

const jobPreferencesSchema = z.object({
  jobTypes: z.array(z.string()).min(1, 'Please select at least one job title'),
  industries: z.array(z.string()).optional(),
  experienceLevel: z.string().min(1, 'Please select your experience level'),
  preferredLocations: z.array(z.string()).optional(),
  workType: z.string().min(1, 'Please select your work preference'),
  desiredSalaryMin: z.number().optional(),
  desiredSalaryMax: z.number().optional(),
  customJobTitle: z.string().optional()
});

type JobPreferencesForm = z.infer<typeof jobPreferencesSchema>;

interface JobPreferencesFormProps {
  onComplete: (preferences: JobPreferencesForm) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function JobPreferencesForm({ onComplete, onSkip, isLoading }: JobPreferencesFormProps) {
  const { user } = useAuth();
  const [customJobTitle, setCustomJobTitle] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<JobPreferencesForm>({
    resolver: zodResolver(jobPreferencesSchema),
    defaultValues: {
      jobTypes: [],
      industries: [],
      preferredLocations: [],
      workType: '',
      experienceLevel: ''
    }
  });

  const watchedJobTypes = watch('jobTypes') || [];
  const watchedIndustries = watch('industries') || [];
  const watchedLocations = watch('preferredLocations') || [];

  // Add job title
  const addJobTitle = (title: string) => {
    if (title && !watchedJobTypes.includes(title)) {
      setValue('jobTypes', [...watchedJobTypes, title]);
    }
  };

  // Remove job title
  const removeJobTitle = (title: string) => {
    setValue('jobTypes', watchedJobTypes.filter(t => t !== title));
  };

  // Add custom job title
  const addCustomJobTitle = () => {
    if (customJobTitle.trim()) {
      addJobTitle(customJobTitle.trim());
      setCustomJobTitle('');
    }
  };

  // Add industry
  const toggleIndustry = (industry: string) => {
    const current = watchedIndustries;
    if (current.includes(industry)) {
      setValue('industries', current.filter(i => i !== industry));
    } else {
      setValue('industries', [...current, industry]);
    }
  };

  // Add location
  const addLocation = (location: string) => {
    if (location && !watchedLocations.includes(location)) {
      setValue('preferredLocations', [...watchedLocations, location]);
    }
  };

  // Remove location
  const removeLocation = (location: string) => {
    setValue('preferredLocations', watchedLocations.filter(l => l !== location));
  };

  // Add custom location
  const addCustomLocation = () => {
    if (customLocation.trim()) {
      addLocation(customLocation.trim());
      setCustomLocation('');
    }
  };

  const onSubmit = (data: JobPreferencesForm) => {
    onComplete(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome to FindHiddenJobs!</CardTitle>
          <CardDescription className="text-lg">
            Tell us about your job preferences so we can find the perfect opportunities for you.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Job Titles */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">What job titles are you looking for?</Label>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {COMMON_JOB_TITLES.map(title => (
                  <Button
                    key={title}
                    type="button"
                    variant={watchedJobTypes.includes(title) ? "default" : "outline"}
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => watchedJobTypes.includes(title) ? removeJobTitle(title) : addJobTitle(title)}
                  >
                    {title}
                  </Button>
                ))}
              </div>

              {/* Custom job title input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom job title..."
                  value={customJobTitle}
                  onChange={(e) => setCustomJobTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomJobTitle())}
                />
                <Button type="button" onClick={addCustomJobTitle} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Selected job titles */}
              {watchedJobTypes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected job titles:</Label>
                  <div className="flex flex-wrap gap-2">
                    {watchedJobTypes.map(title => (
                      <Badge key={title} variant="default" className="flex items-center gap-1">
                        {title}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeJobTitle(title)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.jobTypes && (
                <p className="text-sm text-destructive">{errors.jobTypes.message}</p>
              )}
            </div>

            {/* Experience Level */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">What's your experience level?</Label>
              </div>
              
              <Controller
                control={control}
                name="experienceLevel"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              
              {errors.experienceLevel && (
                <p className="text-sm text-destructive">{errors.experienceLevel.message}</p>
              )}
            </div>

            {/* Work Type Preference */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Work preference?</Label>
              </div>
              
              <Controller
                control={control}
                name="workType"
                render={({ field }) => (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {WORK_TYPES.map(type => (
                      <Button
                        key={type.value}
                        type="button"
                        variant={field.value === type.value ? "default" : "outline"}
                        onClick={() => field.onChange(type.value)}
                        className="justify-start"
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                )}
              />
              
              {errors.workType && (
                <p className="text-sm text-destructive">{errors.workType.message}</p>
              )}
            </div>

            {/* Preferred Locations */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Preferred locations (optional)</Label>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add city or region..."
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomLocation())}
                />
                <Button type="button" onClick={addCustomLocation} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Selected locations */}
              {watchedLocations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preferred locations:</Label>
                  <div className="flex flex-wrap gap-2">
                    {watchedLocations.map(location => (
                      <Badge key={location} variant="secondary" className="flex items-center gap-1">
                        {location}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeLocation(location)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Industries */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Preferred industries (optional)</Label>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {INDUSTRIES.map(industry => (
                  <Button
                    key={industry}
                    type="button"
                    variant={watchedIndustries.includes(industry) ? "default" : "outline"}
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => toggleIndustry(industry)}
                  >
                    {industry}
                  </Button>
                ))}
              </div>
            </div>

            {/* Salary Range */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Desired salary range (optional)</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salaryMin" className="text-sm">Minimum</Label>
                  <Controller
                    control={control}
                    name="desiredSalaryMin"
                    render={({ field }) => (
                      <Input
                        id="salaryMin"
                        type="number"
                        placeholder="50000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="salaryMax" className="text-sm">Maximum</Label>
                  <Controller
                    control={control}
                    name="desiredSalaryMax"
                    render={({ field }) => (
                      <Input
                        id="salaryMax"
                        type="number"
                        placeholder="100000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isLoading}
              >
                {isLoading ? 'Saving Preferences...' : 'Complete Setup'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onSkip}
                disabled={isLoading}
              >
                Skip for Now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}