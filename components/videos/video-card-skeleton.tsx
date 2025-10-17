/**
 * VideoCardSkeleton Component
 * 
 * Skeleton loader for VideoCard component.
 * Matches VideoCard dimensions to prevent layout shift.
 * 
 * Follows Principle VII: Component Composition - uses shadcn/ui Skeleton.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * VideoCardSkeleton component
 * 
 * Displays a loading placeholder that matches VideoCard layout.
 * Shows skeleton for thumbnail, title, and creator info.
 */
export function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Thumbnail Skeleton */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        <Skeleton className="h-full w-full" />
        
        {/* Duration Badge Skeleton */}
        <div className="absolute bottom-2 right-2">
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
      
      <CardContent className="p-4 space-y-2">
        {/* Title Skeleton (2 lines) */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        {/* Creator Skeleton */}
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
    </Card>
  );
}
