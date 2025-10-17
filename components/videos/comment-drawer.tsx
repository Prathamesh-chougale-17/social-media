"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Heart } from "lucide-react";
import { trpc } from "@/trpc/shared";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type CommentDrawerProps = {
  videoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommentDrawer({
  videoId,
  open,
  onOpenChange,
}: CommentDrawerProps) {
  const [content, setContent] = useState("");
  const { data: session } = useSession();
  const utils = trpc.useContext();

  const { data: comments, isLoading } = trpc.interactions.getComments.useQuery(
    { videoId, limit: 100 },
    { enabled: open }
  );

  const createComment = trpc.interactions.createComment.useMutation({
    onSuccess() {
      setContent("");
      utils.interactions.getComments.invalidate({ videoId });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !session?.user) return;
    createComment.mutate({ videoId, content: content.trim() });
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl z-50 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Comments
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Comments List */}
            <ScrollArea className="flex-1 px-6 py-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading comments...
                </div>
              ) : !comments || comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No comments yet.</p>
                  <p className="text-xs mt-2">Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <CommentItem key={comment._id} comment={comment} />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Comment Input */}
            {session?.user ? (
              <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                  {session.user.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    disabled={createComment.isPending}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="submit"
                    disabled={!content.trim() || createComment.isPending}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      content.trim()
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </form>
              </div>
            ) : (
              <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Sign in to comment
                </p>
                <button
                  onClick={() => (window.location.href = "/signin")}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  Sign In
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type CommentItemProps = {
  comment: any;
};

function CommentItem({ comment }: CommentItemProps) {
  const [liked, setLiked] = useState(false);
  const timeAgo = getTimeAgo(new Date(comment.createdAt));

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0">
        {comment.userImage ? (
          <img
            src={comment.userImage}
            alt={comment.userName || "User"}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
            {comment.userName?.[0]?.toUpperCase() || "U"}
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-gray-900 dark:text-white">
            {comment.userName || "Anonymous"}
          </span>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
          {comment.content}
        </p>
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => setLiked(!liked)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
          >
            <Heart
              className={cn(
                "w-3 h-3",
                liked && "fill-red-500 text-red-500"
              )}
            />
            {liked ? "1" : "Like"}
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo`;
  return `${Math.floor(seconds / 31536000)}y`;
}
