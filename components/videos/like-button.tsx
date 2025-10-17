"use client";
import React from "react";
import { trpc } from "@/trpc/shared";
import { useSession } from "@/lib/auth-client";

export function LikeButton({ videoId }: { videoId: string }) {
  const utils = trpc.useContext();
  const { data: likes } = trpc.interactions.likesCount.useQuery({ videoId });
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const likeMutation = trpc.interactions.like.useMutation({
    onSuccess() {
      utils.interactions.likesCount.invalidate({ videoId });
      utils.interactions.hasLiked.invalidate({ videoId, userId });
    },
  });

  const unlikeMutation = trpc.interactions.unlike.useMutation({
    onSuccess() {
      utils.interactions.likesCount.invalidate({ videoId });
      utils.interactions.hasLiked.invalidate({ videoId, userId });
    },
  });

  const { data: hasLiked } = trpc.interactions.hasLiked.useQuery({ videoId, userId }, { enabled: !!userId });

  const toggle = () => {
    if (!userId) {
      // Optionally open sign-in modal; for now, just return
      return;
    }
    if (hasLiked?.liked) {
      unlikeMutation.mutate({ videoId });
    } else {
      likeMutation.mutate({ videoId });
    }
  };

  return (
    <button onClick={toggle} className="px-3 py-1 rounded bg-transparent border">
      {likes ? `❤️ ${likes.count}` : "♡"}
    </button>
  );
}
