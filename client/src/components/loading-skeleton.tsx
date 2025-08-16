import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="loading-skeleton">
      {/* Loading Header */}
      <div className="bg-card rounded-2xl border border-border p-8">
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <div className="text-center">
            <span className="text-foreground font-semibold text-lg block">Searching across platforms...</span>
            <span className="text-muted-foreground text-sm">Finding the best opportunities for you</span>
          </div>
        </div>
        
        {/* Skeleton Cards */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse border border-border">
              <CardContent className="p-8">
                <div className="flex items-start space-x-6">
                  <Skeleton className="w-20 h-20 rounded-2xl" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <div className="flex space-x-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-10 w-32 rounded-xl" />
                        <Skeleton className="h-8 w-24 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
