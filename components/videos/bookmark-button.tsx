"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { trpc } from "@/trpc/shared";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type BookmarkButtonProps = {
  videoId: string;
};

export function BookmarkButton({ videoId }: BookmarkButtonProps) {
  const router = useRouter();
  const utils = trpc.useContext();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;
  const [showSaved, setShowSaved] = useState(false);

  const bookmarkMutation = trpc.interactions.bookmark.useMutation({
    onSuccess() {
      utils.interactions.hasBookmarked.invalidate({ videoId, userId });
      setShowSaved(true);
      toast.success("Saved to bookmarks!");
      setTimeout(() => setShowSaved(false), 2000);
    },
  });

  const removeBookmarkMutation = trpc.interactions.removeBookmark.useMutation({
    onSuccess() {
      utils.interactions.hasBookmarked.invalidate({ videoId, userId });
      toast.success("Removed from bookmarks");
    },
  });

  const { data: hasBookmarked } = trpc.interactions.hasBookmarked.useQuery(
    { videoId, userId },
    { enabled: !!userId }
  );

  const isBookmarked = hasBookmarked?.bookmarked || false;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) {
      toast.error("Please sign in to bookmark videos");
      // Redirect to sign-in page
      setTimeout(() => {
        router.push("/signin");
      }, 1000);
      return;
    }
    
    if (isBookmarked) {
      removeBookmarkMutation.mutate({ videoId });
    } else {
      bookmarkMutation.mutate({ videoId });
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggle}
        className="flex flex-col items-center gap-1"
      >
        <div className="w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors relative group">
          <AnimatePresence mode="wait">
            {isBookmarked ? (
              <motion.div
                key="bookmarked"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <BookmarkCheck className="w-7 h-7 text-yellow-400 fill-yellow-400" />
              </motion.div>
            ) : (
              <motion.div
                key="not-bookmarked"
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -180 }}
              >
                <Bookmark className="w-7 h-7 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </motion.button>

      {/* Saved notification */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: -10, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            className="absolute bottom-full left-1/2 mb-2 bg-white text-black px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg"
          >
            ✓ Saved
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
