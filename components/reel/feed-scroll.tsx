"use client";

import { trpc } from "@/trpc/client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useInView } from "react-intersection-observer";
import { InstagramShortsVideo } from "./instagram-shorts-video";
import { KeyboardShortcutsHelper } from "./keyboard-shortcuts-helper";

type Video = {
  id: string;
  title?: string;
  duration: number;
  videoUrls: { hd?: string; large?: string; medium?: string; small?: string } | any;
  thumbnailUrl?: string;
  user?: {
    name?: string;
    avatar?: string;
  };
};

export default function FeedScroll() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.videos.getInfinite.useInfiniteQuery(
      { limit: 10 },
      { getNextPageParam: (last) => last.nextCursor ?? undefined, staleTime: 1000 * 60 * 30 },
    );

  const videos = (data?.pages.flatMap((p) => p.items) ?? []) as Video[];
  const [activeIndex, setActiveIndex] = useState(0);

  // sentinel for infinite loading
  const [sentinelRef, sentinelInView] = useInView({ rootMargin: "400px" });

  useEffect(() => {
    if (sentinelInView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [sentinelInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Keep a ref map of video elements and section refs
  const videosRef = useRef<Map<string, HTMLVideoElement | null>>(new Map());
  const sectionsRef = useRef<Map<number, HTMLElement | null>>(new Map());

  // Auto-scroll to next video when current video ends
  const handleVideoEnd = useCallback(
    (currentIndex: number) => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < videos.length) {
        const nextSection = sectionsRef.current.get(nextIndex);
        if (nextSection) {
          nextSection.scrollIntoView({ behavior: "smooth", block: "start" });
          setActiveIndex(nextIndex);
        }
      }
    },
    [videos.length]
  );

  // Track which video is currently active based on scroll position
  useEffect(() => {
    const observers = videos.map((video, index) => {
      const section = sectionsRef.current.get(index);
      if (!section) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              setActiveIndex(index);
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(section);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, [videos]);

  return (
    <div className="min-h-screen snap-y snap-mandatory overflow-y-scroll scroll-smooth">
      <div className="flex flex-col">
        {videos.map((video, index) => (
          <section
            key={video.id}
            ref={(el) => {
              sectionsRef.current.set(index, el);
            }}
            className="h-screen w-full relative bg-black snap-start snap-always"
          >
            <InstagramShortsVideo
              video={video}
              isActive={activeIndex === index}
              onVideoEnd={() => handleVideoEnd(index)}
              videoRef={videosRef}
            />
          </section>
        ))}

        {/* sentinel */}
        <div ref={sentinelRef} className="h-24 bg-black" />
      </div>
      
      {/* Keyboard shortcuts helper */}
      <KeyboardShortcutsHelper />
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

  // Local UI state for user-initiated pause & muted toggle
  const [userPaused, setUserPaused] = useState(false);
  const [muted, setMuted] = useState(true);

  // Keep a ref to the element for local control
  let localRef: HTMLVideoElement | null = null;

  const setRef = (el: HTMLVideoElement | null) => {
    localRef = el;
    // Mirror into parent map for centralized control
    refMap.current.set(id, el);
    return undefined;
  };

  // When inView changes, play/pause according to visibility and user preference
  // (don't auto-play if user explicitly paused)
  // Note: onInViewChange in parent will also toggle playback; this keeps local toggles in sync.
  useEffect(() => {
    const el = refMap.current.get(id);
    if (!el) return;
    el.muted = muted;
    if (inView && !userPaused) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [inView, userPaused, muted, id, refMap]);

  const togglePlay = () => {
    const el = refMap.current.get(id);
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => {});
      setUserPaused(false);
    } else {
      el.pause();
      setUserPaused(true);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    const el = refMap.current.get(id);
    if (el) el.muted = next;
  };

  const handleEnded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    // replay to create continuous reel effect
    try {
      el.currentTime = 0;
      void el.play();
    } catch {
      // ignore play errors
    }
  };

  // Render poster image when not sufficiently visible; mount video only when inView
  return (
    <div ref={ref} className="h-full w-full relative">
      {!inView ? (
        // Poster image covers entire block and preserves layout
        <img
          src={poster ?? undefined}
          alt={title ?? ""}
          className="w-full h-full object-cover"
        />
      ) : (
        // Mount the video only when the item is >50% in view
        <>
          <video
            src={src || undefined}
            poster={poster}
            playsInline
            muted={muted}
            controls={false}
            loop={false}
            className="w-full h-full object-cover"
            aria-label={title}
            ref={setRef}
            preload="metadata"
            autoPlay
            onEnded={handleEnded}
          />

          {/* Play/Pause overlay */}
          <button
            aria-label={userPaused ? "Play video" : "Pause video"}
            onClick={togglePlay}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-3"
          >
            {userPaused ? "▶" : "⏸"}
          </button>

          {/* Mute toggle */}
          <button
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
            className="absolute right-4 bottom-24 bg-black/50 text-white rounded-full p-2"
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </>
      )}
    </div>
  );
}
