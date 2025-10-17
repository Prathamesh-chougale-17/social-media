"use client";
import React from "react";
import { trpc } from "@/trpc/shared";

export function LikeButton({ videoId }: { videoId: string }) {
  const utils = trpc.useContext();
  const { data: likes } = trpc.interactions.likesCount.useQuery({ videoId });
  const { mutate: like } = trpc.interactions.like.useMutation({
    onSuccess() {
      utils.interactions.likesCount.invalidate({ videoId });
      utils.interactions.hasLiked.invalidate({ videoId });
    },
  });

  const { mutate: unlike } = trpc.interactions.unlike.useMutation({
    onSuccess() {
      utils.interactions.likesCount.invalidate({ videoId });
      utils.interactions.hasLiked.invalidate({ videoId });
    },
  });

  const { data: hasLiked } = trpc.interactions.hasLiked.useQuery({ videoId, userId: undefined });

  const toggle = () => {
    if (hasLiked?.liked) {
      unlike({ videoId });
    } else {
      like({ videoId });
    }
  };

  return (
    <button onClick={toggle} className="px-3 py-1 rounded bg-transparent border">
      {likes ? `❤️ ${likes.count}` : "♡"}
    </button>
  );
}
