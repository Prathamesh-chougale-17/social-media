"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Check, Link, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ShareButtonProps = {
  videoId: string;
  videoTitle?: string;
};

export function ShareButton({ videoId, videoTitle }: ShareButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/reel?v=${videoId}`
    : "";

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const shareNative = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: videoTitle || "Check out this video",
          url: shareUrl,
        });
        setShowShareMenu(false);
      } catch (error) {
        // User cancelled share
      }
    } else {
      copyLink(e);
    }
  };

  const shareToWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = encodeURIComponent(`Check out this video: ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setShowShareMenu(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          setShowShareMenu(!showShareMenu);
        }}
        className="flex flex-col items-center gap-1"
      >
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all relative group",
          showShareMenu 
            ? "bg-white text-black" 
            : "bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        )}>
          <Send className={cn(
            "w-7 h-7 transition-transform",
            showShareMenu && "rotate-45"
          )} />
          {!showShareMenu && (
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </motion.button>

      {/* Share Menu */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="absolute right-full mr-3 top-0 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-2 min-w-[180px] z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              {/* Native Share */}
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={shareNative}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Share
                  </span>
                </motion.button>
              )}

              {/* Copy Link */}
              <motion.button
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.95 }}
                onClick={copyLink}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  copied ? "bg-green-500" : "bg-purple-500"
                )}>
                  {copied ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Link className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {copied ? "Copied!" : "Copy Link"}
                </span>
              </motion.button>

              {/* WhatsApp */}
              <motion.button
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareToWhatsApp}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  WhatsApp
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close menu */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowShareMenu(false);
            }}
            className="fixed inset-0 z-40"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
