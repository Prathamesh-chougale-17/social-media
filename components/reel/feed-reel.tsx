"use client";

import { trpc } from "@/trpc/client";
import {
  Reel,
  ReelContent,
  ReelItem as KiboReelItem,
  ReelVideo,
  ReelImage,
  ReelProgress,
  ReelControls,
  ReelPlayButton,
  ReelMuteButton,
  ReelNavigation,
} from "@/components/kibo-ui/reel";
import { useMemo } from "react";

// Map our Video domain type to the ReelItem shape expected by the Reel
type Video = {
  id: string;
  title?: string;
  duration: number;
  urls: { hd?: string; sd?: string; small?: string } | any;
  width?: number;
  height?: number;
  thumbnail?: string;
};

function toReelItems(videos: Video[]) {
  return videos.map((v) => ({
    id: v.id,
    type: "video" as const,
    src: v.urls?.hd || v.urls?.sd || v.urls?.small || v.thumbnail || "",
    duration: Math.max(3, Math.round((v.duration ?? 5) || 5)),
    alt: v.title || "",
    title: v.title,
  }));
}

export function FeedReel() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.videos.getInfinite.useInfiniteQuery(
      { limit: 15 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        staleTime: 1000 * 60 * 30,
      },
    );

  const videos = useMemo(() => {
    if (!data) return [] as Video[];
    return data.pages.flatMap((p) => p.items) as unknown as Video[];
  }, [data]);

  const reelItems = useMemo(() => toReelItems(videos), [videos]);

  // Simple auto-fetch when near end
  // Note: For a production-quality reel we'd use intersection observers per item
  const handleEnd = async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  };

  return (
    <div className="h-screen w-full bg-black">
      <Reel data={reelItems} defaultIndex={0} autoPlay>
        <ReelContent>
          {(item) => {
            if (!item) return null; // defensive: currentItem may be undefined when data is empty
            if (item.type === "video") {
              return <ReelVideo src={item.src} />;
            }
            return <ReelImage src={(item as any).src} alt={item.alt || ""} />;
          }}
        </ReelContent>

        <ReelProgress />
        <ReelControls>
          <div />
          <div className="flex items-center gap-2">
            <ReelMuteButton />
            <ReelPlayButton />
          </div>
        </ReelControls>
        <ReelNavigation />
      </Reel>
      {/* naive: fetch next when within last 3 items */}
      {reelItems.length > 0 &&
        reelItems.length % 15 >= 12 && (
          <button onClick={handleEnd} className="sr-only">
            load more
          </button>
        )}
    </div>
  );
}
