import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
