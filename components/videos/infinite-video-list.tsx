/**
 * InfiniteVideoList Component
 * 
 * Client component that implements infinite scroll video feed.
 * Uses TanStack Query's useInfiniteQuery for pagination and caching.
 * Uses Intersection Observer for automatic loading when scrolling.
 * 
 * Follows Principle V: TanStack Query for client-side caching.
 * Follows Principle III: tRPC-First Data.
 */

'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { trpc } from '@/trpc/client';
import { VideoGrid } from '@/components/kibo-ui/video/video-grid';
import { VideoCard } from '@/components/kibo-ui/video/video-card';
import { VideoCardSkeleton } from './video-card-skeleton';

/**
 * InfiniteVideoList component
 * 
 * Displays an infinite scroll feed of videos.
 * Automatically loads more videos when sentinel element enters viewport.
 */
export function InfiniteVideoList() {
  // Intersection Observer hook for scroll detection
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '400px', // Start loading when 400px away from sentinel
  });
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = trpc.videos.getInfinite.useInfiniteQuery(
    {
      limit: 15,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 1000 * 60 * 30, // 30 minutes
    }
  );
  
  // Trigger fetchNextPage when sentinel enters viewport
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Loading state (initial load)
  if (status === 'pending') {
    return (
      <VideoGrid>
        {Array.from({ length: 6 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </VideoGrid>
    );
  }
  
  // Error state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-muted-foreground">
          Failed to load videos. Please try again.
        </p>
      </div>
    );
  }
  
  // Flatten all pages into single array
  const allVideos = data.pages.flatMap((page) => page.items);
  
  // Empty state
  if (allVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-muted-foreground">
          No videos available yet. Check back soon!
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Video Grid */}
      <VideoGrid>
        {allVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </VideoGrid>
      
      {/* Intersection Observer Sentinel */}
      {/* This invisible div triggers loading when it enters viewport */}
      <div ref={ref} className="h-20" />
      
      {/* Loading More Indicator */}
      {isFetchingNextPage && (
        <VideoGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <VideoCardSkeleton key={`loading-${i}`} />
          ))}
        </VideoGrid>
      )}
      
      {/* End of Feed */}
      {!hasNextPage && allVideos.length > 0 && (
        <div className="flex justify-center py-8">
          <p className="text-sm text-muted-foreground">
            You've reached the end
          </p>
        </div>
      )}
    </div>
  );
}
