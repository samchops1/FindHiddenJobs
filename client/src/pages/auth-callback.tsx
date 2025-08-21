import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { LoadingSkeleton } from '@/components/loading-skeleton';

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

        if (data.session) {
          // User is now authenticated, redirect to home
          navigate('/');
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