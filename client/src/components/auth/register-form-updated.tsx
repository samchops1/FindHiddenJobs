import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Eye, EyeOff, Briefcase, MapPin, Bell, ChevronRight, ChevronLeft } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  jobTypes: z.array(z.string()).min(1, 'Please select at least one job type'),
  preferredLocation: z.string().optional(),
  emailNotifications: z.boolean().default(true),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms of service and privacy policy',
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onToggleMode: () => void;
}

const jobTypeOptions = [
  'Software Engineer',
  'Product Manager',
  'Data Scientist',
  'Designer',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'HR',
  'Other',
];

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic info, 2: Preferences
  const { signUp } = useAuth();
  const { toast } = useToast();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      jobTypes: [],
      preferredLocation: '',
      emailNotifications: true,
      agreeToTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    if (step === 1) {
      // Validate step 1 fields
      const step1Valid = await form.trigger(['firstName', 'lastName', 'email', 'password', 'agreeToTerms']);
      if (step1Valid) {
        setStep(2);
      }
      return;
    }

    // Submit the full form
    setIsLoading(true);
    try {
      // Create account with Supabase
      await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
      });

      // Save user preferences after successful signup
      toast({
        title: 'Account created successfully!',
        description: data.emailNotifications 
          ? 'Check your email for confirmation. You\'ll receive daily job recommendations at 9 PM EST.'
          : 'Check your email for confirmation.',
      });
      
      // Note: In a real implementation, you'd save preferences after the user confirms their email
      // For now, we'll just show success message
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          {step === 1 ? 'Create your account' : 'Tell us what you\'re looking for'}
        </h2>
        <p className="text-muted-foreground mt-2">
          {step === 1 ? 'Join FindHiddenJobs.com today' : 'Help us personalize your job search'}
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-2">
        <div className={`h-2 w-20 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-20 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {step === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            {...field}
                            placeholder="First name"
                            className="pl-10"
                            data-testid="input-first-name"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            {...field}
                            placeholder="Last name"
                            className="pl-10"
                            data-testid="input-last-name"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10"
                          data-testid="input-email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          className="pl-10 pr-10"
                          data-testid="input-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agreeToTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        I agree to the{' '}
                        <a href="/terms" target="_blank" className="text-primary hover:underline">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" target="_blank" className="text-primary hover:underline">
                          Privacy Policy
                        </a>
                        , including receiving daily job recommendation emails (you can unsubscribe anytime)
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-continue"
              >
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <FormField
                control={form.control}
                name="jobTypes"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="flex items-center text-base">
                        <Briefcase className="mr-2 h-4 w-4" />
                        What type of jobs are you interested in?
                      </FormLabel>
                      <FormDescription>
                        Select all that apply
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {jobTypeOptions.map((jobType) => (
                        <FormField
                          key={jobType}
                          control={form.control}
                          name="jobTypes"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={jobType}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(jobType)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, jobType])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== jobType
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {jobType}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      Preferred location (optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Remote, New York, San Francisco"
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormDescription>
                      Leave blank to see jobs from all locations
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center">
                        <Bell className="mr-2 h-4 w-4" />
                        Daily job recommendations
                      </FormLabel>
                      <FormDescription>
                        Receive personalized job recommendations every day at 9 PM EST based on your preferences and application history. You can unsubscribe or change this setting anytime.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>

      {step === 1 && (
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <button
            onClick={onToggleMode}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}