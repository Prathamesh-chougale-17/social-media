import { HydrateClient, trpc } from "@/trpc/server";
import FeedScroll from "@/components/reel/feed-scroll";

export default async function ReelPage() {
  // Prefetch initial videos for instant hydration
  try {
    const prefetch = trpc?.videos?.getInfinite?.prefetchInfinite;
    if (typeof prefetch === "function") {
      void await prefetch({ limit: 15 });
    }
  } catch (err) {
    // ignore prefetch errors in dev
    // eslint-disable-next-line no-console
    console.error("reel prefetch failed:", err);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <HydrateClient>
        <FeedScroll />
      </HydrateClient>
    </div>
  );
}
