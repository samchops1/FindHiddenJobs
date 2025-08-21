import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import About from "@/pages/about";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import AuthCallback from "@/pages/auth-callback";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    // Update document title based on route
    const getPageTitle = () => {
      switch (location) {
        case '/':
          return 'FindHiddenJobs.com - Find Jobs Across All Major Platforms';
        case '/dashboard':
          return 'Dashboard - FindHiddenJobs.com';
        case '/onboarding':
          return 'Complete Your Profile - FindHiddenJobs.com';
        case '/about':
          return 'About - FindHiddenJobs.com';
        case '/privacy':
          return 'Privacy Policy - FindHiddenJobs.com';
        case '/terms':
          return 'Terms of Service - FindHiddenJobs.com';
        case '/auth/callback':
          return 'Completing Sign Up - FindHiddenJobs.com';
        default:
          return 'Page Not Found - FindHiddenJobs.com';
      }
    };

    document.title = getPageTitle();

    // Update canonical URL
    const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonicalLink) {
      canonicalLink.href = `https://findhiddenjobs.com${location}`;
    }
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
