import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { LoadingSkeleton } from '@/components/loading-skeleton';

async function checkUserPreferences(userId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/user/preferences', {
      headers: {
        'x-user-id': userId,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.hasPreferences && !data.needsOnboarding;
    }
  } catch (error) {
    console.error('Error checking user preferences:', error);
  }
  
  return false;
}

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/');
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;
          console.log('User authenticated:', user.id);
          
          // Check if this is a new user or returning user
          const hasPreferences = await checkUserPreferences(user.id);
          
          if (hasPreferences) {
            // Returning user with preferences - go to dashboard
            console.log('Returning user with preferences, redirecting to dashboard');
            navigate('/dashboard');
          } else {
            // New user or user without preferences - go to onboarding
            console.log('New user or missing preferences, redirecting to onboarding');
            navigate('/onboarding');
          }
        } else {
          // No session, redirect to home
          navigate('/');
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <LoadingSkeleton />
        <p className="mt-4 text-muted-foreground">Completing your sign up...</p>
      </div>
    </div>
  );
}