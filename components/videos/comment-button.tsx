"use client";

import React from "react";
import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { trpc } from "@/trpc/shared";
import { authClient } from "@/lib/auth-client";

type CommentButtonProps = {
  videoId: string;
  onClick: () => void;
};

export function CommentButton({ videoId, onClick }: CommentButtonProps) {
  const { data: session } = authClient.useSession();
  const { data: commentsData } = trpc.interactions.commentsCount.useQuery({ videoId });
  
  const count = commentsData?.count || 0;
  const displayCount = count > 999 ? `${(count / 1000).toFixed(1)}K` : count;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex flex-col items-center gap-1"
    >
      <div className="w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors relative group">
        <MessageCircle className="w-7 h-7 text-white" />
        <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-white text-xs font-semibold drop-shadow-lg"
        >
          {displayCount}
        </motion.span>
      )}
    </motion.button>
  );
}
