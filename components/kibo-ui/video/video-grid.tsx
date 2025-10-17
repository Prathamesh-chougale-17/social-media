/**
 * VideoGrid Component (Kibo UI)
 * 
 * Responsive grid layout for displaying video cards.
 * Adapts columns based on viewport size: 1 (mobile) → 2 (tablet) → 3 (desktop) → 4 (large).
 * 
 * Follows Principle VII: Component Composition.
 */

import { cn } from '@/lib/utils';

export interface VideoGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * VideoGrid component
 * 
 * Responsive CSS Grid with automatic column sizing:
 * - 320px+: 1 column (mobile)
 * - 640px+: 2 columns (tablet)
 * - 1024px+: 3 columns (desktop)
 * - 1280px+: 4 columns (large desktop)
 */
export function VideoGrid({ children, className }: VideoGridProps) {
  return (
    <div
      className={cn(
        // Grid layout with responsive columns
        'grid gap-6',
        // Responsive breakpoints
        'grid-cols-1',          // Mobile: 1 column (320px+)
        'sm:grid-cols-2',       // Tablet: 2 columns (640px+)
        'lg:grid-cols-3',       // Desktop: 3 columns (1024px+)
        'xl:grid-cols-4',       // Large: 4 columns (1280px+)
        className
      )}
    >
      {children}
    </div>
  );
}
