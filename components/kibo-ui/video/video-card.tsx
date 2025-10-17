/**
 * VideoCard Component (Kibo UI)
 * 
 * Displays a video card with thumbnail, title, creator, and duration.
 * Follows Principle VII: Component Composition - composes shadcn/ui components.
 */

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Video } from '@/types/video';
import { ExternalLink } from 'lucide-react';

/**
 * Format duration from seconds to MM:SS or HH:MM:SS
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export interface VideoCardProps {
  video: Video;
}

/**
 * VideoCard component
 * 
 * Displays video metadata with thumbnail, title, creator, and duration.
 * Uses Next.js Image for optimization and shadcn/ui components for styling.
 */
export function VideoCard({ video }: VideoCardProps) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {/* Video Thumbnail */}
        <Image
          src={video.thumbnailUrl}
          alt={video.title || 'Video thumbnail'}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          loading="lazy"
        />
        
        {/* Duration Badge */}
        <Badge
          variant="secondary"
          className="absolute bottom-2 right-2 bg-black/70 text-white backdrop-blur-sm"
        >
          {formatDuration(video.duration)}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        {/* Video Title */}
        <h3 
          className="mb-2 line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary"
          title={video.title}
        >
          {video.title || 'Untitled Video'}
        </h3>
        
        {/* Creator Attribution */}
        <Link
          href={video.creator.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>by {video.creator.name || 'Unknown Creator'}</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
