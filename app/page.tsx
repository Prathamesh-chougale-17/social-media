/**
 * Videos Homepage
 *
 * Server component that prefetches initial video data and renders the infinite video feed.
 * Follows Principle II: Server Components by default.
 * Follows Principle V: TanStack Query with server-side prefetch.
 */

import { HydrateClient, trpc } from "@/trpc/server";
import { InfiniteVideoList } from "@/components/videos/infinite-video-list";

/**
 * Videos homepage
 *
 * Server component that prefetches the first page of videos
 * for instant initial load (no loading spinner on first visit).
 */
export default async function VideosPage() {
  // Prefetch initial videos on server (safe-guarded)
  // void await = fire and forget (don't block rendering)
  try {
    const prefetchFn = trpc?.videos?.getInfinite?.prefetchInfinite;
    if (typeof prefetchFn === "function") {
      // call and don't await the result to avoid blocking render
      void (await prefetchFn({ limit: 15 }));
    }
  } catch (err) {
    // Defensive: if prefetch fails (type mismatch or runtime), don't block rendering
    // Logging here is helpful during dev – in production you may want to silence
    // eslint-disable-next-line no-console
    console.error("tRPC prefetch failed:", err);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Video Feed</h1>
        <p className="mt-2 text-muted-foreground">
          Discover trending videos from creators around the world
        </p>
      </div>

      {/* Hydrate client with prefetched data */}
      <HydrateClient>
        <InfiniteVideoList />
      </HydrateClient>
    </div>
  );
}
