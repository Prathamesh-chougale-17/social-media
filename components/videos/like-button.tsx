"use client";
import React, { useState } from "react";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { trpc } from "@/trpc/shared";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function LikeButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const utils = trpc.useContext();
  const { data: likes } = trpc.interactions.likesCount.useQuery({ videoId });
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;
  const [justLiked, setJustLiked] = useState(false);

  const likeMutation = trpc.interactions.like.useMutation({
    onSuccess() {
      utils.interactions.likesCount.invalidate({ videoId });
      utils.interactions.hasLiked.invalidate({ videoId, userId });
    },
    onError(error) {
      toast.error("Failed to like video. Please try again.");
    },
  });

  const unlikeMutation = trpc.interactions.unlike.useMutation({
    onSuccess() {
      utils.interactions.likesCount.invalidate({ videoId });
      utils.interactions.hasLiked.invalidate({ videoId, userId });
    },
    onError(error) {
      toast.error("Failed to unlike video. Please try again.");
    },
  });

  const { data: hasLiked } = trpc.interactions.hasLiked.useQuery(
    { videoId, userId },
    { enabled: !!userId }
  );

  const isLiked = hasLiked?.liked || false;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) {
      toast.error("Please sign in to like videos");
      // Redirect to sign-in page
      setTimeout(() => {
        router.push("/signin");
      }, 1000);
      return;
    }
    
    if (isLiked) {
      unlikeMutation.mutate({ videoId });
    } else {
      setJustLiked(true);
      likeMutation.mutate({ videoId });
      setTimeout(() => setJustLiked(false), 1000);
    }
  };

  const count = likes?.count || 0;
  const displayCount = count > 999 ? `${(count / 1000).toFixed(1)}K` : count;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="flex flex-col items-center gap-1 relative"
    >
      <div className="w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors relative">
        <Heart
          className={cn(
            "w-7 h-7 transition-all duration-200",
            isLiked ? "text-red-500 fill-red-500" : "text-white"
          )}
        />
        {justLiked && (
          <motion.div
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Heart className="w-7 h-7 text-red-500 fill-red-500" />
          </motion.div>
        )}
      </div>
      {count > 0 && (
        <span className="text-white text-xs font-semibold drop-shadow-lg">
          {displayCount}
        </span>
      )}
    </motion.button>
  );
}
