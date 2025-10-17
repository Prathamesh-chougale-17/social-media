import { HydrateClient, trpc } from "@/trpc/server";
import FeedScroll from "@/components/reel/feed-scroll";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shorts - Social Media",
  description: "Watch short videos from creators around the world",
};

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
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <HydrateClient>
        <FeedScroll />
      </HydrateClient>
    </main>
  );
}
