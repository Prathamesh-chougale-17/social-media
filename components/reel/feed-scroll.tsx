"use client";

import { trpc } from "@/trpc/client";
import { useEffect, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";

type Video = {
  id: string;
  title?: string;
  duration: number;
  videoUrls: { hd?: string; large?: string; medium?: string; small?: string } | any;
  thumbnailUrl?: string;
};

function chooseSrc(v: Video) {
  return v.videoUrls?.hd ?? v.videoUrls?.large ?? v.videoUrls?.medium ?? v.videoUrls?.small ?? null;
}

export default function FeedScroll() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.videos.getInfinite.useInfiniteQuery(
      { limit: 10 },
      { getNextPageParam: (last) => last.nextCursor ?? undefined, staleTime: 1000 * 60 * 30 },
    );

  const videos = (data?.pages.flatMap((p) => p.items) ?? []) as Video[];

  // sentinel for infinite loading
  const [sentinelRef, sentinelInView] = useInView({ rootMargin: "400px" });

  useEffect(() => {
    if (sentinelInView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [sentinelInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Keep a ref map of video elements to control playback
  const videosRef = useRef<Map<string, HTMLVideoElement | null>>(new Map());

  // Pause all except the in-view element
  const onInViewChange = useCallback((id: string, inView: boolean) => {
    const el = videosRef.current.get(id);
    if (!el) return;
    if (inView) {
      el.muted = true;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, []);

  return (
    <div className="min-h-screen">
      <div className="flex flex-col">
        {videos.map((v) => {
          const src = chooseSrc(v);
          return (
            <section key={v.id} className="h-screen w-full relative bg-black">
              {/* Use a wrapper to keep layout stable */}
              <div className="absolute inset-0">
                {src ? (
                  <ItemVideo
                    id={v.id}
                    src={src}
                    refMap={videosRef}
                    onInViewChange={onInViewChange}
                    poster={v.thumbnailUrl}
                    title={v.title}
                  />
                ) : (
                  // If no src, just show the poster image full-bleed
                  <img
                    src={v.thumbnailUrl ?? undefined}
                    alt={v.title ?? ""}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </section>
          );
        })}

        {/* sentinel */}
        <div ref={sentinelRef} className="h-24" />
      </div>
    </div>
  );
}

type ItemVideoProps = {
  id: string;
  src: string;
  poster?: string;
  title?: string;
  refMap: React.MutableRefObject<Map<string, HTMLVideoElement | null>>;
  onInViewChange: (id: string, inView: boolean) => void;
};

function ItemVideo({ id, src, poster, title, refMap, onInViewChange }: ItemVideoProps) {
  // Visible when more than half of the element is visible
  const [ref, inView] = useInView({ threshold: 0.5 });

  useEffect(() => {
    onInViewChange(id, inView);
  }, [id, inView, onInViewChange]);

  // Render poster image when not sufficiently visible; mount video only when inView
  return (
    <div ref={ref} className="h-full w-full">
      {!inView ? (
        // Poster image covers entire block and preserves layout
        <img
          src={poster ?? undefined}
          alt={title ?? ""}
          className="w-full h-full object-cover"
        />
      ) : (
        // Mount the video only when the item is >50% in view
        <video
          src={src || undefined}
          poster={poster}
          playsInline
          muted
          controls={false}
          className="w-full h-full object-cover"
          aria-label={title}
          ref={(el) => {
            refMap.current.set(id, el);
            return undefined;
          }}
          preload="metadata"
          autoPlay
        />
      )}
    </div>
  );
}
