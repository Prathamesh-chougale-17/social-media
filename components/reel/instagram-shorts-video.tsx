"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LikeButton } from "@/components/videos/like-button";
import { CommentDrawer } from "@/components/videos/comment-drawer";

type Video = {
  id: string;
  title?: string;
  duration: number;
  videoUrls: { hd?: string; large?: string; medium?: string; small?: string } | any;
  thumbnailUrl?: string;
  user?: {
    name?: string;
    avatar?: string;
  };
};

function chooseSrc(v: Video) {
  return v.videoUrls?.hd ?? v.videoUrls?.large ?? v.videoUrls?.medium ?? v.videoUrls?.small ?? null;
}

// Hook to manage mute preference in localStorage
function useMutePreference() {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    // Load preference from localStorage on mount
    const saved = localStorage.getItem("video-mute-preference");
    if (saved !== null) {
      setMuted(saved === "true");
    }
  }, []);

  const setMutedWithPersistence = useCallback((value: boolean) => {
    setMuted(value);
    localStorage.setItem("video-mute-preference", String(value));
  }, []);

  return [muted, setMutedWithPersistence] as const;
}

type InstagramShortsVideoProps = {
  video: Video;
  isActive: boolean;
  onVideoEnd?: () => void;
  videoRef: React.MutableRefObject<Map<string, HTMLVideoElement | null>>;
};

export function InstagramShortsVideo({
  video,
  isActive,
  onVideoEnd,
  videoRef,
}: InstagramShortsVideoProps) {
  const [ref, inView] = useInView({ threshold: 0.5 });
  const [userPaused, setUserPaused] = useState(false);
  const [muted, setMuted] = useMutePreference();
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const src = chooseSrc(video);

  const setRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoElementRef.current = el;
      videoRef.current.set(video.id, el);
    },
    [video.id, videoRef]
  );

  // Auto play/pause based on visibility
  useEffect(() => {
    const el = videoElementRef.current;
    if (!el) return;

    el.muted = muted;

    if (inView && isActive && !userPaused) {
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [inView, isActive, userPaused, muted]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || !inView) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, inView]);

  const togglePlay = useCallback(() => {
    const el = videoElementRef.current;
    if (!el) return;

    if (el.paused) {
      el.play().catch(() => {});
      setUserPaused(false);
      setIsPlaying(true);
    } else {
      el.pause();
      setUserPaused(true);
      setIsPlaying(false);
    }
    showControlsTemporarily();
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    const el = videoElementRef.current;
    if (el) el.muted = nextMuted;
    showControlsTemporarily();
  }, [muted, setMuted]);

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  };

  const handleEnded = () => {
    if (onVideoEnd) {
      onVideoEnd();
    }
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  return (
    <div
      ref={ref}
      className="relative h-full w-full bg-black"
      onClick={handleVideoClick}
      onMouseMove={showControlsTemporarily}
    >
      {/* Video or Poster */}
      {!inView ? (
        <img
          src={video.thumbnailUrl ?? undefined}
          alt={video.title ?? ""}
          className="w-full h-full object-cover"
        />
      ) : (
        <>
          <video
            src={src || undefined}
            poster={video.thumbnailUrl}
            playsInline
            muted={muted}
            controls={false}
            loop={false}
            className="w-full h-full object-cover"
            aria-label={video.title}
            ref={setRef}
            preload="metadata"
            autoPlay
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Gradient overlays for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Play/Pause Animation Overlay */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              >
                <div className="bg-black/50 backdrop-blur-sm rounded-full p-6">
                  {isPlaying ? (
                    <Pause className="w-12 h-12 text-white" />
                  ) : (
                    <Play className="w-12 h-12 text-white fill-white" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Header */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-30">
            <div className="flex items-center gap-3">
              {video.user?.avatar && (
                <img
                  src={video.user.avatar}
                  alt={video.user.name ?? "User"}
                  className="w-10 h-10 rounded-full border-2 border-white"
                />
              )}
              <div className="text-white font-semibold text-sm drop-shadow-lg">
                {video.user?.name ?? "Anonymous"}
              </div>
              <button className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm font-semibold hover:bg-white/30 transition-colors">
                Follow
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <MoreVertical className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Info & Interactions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-20">
            <div className="flex items-end justify-between">
              {/* Left side - Video info */}
              <div className="flex-1 mr-4">
                <h3 className="text-white font-semibold text-base mb-2 drop-shadow-lg line-clamp-2">
                  {video.title || "Untitled Video"}
                </h3>
                <p className="text-white/90 text-sm drop-shadow-lg">
                  #shorts #viral #trending
                </p>
              </div>

              {/* Right side - Action buttons */}
              <div className="flex flex-col gap-6 items-center">
                {/* Like button */}
                <div className="flex flex-col items-center gap-1">
                  <LikeButton videoId={video.id} />
                </div>

                {/* Comments */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComments(true);
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold drop-shadow-lg">
                    123
                  </span>
                </motion.button>

                {/* Share */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors">
                    <Send className="w-7 h-7 text-white" />
                  </div>
                </motion.button>

                {/* Bookmark */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors">
                    <Bookmark className="w-7 h-7 text-white" />
                  </div>
                </motion.button>

                {/* Mute toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="flex flex-col items-center gap-1 mt-2"
                >
                  <div className="w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors">
                    {muted ? (
                      <VolumeX className="w-7 h-7 text-white" />
                    ) : (
                      <Volume2 className="w-7 h-7 text-white" />
                    )}
                  </div>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Comment Drawer */}
          <CommentDrawer
            videoId={video.id}
            open={showComments}
            onOpenChange={setShowComments}
          />
        </>
      )}
    </div>
  );
}
