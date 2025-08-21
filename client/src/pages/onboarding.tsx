import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { JobPreferencesForm } from '@/components/onboarding/job-preferences-form';
import { toast } from 'sonner';

interface JobPreferences {
  jobTypes: string[];
  industries?: string[];
  experienceLevel: string;
  preferredLocations?: string[];
  workType: string;
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
}

async function saveJobPreferences(userId: string, preferences: JobPreferences) {
  const response = await fetch('/api/user/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify({
      jobTypes: preferences.jobTypes,
      industries: preferences.industries || [],
      locations: preferences.preferredLocations || [],
      experienceLevel: preferences.experienceLevel,
      workPreference: preferences.workType,
      desiredSalary: preferences.desiredSalaryMin || preferences.desiredSalaryMax ? {
        min: preferences.desiredSalaryMin,
        max: preferences.desiredSalaryMax,
        currency: 'USD'
      } : undefined,
      emailNotifications: true
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save preferences');
  }

  return response.json();
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();

  const savePreferencesMutation = useMutation({
    mutationFn: (preferences: JobPreferences) => {
      if (!user?.id) throw new Error('User not found');
      return saveJobPreferences(user.id, preferences);
    },
    onSuccess: () => {
      toast.success('Job preferences saved! We\'ll start finding opportunities for you.');
      navigate('/dashboard');
    },
    onError: (error) => {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    },
  });

  const handleComplete = (preferences: JobPreferences) => {
    savePreferencesMutation.mutate(preferences);
  };

  const handleSkip = () => {
    toast.info('You can set your job preferences later in your dashboard.');
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <JobPreferencesForm
      onComplete={handleComplete}
      onSkip={handleSkip}
      isLoading={savePreferencesMutation.isPending}
    />
  );
}